-- SaaS Onboarding Schema — Subscriptions + Client Agents + RLS
-- Migration: 002-saas-onboarding
-- Adds: subscriptions table, client_agents table, RLS policies

-- ─── Subscriptions ─────────────────────────────────────────────────

create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references clients(id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text unique not null,
  status                  text not null default 'incomplete'
                          check (status in (
                            'incomplete', 'active', 'past_due',
                            'canceled', 'unpaid', 'trialing'
                          )),
  plan_tier               text not null default 'standard'
                          check (plan_tier in ('standard', 'professional', 'enterprise')),
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_subscriptions_client on subscriptions (client_id);
create index if not exists idx_subscriptions_stripe_sub on subscriptions (stripe_subscription_id);
create index if not exists idx_subscriptions_stripe_cust on subscriptions (stripe_customer_id);
create index if not exists idx_subscriptions_status on subscriptions (status);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

-- ─── Client Agents (per-client agent config) ──────────────────────

create table if not exists client_agents (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  role        text not null
              check (role in ('planner', 'executor', 'validator', 'monitor')),
  config      jsonb not null default '{}',
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists idx_client_agents_unique
  on client_agents (client_id, role);
create index if not exists idx_client_agents_client on client_agents (client_id);

create trigger client_agents_updated_at
  before update on client_agents
  for each row execute function update_updated_at();

-- ─── Enable RLS on new tables ──────────────────────────────────────

alter table subscriptions enable row level security;
alter table client_agents enable row level security;

-- ─── RLS Policies — Service Role Full Access ───────────────────────

-- Service role can do everything (backend API calls use service role key)
create policy "service_full_access_clients" on clients
  for all using (auth.role() = 'service_role');

create policy "service_full_access_missions" on missions
  for all using (auth.role() = 'service_role');

create policy "service_full_access_runs" on mission_runs
  for all using (auth.role() = 'service_role');

create policy "service_full_access_deliverables" on deliverables
  for all using (auth.role() = 'service_role');

create policy "service_full_access_assets" on assets
  for all using (auth.role() = 'service_role');

create policy "service_full_access_subscriptions" on subscriptions
  for all using (auth.role() = 'service_role');

create policy "service_full_access_client_agents" on client_agents
  for all using (auth.role() = 'service_role');

-- ─── RLS Policies — Authenticated Client Access ────────────────────
-- Clients can only see their own data.
-- Uses auth.jwt() -> 'client_id' claim set during auth.

create policy "client_read_own" on clients
  for select using (
    id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_missions" on missions
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_runs" on mission_runs
  for select using (
    mission_id in (
      select id from missions where client_id::text = (auth.jwt() ->> 'client_id')
    )
  );

create policy "client_read_own_deliverables" on deliverables
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_assets" on assets
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_subscriptions" on subscriptions
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

create policy "client_read_own_agents" on client_agents
  for select using (
    client_id::text = (auth.jwt() ->> 'client_id')
  );

-- ─── Add plan_tier column to clients if not present ────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'clients' and column_name = 'plan_tier'
  ) then
    alter table clients add column plan_tier text default 'standard'
      check (plan_tier in ('standard', 'professional', 'enterprise'));
  end if;
end $$;
