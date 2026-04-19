-- Moat Signals Schema — Execution Intelligence + Client Signals
-- Migration: 003-moat-signals
-- Adds: client_signals, execution_intelligence, client_schedules, stripe_events
-- Adds columns to: mission_runs, deliverables

-- ─── Stripe Events (Webhook Idempotency) ───────────────────────────

create table if not exists stripe_events (
  id              text primary key,          -- Stripe event ID (evt_xxx)
  event_type      text not null,
  processed_at    timestamptz not null default now()
);

create index if not exists idx_stripe_events_type on stripe_events (event_type);

-- ─── Client Signals (Explicit Feedback) ────────────────────────────

create table if not exists client_signals (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  mission_run_id  uuid references mission_runs(id) on delete set null,
  deliverable_id  uuid references deliverables(id) on delete set null,
  signal_type     text not null
                  check (signal_type in ('thumbs_up', 'thumbs_down', 'rating', 'comment')),
  signal_value    numeric,                   -- e.g. 1/-1 for thumbs, 1-5 for rating
  comment         text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_client_signals_client on client_signals (client_id);
create index if not exists idx_client_signals_run on client_signals (mission_run_id);
create index if not exists idx_client_signals_type on client_signals (signal_type);

-- ─── Execution Intelligence (Aggregated Insights) ──────────────────

create table if not exists execution_intelligence (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references clients(id) on delete cascade,
  mission_type    text not null,
  signal_type     text not null
                  check (signal_type in ('quality', 'speed', 'cost', 'satisfaction', 'failure')),
  signal_value    numeric not null,
  baseline_value  numeric,                   -- value at first measurement
  improvement_pct numeric,                   -- (signal - baseline) / baseline * 100
  window_start    timestamptz not null,
  window_end      timestamptz not null,
  sample_size     integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_exec_intel_client on execution_intelligence (client_id);
create index if not exists idx_exec_intel_type on execution_intelligence (mission_type);
create index if not exists idx_exec_intel_signal on execution_intelligence (signal_type);
create index if not exists idx_exec_intel_window on execution_intelligence (window_start, window_end);

-- ─── Client Schedules (Persisted, Survives Restart) ────────────────

create table if not exists client_schedules (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  schedule_key    text not null,             -- e.g. "health-check", "data-extract"
  name            text not null,
  cron            text not null,
  mission_type    text not null,
  objective       text not null,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_client_schedules_unique
  on client_schedules (client_id, schedule_key);
create index if not exists idx_client_schedules_client on client_schedules (client_id);
create index if not exists idx_client_schedules_enabled on client_schedules (enabled);

create trigger client_schedules_updated_at
  before update on client_schedules
  for each row execute function update_updated_at();

-- ─── Column Additions: mission_runs ────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'mission_runs' and column_name = 'output_quality_score'
  ) then
    alter table mission_runs add column output_quality_score numeric;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'mission_runs' and column_name = 'execution_cost_estimate'
  ) then
    alter table mission_runs add column execution_cost_estimate integer;  -- cents
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'mission_runs' and column_name = 'mission_config_at_execution'
  ) then
    alter table mission_runs add column mission_config_at_execution jsonb;
  end if;
end $$;

-- ─── Column Additions: deliverables ────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'deliverables' and column_name = 'outcome'
  ) then
    alter table deliverables add column outcome text default 'unknown'
      check (outcome in ('used', 'modified', 'rejected', 'ignored', 'unknown'));
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'deliverables' and column_name = 'published_at'
  ) then
    alter table deliverables add column published_at timestamptz;
  end if;
end $$;

-- ─── RLS ───────────────────────────────────────────────────────────

alter table stripe_events enable row level security;
alter table client_signals enable row level security;
alter table execution_intelligence enable row level security;
alter table client_schedules enable row level security;

-- Service role full access
create policy "service_full_access_stripe_events" on stripe_events
  for all using (auth.role() = 'service_role');

create policy "service_full_access_client_signals" on client_signals
  for all using (auth.role() = 'service_role');

create policy "service_full_access_execution_intelligence" on execution_intelligence
  for all using (auth.role() = 'service_role');

create policy "service_full_access_client_schedules" on client_schedules
  for all using (auth.role() = 'service_role');

-- Client read-own policies
create policy "client_read_own_signals" on client_signals
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_intelligence" on execution_intelligence
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_schedules" on client_schedules
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );
