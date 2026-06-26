# Work Packet — P2a Supabase CRM Migration + RLS (offline)

- **Packet ID:** P2A-SUPABASE-CRM-RLS
- **Drafted by:** Claude (docs/control-room lane) — 2026-06-26
- **Implements:** Executor lane = Codex
- **Target branch:** `build/p2-supabase-crm-rls` (cut fresh off `main` @ `6fb0dde`)
- **DB target (DECIDED):** **Supabase Postgres** is the CRM system-of-record. Neon stays for run/DAG/log stores already wired. Do not re-open this decision.
- **Spec (authoritative):** `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md` (v0.1). Companion: `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`.
- **Lane rules:** no merge to `main`, no migration *execution*, no secrets/credentials, no live DB, no API route or UI work, no push race. Commit on the build branch; push for PR. Surface open decisions — do not silently guess.

---

## Why this is split into P2a / P2b

Proving RLS *behavior* requires a live RLS-enabled Postgres (Supabase local = Docker, currently flaky on this host; or a Supabase branch needing credentials). The spec's own required validation (§20) is **offline SQL parse/dry-run only**. So:

- **P2a (this packet):** author the executable migration + seed + offline structural validation + rollback plan. Fully doable with no live DB, no Docker, no secrets.
- **P2b (next packet, deferred):** stand up Supabase (local or branch), run the live RLS isolation tests (spec §14 acceptance), then build the DB-backed CRM store behind the `PersistentCrmStore` contract and the tenant-context DB binding helper.

Do **not** attempt live execution or the DB-backed store in P2a.

---

## Objective

Produce the **executable Supabase Postgres CRM migration** from the RLS spec — tables, helper functions, RLS policies, indexes, and a two-tenant seed with intentional duplicate object IDs — plus an **offline validation** path and a documented **rollback plan**. No live execution.

---

## Tasks

### Task 1 — Migration SQL
Create `supabase/migrations/<timestamp>_crm_multitenant_rls.sql` (use Supabase CLI naming; `supabase migration new crm_multitenant_rls` if available offline, else hand-name `YYYYMMDDHHMMSS_`). Implement per spec:

- **Helper functions** (spec §7): `crm_current_tenant_id()`, `crm_platform_admin_mode()`, `crm_has_tenant_context()`.
- **Platform/tenant control** (spec §9): `crm_tenants` (§4), `crm_tenant_memberships` (§9), `crm_tenant_settings`, `crm_tenant_module_flags`.
- **Core MVP objects** (spec §9/§10): `crm_contacts`, `crm_companies`, `crm_leads`, `crm_pipelines`, `crm_pipeline_stages`, `crm_opportunities`, `crm_tasks`, `crm_notes`, `crm_activities`. Use the exact column/constraint sketches in §10; tasks/notes/activities use tenant-bound `related_object_type`/`related_object_id` (§10).
- **AJ OS extension tables** (spec §9): `crm_agent_configs`, `crm_agent_run_refs`, `crm_connector_accounts`, `crm_connector_credentials` (**metadata + vault-reference only — never raw secrets**, §9), `crm_knowledge_items`, `crm_memory_index`, `crm_attribution_events` (§11), `crm_audit_events` (§11), `crm_approval_refs`.
- **Common columns** (spec §5) on every tenant-scoped table; soft-delete columns where §10 shows them.
- **RLS** (spec §6/§8): `enable row level security` on every tenant-scoped table; base `select`/`insert`/`update` policies using `tenant_id = crm_current_tenant_id()`. **No tenant-user hard-delete policy** (soft-delete only, §8). Audit/attribution inserts append-only for non-platform actors (§11).
- **Indexes** (spec §12), all `tenant_id`-leading.
- **Reporting:** do NOT add broad `platform_admin_mode = true` policies on base tables (§8). Reporting views are deferred to P2b — leave a clearly-commented placeholder section only.

### Task 2 — Seed (spec §14)
Create a dev seed (`supabase/seed.sql` or a clearly dev-only seed file — must NOT auto-run against prod) with **≥2 tenants** (one active client + one sandbox/demo) and **intentional duplicate object IDs across tenants**: same `contact_id`, `lead_id`, and `opportunity_id` in both tenants, to prove composite `(tenant_id, *_id)` keys.

### Task 3 — Offline validation
Add a validation path that runs **without live credentials**:
- Prefer an existing tool if present (`sqlfluff`, `supabase db lint`); otherwise add a minimal `src/scripts/validate-crm-migration.ts` that parses the SQL, asserts structural invariants (every `create table` that is tenant-scoped has `tenant_id`, a composite PK or tenant-prefixed unique, and an `enable row level security` + matching policies), and exits non-zero on violation.
- Wire an `npm run validate:crm-migration` script.

### Task 4 — Rollback plan + decisions log
- Add a `down`/rollback section or companion `*_rollback.sql` documenting how to drop the migration objects (spec §15 requires a documented rollback before production).
- In the PR description (or a short `docs/specs/` note), record the spec §18 open decisions **as resolved-or-surfaced**:
  - `tenant_id` format → **human-readable text** per spec §4 default (state it explicitly).
  - audit/attribution placement → **CRM tables** per spec §11.
  - credential storage → **metadata + vault reference only**; vault provider deferred.
  - membership validation in SQL vs app → **session-context + app membership** for MVP (note as P2b hardening).
  - Anything genuinely blocking → STOP and surface, don't guess.

---

## Files likely involved
- `supabase/migrations/<timestamp>_crm_multitenant_rls.sql` — new.
- `supabase/seed.sql` (or dev-only seed) — new.
- `src/scripts/validate-crm-migration.ts` — new (if no existing linter).
- `package.json` — `validate:crm-migration` script.
- Reference only (do not modify): `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md`, `sql/supabase-schema.sql`, `src/crm/persistent-crm-store.ts`, `src/crm/crm-types.ts`, `src/db/supabase-client.ts`.

---

## Acceptance criteria (spec §15, offline subset)
- Every tenant-scoped table includes `tenant_id` and a composite PK or tenant-prefixed unique constraint.
- RLS enabled on every tenant-scoped table; base policies deny access when `crm_current_tenant_id()` is null; insert/update policies require row `tenant_id` to match session tenant.
- No tenant-user hard-delete policy; soft-delete columns present where spec shows them.
- `crm_connector_credentials` stores only metadata/vault references — no secret columns.
- Audit + attribution tables tenant-scoped and append-only for non-platform actors.
- Seed proves isolation with ≥2 tenants and duplicate object IDs across tenants.
- `npm run validate:crm-migration` passes (offline, no creds).
- Rollback plan documented; spec §18 decisions recorded.
- `npm run typecheck` and `npx vitest run` still green (505/505) — nothing else regressed.
- **No** live migration execution, secrets, API routes, UI, or DB-backed store (those are P2b).

---

## Validation commands (Codex runs + reports)
```bash
git status --short --branch
git diff --name-only
git diff --check
npm run validate:crm-migration
npm run typecheck
npx vitest run
# If supabase CLI is available offline without login:
supabase db lint   # optional, report availability
```

---

## Risks
- **No live RLS proof in P2a** — structural validation only. Behavioral isolation (cross-tenant read/write denial, missing-context denial, duplicate-ID isolation) is explicitly deferred to P2b. State this clearly in the PR; do not imply RLS is proven.
- **Supabase local needs Docker**, which is currently unreliable on this host — do NOT make P2a depend on it. Keep validation offline.
- **`tenant_id` text vs UUID** (spec §18) — take the spec §4 default (text) and note it; don't block.
- **`client_id` ↔ `tenant_id` bridge** (spec §4) — use `crm_tenants.legacy_client_id` mapping; do not collapse the concepts.
- **Large surface** — if the full table set is too big for one clean PR, land control + core MVP + audit/attribution first and clearly mark reserved/extension tables as a follow-up within P2a; surface the split.

---

## Out of scope → P2b (next packet)
- Stand up Supabase (local/branch), run live RLS isolation tests (spec §14 acceptance).
- DB-backed CRM store behind the `PersistentCrmStore` contract (create/get/list/update for contacts/leads/opportunities, + companies/pipelines/etc.).
- Tenant-context DB binding helper; wire CRM service to DB store in local mode.
- API route tenant resolver + access guard; platform reporting views; connector credential vault contract.

---

## Governance
- Branch `build/p2-supabase-crm-rls` off `main` only. No `main` merge, no migration execution, no secrets, no live DB, no API/UI.
- Canonical merge stays human-gated: present verified SHA; Tyrone authorizes per-merge.
- Treat any missing prerequisite or genuinely-blocking open decision as a finding to surface — do not improvise.
- Don't edit this branch while Claude is on it (avoid push races).
