---
title: MCP-Native Link-in-Bio — Schema Materialization
status: draft
canonical: false
version: v0.1
scope: multi-tenant-saas
created: 2026-07-05T00:00:00.000Z
owner: AJ Digital LLC / Audio Jones
canonical_vault: G:\AJ-INTERNAL\AJ-DIGITAL-VAULT
home: AJ-DIGITAL-OS docs/specs/link-in-bio/ (docs/* lane)
category: project-schema-spec
materializes: docs/specs/link-in-bio/ontology.md (v0.3, canonical)
target: Supabase Postgres (RLS)
product: OpenBio (placeholder codename — naming is operator's pen)
tags:
  - schema
  - link-in-bio
  - postgres
  - supabase
  - rls
  - multi-tenant
related:
  - "[[SCHEMA_MATERIALIZES_ONTOLOGY]]"
  - "[[ROADMAP_BEFORE_ONTOLOGY_BEFORE_SCHEMA]]"
  - "[[PHASE_GATED_DEVELOPMENT]]"
  - "[[UX_GUARDRAILS]]"
---

# MCP-Native Link-in-Bio — Schema Materialization

> [!WARNING] Draft — awaiting review
> Stage 3 (Schema) of `Roadmap → Ontology → Schema → Implementation`. A mechanical transcription of the **canonical ontology v0.3** (`docs/specs/link-in-bio/ontology.md`). This spec introduces **no** semantics absent from that ontology. It is the build contract for the `build/*` (Codex) lane; it is not itself executable migration until reviewed and the Clerk↔Supabase JWT wiring (§6) is confirmed.

## 1. Doctrine position &amp; conventions

Per [[SCHEMA_MATERIALIZES_ONTOLOGY]]: every table, column, enum, and FK below traces to a named concept in the ontology. Any object that cannot is a defect.

- **Target:** Supabase Postgres. Tenant isolation enforced by **RLS** (INV-2), not the UI.
- **Keys:** `uuid` PKs via `gen_random_uuid()`.
- **Time:** `timestamptz`, `created_at`/`updated_at` default `now()`.
- **Tenancy:** every content table carries `workspace_id uuid not null` (INV-1/INV-2).
- **Lifecycle:** modelled as `status`/state enum columns + soft transitions; no hard deletes on content (archive instead).
- **Ordering:** `blocks.position numeric` (fractional index — insert between with midpoints).

## 2. Concept → table traceability

| Ontology concept | Table(s) | Phase |
|---|---|---|
| Workspace | `workspaces` | 1 |
| User | `users` | 1 |
| Membership | `memberships` | 1 |
| Domain | `domains` | 1 |
| Page | `pages` | 1 |
| Block | `blocks` | 1 |
| Theme | `themes` | 1 |
| ProposedAction | `proposed_actions` | 1 |
| Actor | *embedded* (`actor_kind`,`actor_ref` cols) + `audit_log` | 1 |
| Product | `products` | 2 |
| Order | `orders` | 2 |
| AnalyticsEvent | `analytics_events` | 4 |

## 3. Enum types (ontology terms)

```sql
create type role                as enum ('owner','admin','editor','viewer');
create type block_type          as enum ('link','header','text','image','embed','socials','email_capture','product','divider');
create type publish_state       as enum ('draft','published','unpublished','archived');
create type product_kind        as enum ('digital','link','appointment','membership');
create type order_status        as enum ('pending','paid','fulfilled','refunded');
create type event_kind          as enum ('view','click');
create type approval_state      as enum ('proposed','approved','rejected','applied','discarded');
create type actor_kind          as enum ('human','agent');
create type domain_type         as enum ('subdomain','custom');
create type domain_verification as enum ('pending','verified','failed');
```

## 4. Tables (Phase 1)

```sql
-- Workspace — tenant / isolation boundary
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'free',
  billing_ref text,
  status      text not null default 'active',   -- active|suspended|archived
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- User — person identity (mirror of Clerk)
create table users (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  display_name  text,
  email         text,
  status        text not null default 'active',  -- invited|active|deactivated
  created_at    timestamptz not null default now()
);

-- Membership — User ↔ Workspace at a Role
create table memberships (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         role not null default 'viewer',
  status       text not null default 'active',   -- invited|active|revoked
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  unique (workspace_id, user_id)
);

-- Domain — public host → Workspace (routing primitive, INV-5)
create table domains (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  page_id      uuid,                              -- nullable → workspace default page
  host         text not null unique,
  type         domain_type not null,
  verification domain_verification not null default 'pending',
  created_at   timestamptz not null default now()
);

-- Theme — presentation token bundle
create table themes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,  -- null = global preset
  name         text not null,
  tokens       jsonb not null default '{}',
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);

-- Page — one public link-in-bio surface
create table pages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  theme_id      uuid references themes(id),
  slug          text not null,
  title         text,
  seo           jsonb not null default '{}',
  publish_state publish_state not null default 'draft',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, slug)
);
alter table domains add constraint domains_page_fk
  foreign key (page_id) references pages(id) on delete set null;

-- Block — ordered, typed content unit on a Page
create table blocks (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references pages(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,  -- denormalized for RLS
  type         block_type not null,
  position     numeric not null,                  -- fractional ordering key
  visible      boolean not null default true,
  payload      jsonb not null default '{}',       -- shape validated per type by app-layer Zod
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index blocks_page_position_idx on blocks (page_id, position);

-- ProposedAction — propose-then-approve for agent writes (INV-4 / G3)
create table proposed_actions (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  target_type    text not null,                   -- concept name e.g. 'page','product'
  target_id      uuid,
  proposed_diff  jsonb not null,
  rationale      text,
  confidence     numeric,
  impact         text not null,                   -- reversible|irreversible
  state          approval_state not null default 'proposed',
  proposed_by_kind actor_kind not null,
  proposed_by_ref  text,
  decided_by_kind  actor_kind,
  decided_by_ref   text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- Audit log — Actor recorded on every mutation (auditability, Principle #5)
create table audit_log (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_kind   actor_kind not null,
  actor_ref    text,
  action       text not null,                     -- e.g. 'block.update'
  target_type  text,
  target_id    uuid,
  meta         jsonb not null default '{}',
  ts           timestamptz not null default now()
);
```

## 5. Tables (Phase 2 &amp; 4 — defined now, activated later)

```sql
-- Product (Phase 2)
create table products (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  name              text not null,
  description       text,
  price_cents       integer,
  currency          text default 'usd',
  kind              product_kind not null,
  asset_ref         text,
  payment_price_ref text,
  status            text not null default 'draft',
  created_at        timestamptz not null default now()
);

-- Order (Phase 2)
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  product_id          uuid not null references products(id),
  buyer_email         text,
  amount_cents        integer,
  currency            text default 'usd',
  payment_session_ref text,
  status              order_status not null default 'pending',
  created_at          timestamptz not null default now()
);

-- AnalyticsEvent (Phase 4) — append-only
create table analytics_events (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  page_id      uuid references pages(id) on delete cascade,
  block_id     uuid references blocks(id) on delete set null,
  kind         event_kind not null,
  ts           timestamptz not null default now(),
  meta         jsonb not null default '{}'
);
create index analytics_page_ts_idx on analytics_events (page_id, ts);
```

## 6. RLS — tenant isolation (INV-2 / G8)

Assumes **Clerk configured as a Supabase third-party auth provider**, so `auth.jwt()->>'sub'` is the Clerk user id. Helper functions resolve the caller's workspaces via `memberships`.

```sql
-- caller's users.id from the Clerk JWT subject
create or replace function app_current_user_id() returns uuid
  language sql stable as $$
  select id from users where clerk_user_id = auth.jwt()->>'sub'
$$;

-- is the caller a member of the given workspace?
create or replace function app_is_member(ws uuid) returns boolean
  language sql stable as $$
  select exists (
    select 1 from memberships m
    where m.workspace_id = ws
      and m.user_id = app_current_user_id()
      and m.status = 'active'
  )
$$;

-- enable + policy per content table (pattern; repeat for each)
alter table pages enable row level security;
create policy pages_tenant on pages
  using (app_is_member(workspace_id))
  with check (app_is_member(workspace_id));
-- repeat identically for: workspaces (via id), memberships, domains, themes,
-- blocks, proposed_actions, audit_log (read), products, orders, analytics_events.
```

**Public read exception (INV-5):** visitor-facing reads of a **published** `Page` + its visible `Block`s + `Theme`, resolved by `Domain.host`, are served through a separate un-authenticated path (a `security definer` read function or a service-role edge function scoped to `publish_state = 'published'` and `visible = true`). Public pages MUST NOT require Access/JWT; the write side stays under the RLS policies above.

## 7. Notes for the build lane

- `blocks.payload` is validated **in the app layer** (shared Zod schemas), not the DB — per the ontology's typed-JSONB decision. Enum discriminator `blocks.type` is DB-enforced; the payload shape is not.
- `blocks.workspace_id` is denormalized from `pages` purely so RLS is a single-table predicate; keep it in sync via trigger or app write path.
- Every irreversible/client-impacting agent write inserts a `proposed_actions` row and does not mutate the target until `state = 'approved'` (INV-4). The MCP tool layer enforces this; the DB records it.
- `ProductKind = digital` is the Phase-2 launch subset.

## 8. Sequencing gates (this PR)

- [ ] Every table/column/enum above cites an ontology concept (§2 traceability) — **yes**.
- [ ] No new semantics vs ontology v0.3 — **confirm in review**.
- [ ] Implementation (migrations, API, MCP) consumes this contract, adds nothing new — **enforced downstream**.

## 9. Open questions (before build)

1. **Clerk↔Supabase JWT** — confirm Clerk is wired as a Supabase third-party auth provider and the `sub` claim shape, so §6 helpers are correct.
2. **Fractional index type** — `numeric` vs a lexicographic string key (e.g. `fractional-indexing`). Numeric is simpler; strings avoid precision drift over many reorders.
3. **Billing granularity** — per-workspace vs per-seat (open from ontology) affects whether `memberships` needs billing columns.

## Status
DRAFT · materializes canonical ontology v0.3 · branch `docs/link-in-bio-schema-v0.1` · awaiting review. Build (`build/*` Codex lane) proceeds only after this schema spec is reviewed. Merge to `main` HUMAN_REQUIRED.
