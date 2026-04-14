-- Supabase Schema — Control Layer
-- Tables: clients, missions, mission_runs
-- Purpose: Auth, client management, mission definitions, run metadata
-- NOTE: Execution logs, steps, and decision data belong in Neon (data layer)

-- ─── Clients ───────────────────────────────────────────────────────

create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  display_name  text not null,
  contact_email text,
  tier          text not null default 'standard'
                check (tier in ('standard', 'professional', 'enterprise')),
  status        text not null default 'active'
                check (status in ('active', 'paused', 'archived')),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_clients_slug on clients (slug);
create index if not exists idx_clients_status on clients (status);

-- ─── Missions ──────────────────────────────────────────────────────

create table if not exists missions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references clients(id) on delete set null,
  mission_type    text not null
                  check (mission_type in (
                    'build_and_review',
                    'extract_normalize_store',
                    'repair_failed_workflow',
                    'monitor_only'
                  )),
  objective       text not null,
  priority        text not null default 'normal'
                  check (priority in ('low', 'normal', 'high', 'critical')),
  input_payload   jsonb not null default '{}',
  schedule        jsonb,              -- optional cron / trigger config
  status          text not null default 'active'
                  check (status in ('active', 'paused', 'retired')),
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_missions_client on missions (client_id);
create index if not exists idx_missions_type on missions (mission_type);
create index if not exists idx_missions_status on missions (status);

-- ─── Mission Runs (metadata only — execution data in Neon) ────────

create table if not exists mission_runs (
  id              uuid primary key default gen_random_uuid(),
  mission_id      uuid references missions(id) on delete cascade,
  run_ref         text unique not null,          -- matches Neon runs.run_ref
  status          text not null default 'pending'
                  check (status in ('pending', 'running', 'completed', 'failed')),
  requested_by    text,
  trigger_type    text default 'manual'
                  check (trigger_type in ('manual', 'cron', 'webhook', 'hermes')),
  ok              boolean,
  summary         text,
  artifacts       text[] not null default '{}',   -- R2 keys
  failure_ref     text,                           -- pointer to Neon failure record
  started_at      timestamptz,
  completed_at    timestamptz,
  duration_ms     integer,
  created_at      timestamptz not null default now()
);

create index if not exists idx_mission_runs_mission on mission_runs (mission_id);
create index if not exists idx_mission_runs_status on mission_runs (status);
create index if not exists idx_mission_runs_ref on mission_runs (run_ref);

-- ─── Updated-At Trigger ────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

create trigger missions_updated_at
  before update on missions
  for each row execute function update_updated_at();

-- ─── Deliverables (outputs linked to runs + clients) ───────────────

create table if not exists deliverables (
  id              uuid primary key default gen_random_uuid(),
  mission_run_id  uuid references mission_runs(id) on delete set null,
  client_id       uuid references clients(id) on delete set null,
  filename        text not null,
  content_type    text not null default 'application/octet-stream',
  size_bytes      integer,
  r2_key          text not null,
  public_url      text,
  status          text not null default 'pending'
                  check (status in ('pending', 'uploaded', 'published', 'failed')),
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_deliverables_run on deliverables (mission_run_id);
create index if not exists idx_deliverables_client on deliverables (client_id);
create index if not exists idx_deliverables_status on deliverables (status);

-- ─── Assets (individual files within a deliverable) ────────────────

create table if not exists assets (
  id              uuid primary key default gen_random_uuid(),
  deliverable_id  uuid references deliverables(id) on delete cascade,
  client_id       uuid references clients(id) on delete set null,
  filename        text not null,
  r2_key          text not null,
  public_url      text,
  content_type    text not null default 'application/octet-stream',
  size_bytes      integer,
  status          text not null default 'pending'
                  check (status in ('pending', 'uploaded', 'published', 'failed')),
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_assets_deliverable on assets (deliverable_id);
create index if not exists idx_assets_client on assets (client_id);
create index if not exists idx_assets_status on assets (status);

-- ─── Row Level Security ────────────────────────────────────────────

alter table clients enable row level security;
alter table missions enable row level security;
alter table mission_runs enable row level security;
alter table deliverables enable row level security;
alter table assets enable row level security;

-- Service role has full access; anon gets nothing by default.
-- Add policies per your auth requirements:
--   create policy "Service full access" on clients
--     for all using (auth.role() = 'service_role');
