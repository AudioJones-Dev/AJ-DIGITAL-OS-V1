-- Stripe Events Audit / Idempotency
-- Stores processed Stripe webhook event IDs so duplicate deliveries are skipped.

create table if not exists stripe_events (
  id            text primary key,
  event_type    text not null,
  processed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_stripe_events_type on stripe_events (event_type);
create index if not exists idx_stripe_events_created_at on stripe_events (created_at desc);

alter table stripe_events enable row level security;

drop policy if exists "service_full_access_stripe_events" on stripe_events;
create policy "service_full_access_stripe_events" on stripe_events
  for all using (auth.role() = 'service_role');

notify pgrst, 'reload schema';
