# AJ Digital Infrastructure Mapping Doctrine

**Status:** Canonical infrastructure doctrine
**Owner:** AJ Digital LLC
**Scope:** AJ Digital public sites, operational runtimes, client portal, CRM, ResponseOS, secrets, DNS, databases, workers, and automation infrastructure.

---

## Core Doctrine

AJ Digital uses a hybrid infrastructure model:

- Vercel = public experience layer.
- Render = operational runtime layer.
- Cloudflare = traffic, DNS, and security boundary.
- Postgres / Neon / Supabase = system-of-record database layer.
- Doppler = secrets management and rotation layer.

The rule:

If it is public-facing, brand-sensitive, SEO-sensitive, or frontend-heavy, prefer Vercel.

If it runs business logic, persists runtime state, handles jobs, webhooks, workers, APIs, or internal tools, prefer Render.

Canonical phrase:

> Public experience on Vercel. Operational runtime on Render. Security boundary on Cloudflare. Business memory in Postgres. Secrets through Doppler.

## Platform Mapping

| Use case | Primary platform | Notes |
|---|---|---|
| `audiojones.com` | Vercel | Public personal brand site. |
| AJ Digital marketing site | Vercel | Landing pages, offer pages, funnels. |
| Public pricing pages | Vercel | SEO and conversion layer. |
| Public lead magnets | Vercel | Forms may post into Render API. |
| Client portal frontend | Vercel | Client-facing UX layer. |
| Client dashboard frontend | Vercel | Visual experience layer. |
| Portal API | Render | Auth-aware backend logic. |
| CRM backend | Render | Business system of record. |
| CRM admin UI | Render or Vercel | Render if internal app; Vercel if polished frontend. |
| Internal ops apps | Render | Persistent runtime and app services. |
| ResponseOS backend | Render | Webhooks, workers, automations. |
| AI service APIs | Render | Long-running or persistent services. |
| Background workers | Render | Queue jobs, syncs, scheduled tasks. |
| Cron jobs | Render | Recurring operational tasks. |
| Webhook processors | Render | Stripe, Clerk, Gmail, CRM, n8n, and similar systems. |
| Client-specific runtimes | Render | Isolated operational services. |
| Databases | Render Postgres / Neon / Supabase | Choose based on production requirements. |
| File/object storage | Cloudflare R2 / Supabase Storage | Client files, media, attachments. |
| DNS | Cloudflare | Domain routing. |
| Access control edge layer | Cloudflare Access | Protect internal tools. |
| Secrets | Doppler | Remote secret loading and rotation. |
| Automation orchestration | n8n / Render workers | n8n for workflow glue; Render for app-native jobs. |

## Domain Mapping

| Domain/subdomain | Platform | Purpose |
|---|---|---|
| `audiojones.com` | Vercel | Personal brand / authority site. |
| `weareajdigital.com` | Vercel | AJ Digital public marketing. |
| `ajdigital.app` | Cloudflare-controlled | App namespace. |
| `portal.ajdigital.app` | Vercel frontend + Render API | Client portal. |
| `api.ajdigital.app` | Render | Shared backend API. |
| `crm.ajdigital.app` | Render or Vercel + Render API | CRM/admin system. |
| `ops.ajdigital.app` | Render | Internal operations tools. |
| `workers.ajdigital.app` | Render | Background jobs / automation runtime. |
| `dash.ajdigital.app` | Vercel or Render | Dashboards depending on architecture. |
| `home.ajdigital.app` | Self-hosted / Cloudflare Access | Internal command center. |

## Decision Rules

### Use Vercel When

- It is a public website.
- It needs SEO.
- It is frontend-heavy.
- It is a Next.js experience layer.
- It is client-facing and design-sensitive.
- It should deploy quickly from Git.

Examples:

- `audiojones.com`
- AJ Digital landing pages
- pricing pages
- client portal frontend
- public dashboards
- onboarding forms

### Use Render When

- It needs a persistent backend.
- It runs APIs.
- It handles webhooks.
- It runs background workers.
- It owns operational business logic.
- It coordinates CRM, portal, or automation flows.
- It needs scheduled jobs or long-running services.

Examples:

- CRM backend
- ResponseOS API
- client portal API
- AI receptionist backend
- webhook processors
- lead scoring workers
- data sync jobs
- internal ops apps

### Use Cloudflare When

- It controls DNS.
- It protects internal tools.
- It routes traffic.
- It handles access policy.
- It provides edge security.

Examples:

- Cloudflare Access for internal dashboards
- DNS for `ajdigital.app`
- protected admin routes
- traffic boundary

### Use Doppler When

- Secrets must be managed remotely.
- API keys need secure loading.
- Secrets must rotate without hardcoding.
- Codex, Claude, or CLI workflows need environment access.

Examples:

- OpenAI keys
- Clerk keys
- Stripe keys
- database URLs
- Render deploy secrets
- GitHub tokens

## Client Portal Doctrine

The client portal should be treated as a hybrid app:

- Frontend: Vercel.
- API: Render.
- Database: Postgres / Neon / Supabase.
- Auth: Clerk or equivalent.
- Edge protection: Cloudflare.
- Secrets: Doppler.

Rule:

The client portal may live visually on Vercel, but its operational authority belongs to Render-backed services.

## CRM Doctrine

The CRM is an operational system, not just a frontend.

CRM should own:

- clients
- contacts
- leads
- deals
- projects
- tickets
- follow-ups
- invoices
- notes
- audit logs
- pipeline status
- automation triggers

Recommended home:

- CRM frontend: Render or Vercel.
- CRM backend: Render.
- CRM database: Postgres.
- CRM workers: Render.

Rule:

If the CRM controls business memory, workflow state, or revenue operations, it belongs in the operational runtime layer.

## ResponseOS Doctrine

ResponseOS should use Render for runtime-critical services:

- webhook handlers
- AI receptionist backend
- lead intake
- follow-up automation
- queue workers
- CRM sync
- client-specific services
- scheduled checks
- notification jobs

Vercel may still be used for:

- frontend dashboard
- demo experience
- public documentation
- onboarding UI

Rule:

ResponseOS is not just a website. It is an operating service. Runtime belongs on Render.

## Final Operating Principle

AJ Digital infrastructure should be mapped by function, not platform hype.

- Vercel handles presentation.
- Render handles operation.
- Cloudflare handles boundary.
- Postgres handles memory.
- Doppler handles secrets.
- n8n handles workflow glue.

Infrastructure decisions should be evaluated by function, risk, tenant isolation, observability, cost ownership, rollback path, and secret-management requirements.

## Related Docs

- `docs/infrastructure/DEPLOYMENT_RUNTIME_STANDARD.md`
- `docs/infrastructure/RENDER_RUNTIME_ADAPTER_SPEC.md`
- `docs/security/remote-secret-operations.md`
- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
