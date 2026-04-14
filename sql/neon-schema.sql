-- Neon Schema — Execution Data Layer
-- Tables: runs, steps, observations, failures, patterns
-- Purpose: Full execution memory — logs, decisions, replay data
-- NOTE: Control metadata (clients, missions, run status) belongs in Supabase

-- ─── Runs ──────────────────────────────────────────────────────────

create table if not exists runs (
  id              bigserial primary key,
  run_ref         text unique not null,          -- matches Supabase mission_runs.run_ref
  mission_type    text not null,
  objective       text not null,
  input_payload   jsonb not null default '{}',
  status          text not null default 'running'
                  check (status in ('running', 'completed', 'failed')),
  ok              boolean,
  summary         text,
  error           text,
  roles_used      text[] not null default '{}',
  escalation_count integer not null default 0,
  duration_ms     integer,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_runs_ref on runs (run_ref);
create index if not exists idx_runs_status on runs (status);
create index if not exists idx_runs_started on runs (started_at desc);

-- ─── Steps ─────────────────────────────────────────────────────────

create table if not exists steps (
  id              bigserial primary key,
  run_id          bigint not null references runs(id) on delete cascade,
  step_index      integer not null,
  role            text not null,                 -- planner, executor, validator, monitor
  pipeline_id     text not null,
  ok              boolean not null,
  input_snapshot  jsonb,                         -- what the step received
  output_snapshot jsonb,                         -- what the step returned
  error           text,
  duration_ms     integer not null,
  retries         integer not null default 0,
  warnings        text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_steps_run on steps (run_id);
create index if not exists idx_steps_role on steps (role);

-- ─── Observations (sentinel / monitor) ─────────────────────────────

create table if not exists observations (
  id              bigserial primary key,
  run_id          bigint references runs(id) on delete cascade,
  source          text not null default 'sentinel',
  healthy         boolean not null,
  summary         text not null,
  checks          jsonb not null default '[]',
  snapshot_label  text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_observations_run on observations (run_id);
create index if not exists idx_observations_healthy on observations (healthy);

-- ─── Failures ──────────────────────────────────────────────────────

create table if not exists failures (
  id              bigserial primary key,
  run_id          bigint references runs(id) on delete cascade,
  step_id         bigint references steps(id) on delete set null,
  role            text not null,
  error           text not null,
  input_snapshot  jsonb,
  stack_trace     text,
  escalated       boolean not null default false,
  resolved        boolean not null default false,
  resolution      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_failures_run on failures (run_id);
create index if not exists idx_failures_resolved on failures (resolved);

-- ─── Patterns (learned behaviours) ─────────────────────────────────

create table if not exists patterns (
  id              bigserial primary key,
  run_id          bigint references runs(id) on delete set null,
  pattern_type    text not null
                  check (pattern_type in ('decision', 'recovery', 'optimization', 'anti_pattern')),
  description     text not null,
  context         jsonb not null default '{}',
  confidence      real not null default 0.5
                  check (confidence >= 0 and confidence <= 1),
  occurrences     integer not null default 1,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_patterns_type on patterns (pattern_type);
create index if not exists idx_patterns_confidence on patterns (confidence desc);
