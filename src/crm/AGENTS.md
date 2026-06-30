# crm Agent Instructions

## Purpose

Tenant-native CRM: domain types, schemas, tenant context/permission guards, approval policy, audit/attribution, and the store backends (in-memory JSON + live Postgres). Owns all contact/lead/opportunity persistence and the tenant-isolation contract.

## Architecture

- `crm-types.ts` — domain models (`CrmContact/CrmLead/CrmOpportunity`, `CrmTenantContext`, actor/risk/approval enums). Treat as a stable contract.
- `crm-store.ts` — the `CrmStore` interface (create/get/list/update per object).
- `persistent-crm-store.ts` — file-backed JSON store; `defaultCrmStore` (local/dev fallback).
- `postgres-crm-store.ts` — live store. Requires a `PostgresCrmPool` (`{ connect() }`); checks out one connection per op and runs each through `withTenantContext` (`src/db/crm-tenant-context.ts`): `begin` → transaction-local `set_config('app.tenant_id', …, true)` → query → `commit`. A raw pool is rejected — isolation depends on settings + queries sharing one connection.
- `crm-service.ts` / `crm-service-factory.ts` — `CrmService` wraps **writes only** (create/update) with permission + approval + audit gating. Reads go through the store directly.
- `tenant-context.ts` — `resolveCrmTenantContext` / `assertCrmTenantContext` build a `CrmTenantContext`; `assertTenantScopedRecord` blocks cross-tenant records.
- `crm-runtime.ts` — **live composition seam.** `getLiveCrmService()` (writes) and `getLiveCrmStore()` (reads) share one Postgres store built from the live pool. Every surface (CLI; HTTP later) reuses this.

## Live runtime (go-live Phase A)

- Backed by Postgres via `src/db/crm-postgres-pool.ts` (`getCrmPool` / `closeCrmPool`), configured by **`CRM_DATABASE_URL`** — the Supabase Postgres connection string incl. DB password, distinct from `SUPABASE_SERVICE_ROLE_KEY`. Doppler-managed, referenced by name only, never committed/logged.
- Surface today: operator CLI `crm` (`src/commands/crm.command.ts`) — `--object contact|lead|opportunity --action create|update|get`. `update opportunity` needs `--approvalStatus approved` (only approval-gated action). HTTP/dashboard exposure is deferred until an auth/tenant-resolution story exists.
- Live proof: `npm run smoke:crm-live` (`src/scripts/crm-live-smoke.ts`) — connectivity + tenant-scoped round-trip + store-level isolation. Skips without `CRM_DATABASE_URL`.

## Local Contracts

- Never weaken tenant isolation: every store path is tenant-leading (`where tenant_id = $1`); writes assert the record's tenant matches context.
- DB-level RLS is proven by `npm run test:crm-rls` through a **non-superuser** app role — do not "prove RLS" with a BYPASSRLS/superuser connection.
- No secrets in code, logs, tests, fixtures, or docs — by name only.
- Keep patches additive; do not modify the transaction/RLS binding (`src/db/crm-tenant-context.ts`) or core types without explicit approval.

## Verification

- Offline (must stay green): `npm run typecheck`, `npm test`, `npm run build`, `npm run validate:crm-migration`.
- Real Postgres: `npm run test:crm-rls` (CI spins up postgres:16 with a non-superuser role).
- Live: `npm run smoke:crm-live` after the migration is applied and `CRM_DATABASE_URL` is set.
- Applying the migration to a live database is a human-required, irreversible action.
