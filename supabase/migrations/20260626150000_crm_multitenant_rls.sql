-- AJ Digital OS CRM multi-tenant schema + RLS baseline.
-- P2a scope: executable migration authoring only. Do not treat this as live RLS proof
-- until P2b runs against a real Supabase/Postgres environment.

create or replace function public.crm_current_tenant_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')
$$;

create or replace function public.crm_platform_admin_mode()
returns boolean
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.platform_admin_mode', true), ''), 'false')::boolean
$$;

create or replace function public.crm_has_tenant_context()
returns boolean
language sql
stable
as $$
  select public.crm_current_tenant_id() is not null
$$;

create or replace function public.crm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Platform / tenant control.

create table if not exists public.crm_tenants (
  tenant_id text primary key,
  legacy_client_id uuid,
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

do $$
begin
  if to_regclass('public.clients') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'crm_tenants_legacy_client_fk'
        and conrelid = 'public.crm_tenants'::regclass
    )
  then
    alter table public.crm_tenants
      add constraint crm_tenants_legacy_client_fk
      foreign key (legacy_client_id) references public.clients(id) on delete set null;
  end if;
end $$;

create table if not exists public.crm_tenant_memberships (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  user_id text not null,
  role text not null check (role in ('tenant_admin', 'tenant_user')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.crm_tenant_settings (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  setting_key text not null,
  setting_value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, setting_key)
);

create table if not exists public.crm_tenant_module_flags (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  module_key text not null,
  enabled boolean not null default false,
  configuration jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);

-- Core CRM MVP objects.

create table if not exists public.crm_companies (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
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

create table if not exists public.crm_contacts (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
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
  consent_status text check (consent_status in ('unknown', 'opted_in', 'opted_out')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, contact_id),
  constraint crm_contacts_company_fk
    foreign key (tenant_id, company_id)
    references public.crm_companies(tenant_id, company_id)
    on delete set null (company_id)
);

create table if not exists public.crm_leads (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
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
  constraint crm_leads_contact_fk
    foreign key (tenant_id, contact_id)
    references public.crm_contacts(tenant_id, contact_id)
    on delete set null (contact_id),
  constraint crm_leads_company_fk
    foreign key (tenant_id, company_id)
    references public.crm_companies(tenant_id, company_id)
    on delete set null (company_id)
);

create table if not exists public.crm_pipelines (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  pipeline_id text not null,
  name text not null,
  object_type text not null check (object_type in ('lead', 'opportunity')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, pipeline_id)
);

create table if not exists public.crm_pipeline_stages (
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
  foreign key (tenant_id, pipeline_id)
    references public.crm_pipelines(tenant_id, pipeline_id) on delete cascade
);

create table if not exists public.crm_opportunities (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
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
  foreign key (tenant_id, pipeline_id)
    references public.crm_pipelines(tenant_id, pipeline_id) on delete restrict,
  foreign key (tenant_id, pipeline_id, stage_id)
    references public.crm_pipeline_stages(tenant_id, pipeline_id, stage_id) on delete restrict,
  constraint crm_opportunities_contact_fk
    foreign key (tenant_id, contact_id)
    references public.crm_contacts(tenant_id, contact_id)
    on delete set null (contact_id),
  constraint crm_opportunities_company_fk
    foreign key (tenant_id, company_id)
    references public.crm_companies(tenant_id, company_id)
    on delete set null (company_id)
);

create table if not exists public.crm_tasks (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  task_id text not null,
  title text not null,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  due_at timestamptz,
  assigned_user_id text,
  related_object_type text check (
    related_object_type in ('contact', 'company', 'lead', 'opportunity', 'conversation', 'quote', 'invoice')
  ),
  related_object_id text,
  created_by_actor_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, task_id)
);

create table if not exists public.crm_notes (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  note_id text not null,
  body text not null,
  related_object_type text check (
    related_object_type in ('contact', 'company', 'lead', 'opportunity', 'conversation', 'quote', 'invoice')
  ),
  related_object_id text,
  created_by_actor_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, note_id)
);

create table if not exists public.crm_activities (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  activity_id text not null,
  activity_type text not null,
  summary text,
  related_object_type text check (
    related_object_type in ('contact', 'company', 'lead', 'opportunity', 'conversation', 'quote', 'invoice')
  ),
  related_object_id text,
  actor_type text not null check (actor_type in ('platform_user', 'tenant_user', 'agent', 'system')),
  actor_id text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, activity_id)
);

-- AJ Digital OS CRM extension tables.

create table if not exists public.crm_agent_configs (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  agent_config_id text not null,
  agent_id text not null,
  role text not null,
  allowed_actions text[] not null default '{}',
  forbidden_actions text[] not null default '{}',
  required_connectors text[] not null default '{}',
  memory_scope text not null default 'tenant' check (memory_scope = 'tenant'),
  approval_required_for text[] not null default '{}',
  output_schema jsonb not null default '{}',
  status text not null default 'active' check (status in ('active', 'disabled')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, agent_config_id)
);

create table if not exists public.crm_agent_run_refs (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  agent_run_id text not null,
  agent_id text not null,
  external_run_ref text,
  workflow_id text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, agent_run_id)
);

create table if not exists public.crm_connector_accounts (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  connector_account_id text not null,
  connector_id text not null,
  provider text not null,
  status text not null default 'active' check (status in ('active', 'disabled', 'error')),
  external_account_id text,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, connector_account_id)
);

create table if not exists public.crm_connector_credentials (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  credential_id text not null,
  connector_account_id text not null,
  credential_label text not null,
  vault_provider text,
  vault_reference text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}',
  rotation_due_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, credential_id),
  foreign key (tenant_id, connector_account_id)
    references public.crm_connector_accounts(tenant_id, connector_account_id) on delete restrict
);

create table if not exists public.crm_knowledge_items (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  knowledge_item_id text not null,
  namespace text not null check (namespace in ('business_profile', 'knowledge_base', 'conversation', 'attribution', 'agent')),
  title text,
  source_object_type text,
  source_object_id text,
  classification text not null default 'internal'
    check (classification in ('public', 'internal', 'confidential', 'restricted')),
  content_ref text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_actor_id text,
  delete_reason text,
  primary key (tenant_id, knowledge_item_id)
);

create table if not exists public.crm_memory_index (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  memory_id text not null,
  knowledge_item_id text,
  namespace text not null check (namespace in ('business_profile', 'knowledge_base', 'conversation', 'attribution', 'agent')),
  embedding_ref text,
  chunk_ref text,
  classification text not null default 'internal'
    check (classification in ('public', 'internal', 'confidential', 'restricted')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, memory_id),
  constraint crm_memory_index_knowledge_fk
    foreign key (tenant_id, knowledge_item_id)
    references public.crm_knowledge_items(tenant_id, knowledge_item_id)
    on delete set null (knowledge_item_id)
);

create table if not exists public.crm_attribution_events (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  event_id text not null,
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
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, event_id)
);

create table if not exists public.crm_audit_events (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  event_id text not null,
  event_type text not null,
  actor_type text not null check (actor_type in ('platform_user', 'tenant_user', 'agent', 'system')),
  actor_id text not null,
  risk_level text not null check (risk_level in ('L0', 'L1', 'L2', 'L3', 'L4')),
  approval_status text check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  object_type text not null,
  object_id text not null,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, event_id)
);

create table if not exists public.crm_approval_refs (
  tenant_id text not null references public.crm_tenants(tenant_id) on delete restrict,
  approval_ref_id text not null,
  approval_id text not null,
  object_type text not null,
  object_id text not null,
  status text not null check (status in ('not_required', 'pending', 'approved', 'rejected')),
  risk_level text not null check (risk_level in ('L0', 'L1', 'L2', 'L3', 'L4')),
  requested_by_actor_id text not null,
  approved_by_actor_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, approval_ref_id)
);

-- Tenant-leading indexes. Cross-tenant reporting views are intentionally deferred to P2b.

create index if not exists idx_crm_tenants_status on public.crm_tenants(status, updated_at desc);
create index if not exists idx_crm_tenant_memberships_tenant_status on public.crm_tenant_memberships(tenant_id, status, updated_at desc);
create index if not exists idx_crm_contacts_tenant_updated on public.crm_contacts(tenant_id, updated_at desc);
create index if not exists idx_crm_contacts_tenant_email on public.crm_contacts(tenant_id, lower(email)) where email is not null;
create index if not exists idx_crm_contacts_tenant_phone on public.crm_contacts(tenant_id, phone) where phone is not null;
create index if not exists idx_crm_contacts_tenant_company on public.crm_contacts(tenant_id, company_id) where company_id is not null;
create index if not exists idx_crm_companies_tenant_name on public.crm_companies(tenant_id, lower(name));
create index if not exists idx_crm_leads_tenant_status on public.crm_leads(tenant_id, status, updated_at desc);
create index if not exists idx_crm_leads_tenant_owner on public.crm_leads(tenant_id, owner_user_id, updated_at desc);
create index if not exists idx_crm_leads_tenant_contact on public.crm_leads(tenant_id, contact_id) where contact_id is not null;
create index if not exists idx_crm_pipelines_tenant_object on public.crm_pipelines(tenant_id, object_type);
create index if not exists idx_crm_pipeline_stages_tenant_order on public.crm_pipeline_stages(tenant_id, pipeline_id, stage_order);
create index if not exists idx_crm_opportunities_tenant_pipeline on public.crm_opportunities(tenant_id, pipeline_id, stage_id);
create index if not exists idx_crm_opportunities_tenant_status on public.crm_opportunities(tenant_id, status, updated_at desc);
create index if not exists idx_crm_tasks_tenant_status on public.crm_tasks(tenant_id, status, due_at);
create index if not exists idx_crm_tasks_tenant_related on public.crm_tasks(tenant_id, related_object_type, related_object_id);
create index if not exists idx_crm_notes_tenant_related on public.crm_notes(tenant_id, related_object_type, related_object_id, updated_at desc);
create index if not exists idx_crm_activities_tenant_related on public.crm_activities(tenant_id, related_object_type, related_object_id, occurred_at desc);
create index if not exists idx_crm_agent_configs_tenant_agent on public.crm_agent_configs(tenant_id, agent_id);
create index if not exists idx_crm_agent_run_refs_tenant_agent on public.crm_agent_run_refs(tenant_id, agent_id, updated_at desc);
create index if not exists idx_crm_connector_accounts_tenant_provider on public.crm_connector_accounts(tenant_id, provider, status);
create index if not exists idx_crm_connector_credentials_tenant_account on public.crm_connector_credentials(tenant_id, connector_account_id);
create index if not exists idx_crm_knowledge_items_tenant_namespace on public.crm_knowledge_items(tenant_id, namespace, updated_at desc);
create index if not exists idx_crm_memory_index_tenant_namespace on public.crm_memory_index(tenant_id, namespace, updated_at desc);
create index if not exists idx_crm_audit_tenant_time on public.crm_audit_events(tenant_id, occurred_at desc);
create index if not exists idx_crm_audit_object on public.crm_audit_events(tenant_id, object_type, object_id, occurred_at desc);
create index if not exists idx_crm_attribution_tenant_time on public.crm_attribution_events(tenant_id, occurred_at desc);
create index if not exists idx_crm_attribution_event_type on public.crm_attribution_events(tenant_id, event_type, occurred_at desc);
create index if not exists idx_crm_approval_refs_tenant_status on public.crm_approval_refs(tenant_id, status, updated_at desc);

-- Updated-at triggers.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_tenants',
    'crm_tenant_memberships',
    'crm_tenant_settings',
    'crm_tenant_module_flags',
    'crm_companies',
    'crm_contacts',
    'crm_leads',
    'crm_pipelines',
    'crm_pipeline_stages',
    'crm_opportunities',
    'crm_tasks',
    'crm_notes',
    'crm_activities',
    'crm_agent_configs',
    'crm_agent_run_refs',
    'crm_connector_accounts',
    'crm_connector_credentials',
    'crm_knowledge_items',
    'crm_memory_index',
    'crm_attribution_events',
    'crm_audit_events',
    'crm_approval_refs'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.crm_touch_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

-- RLS.

alter table public.crm_tenants enable row level security;
alter table public.crm_tenants force row level security;
create policy crm_tenants_tenant_select on public.crm_tenants for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenants_tenant_insert on public.crm_tenants for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenants_tenant_update on public.crm_tenants for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_tenant_memberships enable row level security;
alter table public.crm_tenant_memberships force row level security;
create policy crm_tenant_memberships_tenant_select on public.crm_tenant_memberships for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenant_memberships_tenant_insert on public.crm_tenant_memberships for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenant_memberships_tenant_update on public.crm_tenant_memberships for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_tenant_settings enable row level security;
alter table public.crm_tenant_settings force row level security;
create policy crm_tenant_settings_tenant_select on public.crm_tenant_settings for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenant_settings_tenant_insert on public.crm_tenant_settings for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenant_settings_tenant_update on public.crm_tenant_settings for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_tenant_module_flags enable row level security;
alter table public.crm_tenant_module_flags force row level security;
create policy crm_tenant_module_flags_tenant_select on public.crm_tenant_module_flags for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenant_module_flags_tenant_insert on public.crm_tenant_module_flags for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tenant_module_flags_tenant_update on public.crm_tenant_module_flags for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_companies enable row level security;
alter table public.crm_companies force row level security;
create policy crm_companies_tenant_select on public.crm_companies for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_companies_tenant_insert on public.crm_companies for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_companies_tenant_update on public.crm_companies for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_contacts enable row level security;
alter table public.crm_contacts force row level security;
create policy crm_contacts_tenant_select on public.crm_contacts for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_contacts_tenant_insert on public.crm_contacts for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_contacts_tenant_update on public.crm_contacts for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_leads enable row level security;
alter table public.crm_leads force row level security;
create policy crm_leads_tenant_select on public.crm_leads for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_leads_tenant_insert on public.crm_leads for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_leads_tenant_update on public.crm_leads for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_pipelines enable row level security;
alter table public.crm_pipelines force row level security;
create policy crm_pipelines_tenant_select on public.crm_pipelines for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_pipelines_tenant_insert on public.crm_pipelines for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_pipelines_tenant_update on public.crm_pipelines for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_pipeline_stages force row level security;
create policy crm_pipeline_stages_tenant_select on public.crm_pipeline_stages for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_pipeline_stages_tenant_insert on public.crm_pipeline_stages for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_pipeline_stages_tenant_update on public.crm_pipeline_stages for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_opportunities enable row level security;
alter table public.crm_opportunities force row level security;
create policy crm_opportunities_tenant_select on public.crm_opportunities for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_opportunities_tenant_insert on public.crm_opportunities for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_opportunities_tenant_update on public.crm_opportunities for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_tasks enable row level security;
alter table public.crm_tasks force row level security;
create policy crm_tasks_tenant_select on public.crm_tasks for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tasks_tenant_insert on public.crm_tasks for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_tasks_tenant_update on public.crm_tasks for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_notes enable row level security;
alter table public.crm_notes force row level security;
create policy crm_notes_tenant_select on public.crm_notes for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_notes_tenant_insert on public.crm_notes for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_notes_tenant_update on public.crm_notes for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_activities enable row level security;
alter table public.crm_activities force row level security;
create policy crm_activities_tenant_select on public.crm_activities for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_activities_tenant_insert on public.crm_activities for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_activities_tenant_update on public.crm_activities for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_agent_configs enable row level security;
alter table public.crm_agent_configs force row level security;
create policy crm_agent_configs_tenant_select on public.crm_agent_configs for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_agent_configs_tenant_insert on public.crm_agent_configs for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_agent_configs_tenant_update on public.crm_agent_configs for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_agent_run_refs enable row level security;
alter table public.crm_agent_run_refs force row level security;
create policy crm_agent_run_refs_tenant_select on public.crm_agent_run_refs for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_agent_run_refs_tenant_insert on public.crm_agent_run_refs for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_agent_run_refs_tenant_update on public.crm_agent_run_refs for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_connector_accounts enable row level security;
alter table public.crm_connector_accounts force row level security;
create policy crm_connector_accounts_tenant_select on public.crm_connector_accounts for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_connector_accounts_tenant_insert on public.crm_connector_accounts for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_connector_accounts_tenant_update on public.crm_connector_accounts for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_connector_credentials enable row level security;
alter table public.crm_connector_credentials force row level security;
create policy crm_connector_credentials_tenant_select on public.crm_connector_credentials for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_connector_credentials_tenant_insert on public.crm_connector_credentials for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_connector_credentials_tenant_update on public.crm_connector_credentials for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_knowledge_items enable row level security;
alter table public.crm_knowledge_items force row level security;
create policy crm_knowledge_items_tenant_select on public.crm_knowledge_items for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_knowledge_items_tenant_insert on public.crm_knowledge_items for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_knowledge_items_tenant_update on public.crm_knowledge_items for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_memory_index enable row level security;
alter table public.crm_memory_index force row level security;
create policy crm_memory_index_tenant_select on public.crm_memory_index for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_memory_index_tenant_insert on public.crm_memory_index for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_memory_index_tenant_update on public.crm_memory_index for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_attribution_events enable row level security;
alter table public.crm_attribution_events force row level security;
create policy crm_attribution_events_tenant_select on public.crm_attribution_events for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_attribution_events_tenant_insert on public.crm_attribution_events for insert with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_audit_events enable row level security;
alter table public.crm_audit_events force row level security;
create policy crm_audit_events_tenant_select on public.crm_audit_events for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_audit_events_tenant_insert on public.crm_audit_events for insert with check (tenant_id = (select public.crm_current_tenant_id()));

alter table public.crm_approval_refs enable row level security;
alter table public.crm_approval_refs force row level security;
create policy crm_approval_refs_tenant_select on public.crm_approval_refs for select using (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_approval_refs_tenant_insert on public.crm_approval_refs for insert with check (tenant_id = (select public.crm_current_tenant_id()));
create policy crm_approval_refs_tenant_update on public.crm_approval_refs for update using (tenant_id = (select public.crm_current_tenant_id())) with check (tenant_id = (select public.crm_current_tenant_id()));

-- No tenant-user hard-delete policies are created in this MVP baseline.
-- Platform admin reporting remains deferred to P2b. Do not add broad
-- crm_platform_admin_mode() base-table policies without explicit reporting views,
-- approval/audit design, and live RLS tests.
