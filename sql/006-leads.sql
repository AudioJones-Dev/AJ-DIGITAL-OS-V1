-- Leads Schema — Florida Platform Lift Pros Lead Pipeline
-- Table: leads
-- Purpose: Store inbound leads from all web forms and CTAs
-- Provider: Neon (execution data layer)

-- ─── Leads ──────────────────────────────────────────────────────────

create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  first_name        text,
  last_name         text,
  name              text,
  email             text not null,
  phone             text,
  county            text,
  city              text,
  service_needed    text,
  property_type     text,
  timeline          text,
  message           text,
  lead_source_page  text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  status            text not null default 'new'
                    check (status in ('new', 'contacted', 'qualified', 'estimate_scheduled', 'estimate_sent', 'won', 'lost', 'spam')),
  priority          text not null default 'normal'
                    check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to       text,
  notes             text
);

create index if not exists idx_leads_email    on leads (email);
create index if not exists idx_leads_status   on leads (status);
create index if not exists idx_leads_priority on leads (priority);
create index if not exists idx_leads_created  on leads (created_at desc);

-- Auto-update updated_at on row changes
create or replace function leads_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on leads;
create trigger trg_leads_updated_at
  before update on leads
  for each row execute procedure leads_set_updated_at();
