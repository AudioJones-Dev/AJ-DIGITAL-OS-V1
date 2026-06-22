# AJ Digital Multi-Tenant CRM DB / RLS Spec

**Version:** 0.1
**Status:** Design spec only - no migration applied
**Owner:** AJ Digital LLC
**Related Spec:** `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`
**Last Updated:** 2026-06-15

---

## 1. Purpose

Define the database and row-level security design for the AJ Digital Multi-Tenant CRM Module.

This document exists to prevent tenant isolation from becoming an application-only convention. The database layer must enforce the same doctrine as the CRM module:

- every meaningful CRM table is tenant-scoped
- every query runs inside an explicit tenant context
- every user, agent, connector, workflow, audit event, attribution event, and memory lookup is bound to one tenant
- cross-tenant access is denied by default
- platform-owner cross-tenant reporting is explicit, audited, read-only, and separate from normal tenant work

This is a design artifact only. It does not create tables, apply migrations, change runtime behavior, or touch production data.

## 2. Source Alignment

This spec aligns with:

- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- `sql/supabase-schema.sql`
- `sql/neon-os-schema.sql`
- `src/crm/crm-types.ts`
- `src/crm/persistent-crm-store.ts`
- `src/security/tenancy/*`
- `src/db/*`

Observed current-state facts:

- Existing platform SQL uses `clients` and `client_id` for control-layer ownership.
- Existing CRM TypeScript uses `tenantId` as the canonical CRM boundary.
- Existing Supabase schema enables RLS but only includes placeholder policies.
- Existing Neon OS schema stores execution/control records and includes nullable `tenant_id` on DAG runs.
- Existing CRM persistence is file-backed and covers contacts, leads, and opportunities.

Design implication:

CRM database work must bridge `tenantId` and existing `client_id` without silently collapsing the concepts. Future migrations should use database column `tenant_id` for CRM tables and TypeScript field `tenantId` at the service boundary.

## 3. Database Placement Doctrine

The CRM database should be treated as the tenant-owned operational data layer for the CRM product.

Recommended placement:

- CRM application records: Postgres tables with RLS enabled.
- Platform tenant registry: Postgres tables with platform-owner controls.
- Execution traces, agent runs, and workflow logs: may remain in existing Neon execution tables or move to CRM-specific tables, but must carry `tenant_id`.
- High-volume immutable audit and attribution logs: may use append-only tables or existing event/log infrastructure, but must carry `tenant_id`.
- Raw connector credentials: never stored directly in CRM tables; CRM stores only tenant-scoped credential metadata and vault references.

Open database target decision:

- The repo currently has both Supabase and Neon surfaces.
- Do not apply CRM migrations until the operator chooses the primary CRM DB target and environment.
- This spec is compatible with Postgres RLS whether implemented in Supabase Postgres or Neon Postgres.

## 4. Tenant Identity Model

### Canonical CRM Identity

CRM records use:

```sql
tenant_id text not null
```

CRM services expose:

```ts
tenantId: string
```

Reasoning:

- The CRM module is client-facing and multi-tenant by default.
- Tenant IDs may include internal AJ, client, sandbox, and demo workspaces.
- Existing platform `clients.id` UUIDs can be linked, but should not be assumed to be the only tenant identity source.

### Tenant Registry Bridge

Recommended bridge table:

```sql
create table crm_tenants (
  tenant_id text primary key,
  legacy_client_id uuid references clients(id) on delete set null,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'disabled', 'suspended', 'sandbox')),
  tenant_type text not null default 'client'
    check (tenant_type in ('internal_aj', 'client', 'sandbox', 'demo')),
  owner_user_id text not null,
  business_profile_id text,
  default_pipeline_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Bridge rule:

- `tenant_id` is the CRM boundary.
- `legacy_client_id` is an optional mapping to existing platform `clients.id`.
- New CRM queries must not use `client_id` as the isolation key unless the query is explicitly bridging legacy platform data.

## 5. Required Common Columns

Every tenant-scoped CRM table must include:

```sql
tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Every mutable action event table must include:

```sql
tenant_id text not null,
actor_type text not null check (actor_type in ('platform_user', 'tenant_user', 'agent', 'system')),
actor_id text not null,
risk_level text not null check (risk_level in ('L0', 'L1', 'L2', 'L3', 'L4')),
approval_status text check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
occurred_at timestamptz not null default now()
```

Soft-delete capable tables should include:

```sql
deleted_at timestamptz,
deleted_by_actor_id text,
delete_reason text
```

Deletion doctrine:

- hard delete is non-MVP for tenant CRM records
- deletes require approval
- soft-deleted records remain tenant-scoped
- cross-tenant restoration is forbidden

## 6. RLS Doctrine

RLS must enforce tenant isolation even if application code makes a mistake.

Required database session context:

```sql
app.tenant_id
app.actor_id
app.actor_type
app.platform_admin_mode
```

Required application behavior:

1. Resolve authenticated user or agent.
2. Resolve selected tenant.
3. Verify tenant access in application policy.
4. Bind tenant context to the database session or transaction.
5. Execute tenant-scoped queries only after binding context.
6. Emit tenant-scoped audit and attribution events.

No CRM query may run with an empty tenant setting except approved platform-owner reporting queries against explicit reporting views.

## 7. RLS Helper Function Sketch

The migration should define helper functions equivalent to:

```sql
create or replace function crm_current_tenant_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')
$$;

create or replace function crm_platform_admin_mode()
returns boolean
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.platform_admin_mode', true), ''), 'false')::boolean
$$;

create or replace function crm_has_tenant_context()
returns boolean
language sql
stable
as $$
  select crm_current_tenant_id() is not null
$$;
```

Production policy may add stronger functions that validate memberships against authenticated identity. The minimum rule is that tenant-scoped tables deny access when `crm_current_tenant_id()` is missing.

## 8. Base RLS Policy Pattern

Every tenant-scoped table should use this pattern:

```sql
alter table crm_contacts enable row level security;

create policy crm_contacts_tenant_select
  on crm_contacts
  for select
  using (
    tenant_id = crm_current_tenant_id()
  );

create policy crm_contacts_tenant_insert
  on crm_contacts
  for insert
  with check (
    tenant_id = crm_current_tenant_id()
  );

create policy crm_contacts_tenant_update
  on crm_contacts
  for update
  using (
    tenant_id = crm_current_tenant_id()
  )
  with check (
    tenant_id = crm_current_tenant_id()
  );
```

Delete policy:

- omit tenant-user hard delete policies in MVP
- implement soft-delete update flows instead
- allow hard delete only through platform-owned maintenance roles with explicit approval and audit

Platform reporting:

- do not add broad `platform_admin_mode = true` policies on base CRM tables by default
- create explicit read-only reporting views for cross-tenant admin reporting
- log each report execution with scope, actor, purpose, and filters

## 9. Table Groups

### Platform / Tenant Control

Required tables:

- `crm_tenants`
- `crm_tenant_memberships`
- `crm_tenant_settings`
- `crm_tenant_module_flags`

`crm_tenant_memberships`:

```sql
create table crm_tenant_memberships (
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  user_id text not null,
  role text not null check (role in ('tenant_admin', 'tenant_user')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
```

### Core CRM Objects

Required MVP tables:

- `crm_contacts`
- `crm_companies`
- `crm_leads`
- `crm_opportunities`
- `crm_pipelines`
- `crm_pipeline_stages`
- `crm_tasks`
- `crm_notes`
- `crm_activities`

Post-MVP but schema-reserved tables:

- `crm_conversations`
- `crm_forms`
- `crm_bookings`
- `crm_products_services`
- `crm_quotes`
- `crm_invoices`

### AJ Digital OS Extensions

Required extension tables:

- `crm_agent_configs`
- `crm_agent_run_refs`
- `crm_connector_accounts`
- `crm_connector_credentials`
- `crm_knowledge_items`
- `crm_memory_index`
- `crm_attribution_events`
- `crm_audit_events`
- `crm_approval_refs`

Credential rule:

- `crm_connector_credentials` stores metadata only: tenant, connector, vault reference, status, scopes, timestamps.
- raw secrets, tokens, refresh tokens, API keys, passwords, and private keys are never stored in CRM tables.

## 10. Core Table Sketch

### Contacts

```sql
create table crm_contacts (
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  contact_id text not null,
  company_id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  lifecycle_stage text not null
    check (lifecycle_stage in ('new', 'lead', 'qualified', 'customer', 'inactive')),
  owner_user_id text,
  source text,
  consent_status text
    check (consent_status in ('unknown', 'opted_in', 'opted_out')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, contact_id)
);
```

### Companies

```sql
create table crm_companies (
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  company_id text not null,
  name text not null,
  domain text,
  industry text,
  owner_user_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, company_id)
);
```

### Leads

```sql
create table crm_leads (
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  lead_id text not null,
  contact_id text,
  company_id text,
  status text not null
    check (status in ('new', 'working', 'qualified', 'unqualified', 'converted', 'lost')),
  source text,
  score integer check (score >= 0 and score <= 100),
  urgency text check (urgency in ('low', 'medium', 'high')),
  owner_user_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, lead_id),
  foreign key (tenant_id, contact_id) references crm_contacts(tenant_id, contact_id) on delete set null,
  foreign key (tenant_id, company_id) references crm_companies(tenant_id, company_id) on delete set null
);
```

### Pipelines And Stages

```sql
create table crm_pipelines (
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  pipeline_id text not null,
  name text not null,
  object_type text not null check (object_type in ('lead', 'opportunity')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, pipeline_id)
);

create table crm_pipeline_stages (
  tenant_id text not null,
  pipeline_id text not null,
  stage_id text not null,
  name text not null,
  stage_order integer not null,
  probability numeric,
  requires_approval boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, pipeline_id, stage_id),
  foreign key (tenant_id, pipeline_id) references crm_pipelines(tenant_id, pipeline_id) on delete cascade
);
```

### Opportunities

```sql
create table crm_opportunities (
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  opportunity_id text not null,
  pipeline_id text not null,
  stage_id text not null,
  contact_id text,
  company_id text,
  value numeric,
  currency text,
  expected_close_at timestamptz,
  status text not null check (status in ('open', 'won', 'lost')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, opportunity_id),
  foreign key (tenant_id, pipeline_id) references crm_pipelines(tenant_id, pipeline_id) on delete restrict,
  foreign key (tenant_id, pipeline_id, stage_id) references crm_pipeline_stages(tenant_id, pipeline_id, stage_id) on delete restrict,
  foreign key (tenant_id, contact_id) references crm_contacts(tenant_id, contact_id) on delete set null,
  foreign key (tenant_id, company_id) references crm_companies(tenant_id, company_id) on delete set null
);
```

### Tasks, Notes, And Activities

Tasks, notes, and activities must reference related CRM objects through tenant-bound object references:

```sql
related_object_type text check (
  related_object_type in ('contact', 'company', 'lead', 'opportunity', 'conversation', 'quote', 'invoice')
),
related_object_id text
```

The service layer must validate the related object exists inside the same tenant before insert. Cross-object polymorphic foreign keys should not bypass tenant checks.

## 11. Audit And Attribution Tables

### Audit Events

```sql
create table crm_audit_events (
  event_id text primary key,
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  event_type text not null,
  actor_type text not null check (actor_type in ('platform_user', 'tenant_user', 'agent', 'system')),
  actor_id text not null,
  risk_level text not null check (risk_level in ('L0', 'L1', 'L2', 'L3', 'L4')),
  approval_status text check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  object_type text not null,
  object_id text not null,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
```

### Attribution Events

```sql
create table crm_attribution_events (
  event_id text primary key,
  tenant_id text not null references crm_tenants(tenant_id) on delete restrict,
  event_type text not null,
  actor_type text not null check (actor_type in ('platform_user', 'tenant_user', 'agent', 'system')),
  actor_id text not null,
  related_contact_id text,
  related_lead_id text,
  related_opportunity_id text,
  related_conversation_id text,
  related_workflow_id text,
  related_agent_run_id text,
  source text,
  map_score jsonb,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
```

Both tables must have RLS enabled and tenant policies applied. Audit and attribution inserts should be append-only for tenant users and tenant agents. Updates should be restricted to platform maintenance roles or replaced with correction events.

## 12. Required Indexes

Minimum indexes:

```sql
create index idx_crm_contacts_tenant_updated on crm_contacts(tenant_id, updated_at desc);
create index idx_crm_contacts_tenant_email on crm_contacts(tenant_id, lower(email)) where email is not null;
create index idx_crm_contacts_tenant_phone on crm_contacts(tenant_id, phone) where phone is not null;

create index idx_crm_companies_tenant_name on crm_companies(tenant_id, lower(name));
create index idx_crm_leads_tenant_status on crm_leads(tenant_id, status, updated_at desc);
create index idx_crm_leads_tenant_owner on crm_leads(tenant_id, owner_user_id, updated_at desc);
create index idx_crm_opportunities_tenant_pipeline on crm_opportunities(tenant_id, pipeline_id, stage_id);
create index idx_crm_opportunities_tenant_status on crm_opportunities(tenant_id, status, updated_at desc);

create index idx_crm_audit_tenant_time on crm_audit_events(tenant_id, occurred_at desc);
create index idx_crm_audit_object on crm_audit_events(tenant_id, object_type, object_id, occurred_at desc);
create index idx_crm_attribution_tenant_time on crm_attribution_events(tenant_id, occurred_at desc);
create index idx_crm_attribution_event_type on crm_attribution_events(tenant_id, event_type, occurred_at desc);
```

Index doctrine:

- every high-volume query starts with `tenant_id`
- no global CRM object lookup indexes for tenant records
- cross-tenant reporting uses explicit reporting tables/views, not normal tenant indexes

## 13. Forbidden Database Patterns

Forbidden:

```sql
select * from crm_contacts where email = $1;
select * from crm_leads where lead_id = $1;
select * from crm_opportunities where opportunity_id = $1;
select * from crm_audit_events order by occurred_at desc;
```

Required:

```sql
select * from crm_contacts where tenant_id = crm_current_tenant_id() and email = $1;
select * from crm_leads where tenant_id = crm_current_tenant_id() and lead_id = $1;
select * from crm_opportunities where tenant_id = crm_current_tenant_id() and opportunity_id = $1;
select * from crm_audit_events where tenant_id = crm_current_tenant_id() order by occurred_at desc;
```

Application code must prefer parameterized queries. The examples above are policy sketches, not a license to string-build SQL.

## 14. Seed Data Requirement

Every CRM DB implementation must include at least two tenants:

- one active client tenant
- one second client, sandbox, or demo tenant

Seed data must intentionally include duplicate object IDs across tenants to prove composite tenant keys:

- same `contact_id` in two tenants
- same `lead_id` in two tenants
- same `opportunity_id` in two tenants

Acceptance test:

- tenant A can only read tenant A records
- tenant B can only read tenant B records
- platform reporting can read both only through explicit approved reporting path
- tenant A cannot update tenant B record even when object IDs match
- agent scoped to tenant A cannot read or write tenant B record

## 15. Migration Acceptance Criteria

A future CRM migration is not accepted unless all are true:

- All tenant-scoped tables include `tenant_id`.
- All tenant-scoped tables use composite primary keys or tenant-prefixed unique constraints.
- RLS is enabled on every tenant-scoped table.
- Base policies deny access without `app.tenant_id`.
- Insert/update policies require row `tenant_id` to match session tenant.
- Delete policies are absent or approval-restricted for tenant users.
- Connector credential tables store only metadata and vault references.
- Audit and attribution event tables are tenant-scoped and append-only for non-platform actors.
- Seed data proves isolation with at least two tenants.
- Tests verify cross-tenant read denial, write denial, duplicate ID isolation, and missing-context denial.
- Migration rollback plan is documented before production use.

## 16. Service Layer Acceptance Criteria

The service layer that replaces the file-backed CRM store must:

- receive explicit `CrmTenantContext`
- set the DB tenant context before each transaction
- never accept tenant ID from an untrusted request body as the authority
- use tenant ID from the resolved context
- validate record tenant matches context before insert/update
- emit audit and attribution after successful state changes
- emit approval-required audit records for gated writes
- fail closed if the tenant context is missing
- keep attribution fire-and-forget where business writes should not fail on telemetry errors

## 17. Implementation Sequence

Recommended next sequence:

1. Operator chooses CRM primary DB target: Supabase Postgres or Neon Postgres.
2. Create executable CRM migration from this spec.
3. Add SQL tests or integration tests for tenant RLS with two tenants.
4. Add DB-backed CRM store behind the same service contract as `PersistentCrmStore`.
5. Add tenant context DB binding helper.
6. Wire CRM service to DB store in non-production/local mode first.
7. Add API route tenant resolver and access guard.
8. Add platform reporting views only after base tenant isolation passes.
9. Add connector credential metadata tables and vault-reference contract.
10. Add agent execution tenant-context integration tests.

## 18. Open Decisions

Unresolved before executable migration:

- Primary CRM DB target: Supabase Postgres or Neon Postgres.
- Whether `crm_tenants.tenant_id` is human-readable text, UUID text, or derived from existing `clients.id`.
- Auth provider and how authenticated identity maps to `crm_tenant_memberships.user_id`.
- Whether RLS policies validate membership in SQL or trust application-level membership checks plus session context.
- Whether audit and attribution stay in CRM tables, existing event infrastructure, or both.
- Exact credential vault provider and vault-reference format.
- Data retention policy for soft-deleted records, audit logs, attribution logs, and memory records.
- Cross-tenant platform reporting approval workflow and allowed report types.

## 19. Non-Goals

This spec does not:

- apply a migration
- choose Supabase or Neon as the final CRM database
- read or write secrets
- migrate runtime files
- change existing API routes
- replace existing approval, attribution, or tenancy services
- authorize production deployment

## 20. Next Agent Task

```txt
Review/Diagnosis owner: Codex
Actionable AI Assistant Task owner: Codex
Execution location/tool: C:\dev\AJ-DIGITAL-OS
Human/operator role: Choose CRM primary DB target before executable migration
Copy/paste destination: Codex

Create the executable CRM Postgres migration from docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md after the operator chooses Supabase or Neon as the CRM primary DB target.

Allowed scope:
- SQL migration file only
- focused migration validation script/test if repo patterns support it
- no production execution
- no secret handling
- no API route implementation
- no dashboard/UI work

Required validation:
- git status --short
- git diff --name-only
- git diff --check
- parse or dry-run SQL validation if available locally without live credentials

Final response must include files changed, validation results, remaining risks, and next implementation step.
```
