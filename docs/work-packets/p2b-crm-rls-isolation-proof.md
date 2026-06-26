# Work Packet — P2b CRM RLS Isolation Proof + Tenant-Context Binding

- **Packet ID:** P2B-CRM-RLS-ISOLATION
- **Drafted by:** Claude (docs/control-room lane) — 2026-06-26
- **Implements:** Executor lane = Codex
- **Target branch:** `build/p2b-crm-rls-isolation` (cut fresh off `main` @ `01af6f8`)
- **Builds on:** P2a (`01af6f8`) — `supabase/migrations/20260626150000_crm_multitenant_rls.sql` + `supabase/seed.sql` are already on `main`.
- **Lane rules:** no merge to `main`, no secrets/credentials committed, no production DB, no deploy. Commit on the build branch; push for PR. Canonical merge stays SHA-pinned + human-approved.

---

## Why P2b (and why now)

P2a landed the migration but proved **structure only** — RLS *behavior* is unproven. P2b closes that: prove the merged migration actually isolates tenants (spec §14/§15 acceptance), and build the **tenant-context DB binding helper** those proofs (and the future DB-backed store) require. The DB-backed `PersistentCrmStore` itself is **P2c** — isolation must be proven before we productize on top of it.

**Environment reality:** live RLS needs a real Postgres. Supabase local = Docker, which is currently flaky on this host (see governance/runtime notes). **Preferred path: a CI Postgres service container** that applies the migration + seed and runs the isolation tests — no local Docker, no operator secrets. Local runs are optional via a `CRM_TEST_DATABASE_URL`.

---

## Objective

Prove the CRM migration's tenant isolation with **live RLS integration tests against a real Postgres** (in CI, no secrets), plus the **tenant-context DB binding helper** that sets the `app.*` session GUCs the migration's policies read. The default `vitest run` (no DB) must stay **505/505 green** — integration tests skip cleanly when no DB is configured.

---

## Tasks

### Task 1 — Tenant-context DB binding helper
Add `src/db/crm-tenant-context.ts` (or sibling of `src/db/supabase-client.ts`):
- Given a `CrmTenantContext` (from `src/crm/tenant-context.ts`) and a pg client/transaction, set the session GUCs the migration reads: `app.tenant_id`, `app.actor_id`, `app.actor_type`, `app.platform_admin_mode` — via `select set_config($1,$2,true)` (transaction-local `is_local = true`).
- **Fail closed:** throw if `tenantId` is missing/empty — never bind an empty tenant context (spec §6, §16).
- Provide a `withTenantContext(client, ctx, fn)` wrapper that opens a transaction, binds context, runs `fn`, and ensures context is scoped to that transaction.
- Pure DB-binding only — no business logic, no store, no service wiring (those are P2c).

### Task 2 — Live RLS isolation integration tests
Add `tests/db/crm-rls.integration.test.ts`, **guarded** to run only when `CRM_TEST_DATABASE_URL` is set; otherwise `describe.skip` (or `it.skipIf`) so the default suite stays green with no DB.
- Setup: apply the P2a migration + seed to the target DB/schema (throwaway DB, or a fresh schema per run). Use `supabase db reset` if the Supabase CLI + local stack are available, else run the migration SQL + seed via `pg`/`psql` against `CRM_TEST_DATABASE_URL`.
- Assert spec §14 acceptance, binding context via the Task 1 helper:
  1. **Missing context** (no `app.tenant_id`) → tenant-scoped selects return empty / are denied.
  2. **Tenant A reads only A**, **tenant B reads only B** (use seed tenants `aj-client-alpha`, `aj-sandbox-demo`).
  3. **Cross-tenant update denied** even when object IDs match — exercise the duplicate `*-shared-001` contact/lead/opportunity rows.
  4. **Agent scoped to A** (`app.actor_type='agent'`) cannot read or write B.
  5. Insert under tenant A cannot set `tenant_id` to B (WITH CHECK denial).
- Keep tests hermetic: unique schema/db per run; clean up after.

### Task 3 — CI job (Postgres service, no secrets)
Extend `.github/workflows/release-readiness.yml` (or add `crm-rls.yml`):
- Add a `postgres:16` **service container** with a throwaway password (CI-only, non-secret).
- Step: apply `supabase/migrations/*.sql` + `supabase/seed.sql` to the service DB, then run the integration tests with `CRM_TEST_DATABASE_URL` pointing at the service.
- This proves isolation in CI **without** local Docker or operator credentials. Keep the existing offline jobs unchanged.

### Task 4 — Runner docs
Short `docs/specs/` or `docs/work-packets/` note: how to run P2b locally — (a) Supabase local (`supabase db reset` then `CRM_TEST_DATABASE_URL=...`), or (b) any Postgres via `CRM_TEST_DATABASE_URL`. State that no real/prod DB or secrets are used.

---

## Files likely involved
- `src/db/crm-tenant-context.ts` — new (binding helper).
- `tests/db/crm-rls.integration.test.ts` — new (guarded integration tests).
- `.github/workflows/release-readiness.yml` (or new `crm-rls.yml`) — Postgres service job.
- `package.json` — optional `test:rls` script.
- Reference only (do not modify unless a real migration defect is found): `supabase/migrations/20260626150000_crm_multitenant_rls.sql`, `supabase/seed.sql`, `src/crm/tenant-context.ts`, `src/db/supabase-client.ts`.

---

## Acceptance criteria
- Integration tests prove all spec §14 cases (missing-context denial, cross-tenant read denial, cross-tenant write denial, duplicate-ID isolation, agent-scoped denial) against a **live Postgres in CI**.
- Default `npx vitest run` with **no** `CRM_TEST_DATABASE_URL` stays **505/505** — integration tests skip cleanly, not fail.
- Binding helper **fails closed** on missing tenant context.
- CI Postgres job is green and uses **no real secrets** (CI-only throwaway creds).
- `npm run typecheck`, `npm run build`, `npm run validate:crm-migration` still pass.
- No changes to the merged migration except additive fixes if a genuine RLS defect is found (surface it loudly if so).

---

## Validation commands (Codex runs + reports)
```bash
git status --short --branch
git diff --check
npm run typecheck
npx vitest run                      # no DB → 505/505, integration tests skipped
# With a local Postgres:
CRM_TEST_DATABASE_URL=postgres://... npx vitest run tests/db/crm-rls.integration.test.ts
npm run build
npm run validate:crm-migration
```

---

## Risks
- **Skip-not-fail discipline:** the integration tests MUST skip (not error) when no DB is configured, or they'll break the default green suite. Verify this explicitly.
- **Applying migration in CI:** the `app.*` custom GUCs must be settable on the service Postgres (they are — custom GUCs are allowed; use `set_config(..., is_local=true)` inside a transaction).
- **Seed FK ordering** when applying outside Supabase CLI — apply migration before seed; respect dependency order.
- **`force row level security`** on some tables means even the table owner is subject to RLS — tests must bind context (or use a platform path) to see rows; that's the point, but it can surprise setup/teardown. Use a privileged setup connection for apply/seed, tenant-bound connections for assertions.
- **Don't leak the Postgres service password** into committed files as if it were a real secret — it's a CI-ephemeral value; keep it in the workflow inline, not in the repo's secret store.

---

## Out of scope → P2c (next packet)
- DB-backed `PersistentCrmStore` (create/get/list/update for contacts/leads/opportunities + companies/pipelines/etc.) using the Task 1 binding helper, behind a flag/env with the file store remaining default.
- Wire CRM service to the DB store in local/non-prod mode; emit audit + attribution after successful writes (spec §16).
- API route tenant resolver + access guard; platform reporting views + report-execution audit.

---

## Governance
- Branch `build/p2b-crm-rls-isolation` off `main` @ `01af6f8` only. No `main` merge, no production DB, no secrets, no deploy.
- Canonical merge stays human-gated + SHA-pinned: Codex opens PR → Claude verifies → present SHA → Tyrone authorizes.
- Surface any real RLS defect or genuinely-blocking decision rather than guessing or weakening a policy to make a test pass.
