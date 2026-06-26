# AJ Digital CRM P2b RLS Isolation Runner

## Scope

P2b proves the P2a Supabase CRM migration's row-level security behavior against a live Postgres database. It does not add a DB-backed CRM store, API wiring, production migration execution, or secret handling.

## Local Run

Default local validation does not require Postgres. Without `CRM_TEST_DATABASE_URL`, `tests/db/crm-rls.integration.test.ts` is skipped.

To run the live isolation proof locally, provide an admin connection to a disposable Postgres server:

```bash
CRM_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:crm-rls
```

The test creates a throwaway database and non-superuser app role, applies `supabase/migrations/20260626150000_crm_multitenant_rls.sql`, applies `supabase/seed.sql`, runs assertions through the app role, then drops the database and role.

Do not point `CRM_TEST_DATABASE_URL` at production or client data. Use Supabase local, a disposable Docker/Postgres instance, or the GitHub Actions service container only.

## CI Run

`.github/workflows/release-readiness.yml` includes a `postgres:16` service-container job. The password in that workflow is CI-ephemeral test data, not an operator secret. The job runs:

```bash
npm run test:crm-rls
```

with `CRM_TEST_DATABASE_URL` pointed at the service container. The test itself creates a non-superuser role for assertions so RLS is not bypassed by the setup user.

## Proven Cases

- Missing `app.tenant_id` context sees no tenant-scoped CRM rows.
- Tenant A reads only Tenant A rows; Tenant B reads only Tenant B rows.
- Duplicate `*-shared-001` contact, lead, and opportunity IDs stay isolated by tenant.
- Tenant A cannot update Tenant B rows, even when object IDs match.
- A tenant-A agent cannot read or write tenant-B rows.
- Tenant A cannot insert a row with Tenant B's `tenant_id`.
