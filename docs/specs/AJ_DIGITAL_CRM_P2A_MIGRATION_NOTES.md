# AJ Digital CRM P2a Migration Notes

## Scope

P2a authors the Supabase Postgres CRM schema, RLS baseline, dev seed, and offline structural validation only. It does not execute the migration, prove live RLS behavior, wire a DB-backed CRM store, touch secrets, or deploy.

## Decisions

- `tenant_id` format: human-readable `text`, matching the DB/RLS spec default.
- CRM database target: Supabase Postgres is the CRM system of record.
- Audit and attribution placement: CRM tenant-scoped tables, `crm_audit_events` and `crm_attribution_events`.
- Connector credential storage: metadata plus `vault_reference` only; raw secrets and vault provider implementation are deferred.
- Membership validation: MVP trusts application membership checks plus bound session context (`app.tenant_id`, `app.actor_id`, `app.actor_type`). SQL membership validation is P2b hardening.
- Platform reporting: deferred to P2b explicit read-only reporting views; no broad platform-admin policies on base CRM tables.

## Rollback Plan

Before production, validate rollback against the same database branch used for migration rehearsal. For a full rollback of this P2a schema, drop policies and tables in dependency order, then helper functions:

```sql
drop table if exists public.crm_approval_refs cascade;
drop table if exists public.crm_audit_events cascade;
drop table if exists public.crm_attribution_events cascade;
drop table if exists public.crm_memory_index cascade;
drop table if exists public.crm_knowledge_items cascade;
drop table if exists public.crm_connector_credentials cascade;
drop table if exists public.crm_connector_accounts cascade;
drop table if exists public.crm_agent_run_refs cascade;
drop table if exists public.crm_agent_configs cascade;
drop table if exists public.crm_activities cascade;
drop table if exists public.crm_notes cascade;
drop table if exists public.crm_tasks cascade;
drop table if exists public.crm_opportunities cascade;
drop table if exists public.crm_pipeline_stages cascade;
drop table if exists public.crm_pipelines cascade;
drop table if exists public.crm_leads cascade;
drop table if exists public.crm_contacts cascade;
drop table if exists public.crm_companies cascade;
drop table if exists public.crm_tenant_module_flags cascade;
drop table if exists public.crm_tenant_settings cascade;
drop table if exists public.crm_tenant_memberships cascade;
drop table if exists public.crm_tenants cascade;

drop function if exists public.crm_touch_updated_at() cascade;
drop function if exists public.crm_has_tenant_context() cascade;
drop function if exists public.crm_platform_admin_mode() cascade;
drop function if exists public.crm_current_tenant_id() cascade;
```

## Deferred To P2b

- Live Supabase/Postgres migration execution.
- Live RLS isolation tests for missing tenant context, cross-tenant read/write denial, and duplicate-ID isolation.
- DB-backed `PersistentCrmStore` replacement.
- Tenant-context DB binding helper.
- Platform reporting views and report execution audit workflow.
