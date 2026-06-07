-- AJ Digital OS canonical memory schema draft.
-- This file is a review artifact only. Do not run it as a migration until the
-- Memory Router contract, tenant model, and rollback plan are approved.

create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null unique,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references clients(tenant_id),
  project_id text not null,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, project_id)
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text references clients(tenant_id),
  agent_id text not null,
  name text not null,
  role text not null,
  status text not null default 'active',
  capabilities jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, agent_id)
);

create table if not exists memory_records (
  id uuid primary key default gen_random_uuid(),
  memory_type text not null,
  approval_status text not null default 'draft',
  version integer not null default 1,
  scope text not null,
  title text not null,
  body text not null,
  tenant_id text references clients(tenant_id),
  project_id text,
  agent_id text,
  run_id text,
  source_kind text not null,
  source_uri text,
  source_hash text,
  confidence text not null default 'medium',
  tags text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_records_confidence_check check (confidence in ('low', 'medium', 'high')),
  constraint memory_records_approval_status_check check (
    approval_status in ('draft', 'pending_review', 'approved', 'rejected', 'deprecated')
  )
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  memory_record_id uuid not null references memory_records(id) on delete cascade,
  tenant_id text references clients(tenant_id),
  project_id text,
  decision_date date not null,
  decision_status text not null default 'accepted',
  rationale text not null,
  reversal_plan text,
  created_at timestamptz not null default now()
);

create table if not exists sops (
  id uuid primary key default gen_random_uuid(),
  memory_record_id uuid not null references memory_records(id) on delete cascade,
  tenant_id text references clients(tenant_id),
  project_id text,
  sop_id text not null,
  owner text,
  approval_required boolean not null default true,
  validation_steps jsonb not null default '[]'::jsonb,
  rollback_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  memory_record_id uuid references memory_records(id) on delete set null,
  tenant_id text references clients(tenant_id),
  project_id text,
  run_id text,
  severity text not null default 'medium',
  symptom text not null,
  root_cause text,
  corrective_action text,
  created_at timestamptz not null default now()
);

create table if not exists run_log (
  id uuid primary key default gen_random_uuid(),
  memory_record_id uuid references memory_records(id) on delete set null,
  tenant_id text references clients(tenant_id),
  project_id text,
  run_id text not null,
  agent_id text,
  objective text not null,
  outcome text not null,
  source_uri text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists brand_memory (
  id uuid primary key default gen_random_uuid(),
  memory_record_id uuid not null references memory_records(id) on delete cascade,
  tenant_id text not null references clients(tenant_id),
  brand_id text not null,
  category text not null,
  approved_phrase text,
  prohibited_phrase text,
  guidance text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists retrieval_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id text references clients(tenant_id),
  policy_id text not null,
  allowed_memory_types text[] not null,
  max_total_tokens integer not null,
  max_tokens_per_memory_type jsonb not null default '{}'::jsonb,
  freshness_cutoff_days integer,
  minimum_confidence text not null default 'medium',
  citations_required boolean not null default true,
  tenant_isolation_required boolean not null default true,
  retrieval_order text[] not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, policy_id)
);

create table if not exists write_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id text references clients(tenant_id),
  policy_id text not null,
  actor_id text not null,
  actor_type text not null,
  allowed_memory_types text[] not null,
  allowed_scopes text[] not null,
  requires_approval boolean not null default true,
  require_tenant_id boolean not null default true,
  require_source boolean not null default true,
  require_citation boolean not null default true,
  max_body_characters integer not null default 12000,
  denied_tags text[] not null default array[]::text[],
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, policy_id, actor_id)
);

create table if not exists approval_queue (
  id uuid primary key default gen_random_uuid(),
  memory_record_id uuid not null references memory_records(id) on delete cascade,
  tenant_id text references clients(tenant_id),
  requested_by text not null,
  approval_type text not null,
  status text not null default 'pending',
  reason text not null,
  reviewer text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_memory_records_tenant_type_updated
  on memory_records (tenant_id, memory_type, updated_at desc);

create index if not exists idx_memory_records_scope_status
  on memory_records (scope, approval_status);

create index if not exists idx_memory_records_tags
  on memory_records using gin (tags);

create index if not exists idx_memory_records_metadata
  on memory_records using gin (metadata);

create index if not exists idx_run_log_tenant_run
  on run_log (tenant_id, run_id);

create index if not exists idx_approval_queue_tenant_status
  on approval_queue (tenant_id, status, created_at desc);
