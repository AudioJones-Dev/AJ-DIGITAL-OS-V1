# ajdigital.app Product Requirements Document

## Document Control

- Product: ajdigital.app
- Owner: AJ Digital LLC / Audio Jones
- Repo: `C:\dev\AJ-DIGITAL-OS`
- Document type: Git Spec-ready PRD
- Status: Draft for operator review
- Implementation status: Not started from this PRD
- Approval gate: Implementation requires explicit operator approval with `proceed`

## Evidence Basis

### Facts

- `ajdigital.app` and `*.ajdigital.app` are intended for the AJ Digital app and agent surface, while `audiojones.com` is the brand surface.
- The current worktree contains a `dashboard/` Next.js App Router dashboard.
- The dashboard is described as an internal operator dashboard for AJ Digital OS.
- Existing dashboard routes include command center, control plane, governance, runs, agents, app layer, DAG runs, Hermes API, decision engine, opportunities, entities, retrieval, cache, connectors, and system events.
- The architecture docs mark the interface/shell layer as partial.
- Existing docs identify missing surfaces including client portal, diagnostic form, mobile approval surface, agent status monitor, ROI dashboard, and additional dashboard exposure.
- Current persistence remains file-backed in several runtime areas and requires tenant hardening before real multi-tenant production use.
- Communications Intelligence is currently a PRD/spec, not a completed runtime implementation.
- Deliverable and approval routing already has a documented local file-backed model and future approval/publish routing direction.

### Inferences

- `ajdigital.app` should become the authenticated product/app surface for AJ Digital OS, not just a marketing site.
- The public landing page should explain and route into the private app, but should not expose operator or client data.
- The first client portal should be read-heavy and approval-oriented before allowing clients to trigger actions or mutate workflows.
- The existing dashboard should be wrapped, hardened, and extended rather than replaced by a separate unrelated portal.

### Assumptions To Confirm

- AJ Digital wants one canonical product domain: `ajdigital.app`.
- Vercel is the likely hosting target and Cloudflare is the likely DNS/security boundary.
- Supabase or another managed auth/data layer will be selected before production client access.
- The MVP can start as a single Next.js app with host-aware routing rather than separate apps per subdomain.
- Multi-modal means support for text, files, images, voice/transcripts, communications, dashboard events, and AI-agent outputs, not only chat UI.

## Problem

AJ Digital needs an internal agency operating system and client-facing portal at `ajdigital.app`.

Today, AJ Digital OS has meaningful internal runtime foundations: command center, control plane, governance, Hermes, DAG execution, retrieval, cache, attribution, and events. However, the system is not yet packaged as a coherent web product with a public landing page, authenticated admin portal, tenant-safe client portal, project dashboards, communications dashboards, and role-based access.

Without a clear product and subdomain strategy, the build risks:

- exposing internal operator surfaces too early,
- mixing public, internal, and client access in one unclear route tree,
- adding client portal features before tenant isolation is reliable,
- creating another dashboard instead of extending the existing command center,
- scattering communications, projects, deliverables, approvals, and attribution across disconnected UI surfaces,
- building multi-tenant features on top of file-backed stores that are not yet hardened for production.

## Desired Outcome

Create a coherent `ajdigital.app` web platform that supports:

- a public landing page for AJ Digital's app and operating system surface,
- a secure authenticated app shell,
- an internal admin portal,
- an operator command center,
- client and project dashboards,
- a client portal,
- communications intelligence dashboards,
- deliverable review and approval flows,
- tenant-aware data access,
- role-based navigation and authorization,
- future multi-modal project and client operations.

The platform should reuse the existing AJ Digital OS architecture rather than inventing a disconnected SaaS shell.

## Success Criteria

The PRD is successful when it defines:

- public landing scope for `ajdigital.app`,
- subdomain strategy for public, app, admin, command, portal, api, and staging surfaces,
- MVP information architecture,
- role model,
- tenant model,
- internal admin portal requirements,
- command center requirements,
- client portal requirements,
- project dashboard requirements,
- communications dashboard requirements,
- deliverable and approval requirements,
- multi-modal asset and interaction requirements,
- MVP phases,
- implementation gates,
- risks,
- out-of-scope items,
- open questions.

The product build is successful when:

- unauthenticated users can only access public pages,
- authenticated users see navigation appropriate to their role and tenant,
- internal operator routes are inaccessible to clients,
- clients can only view assigned tenant/project data,
- every client-facing record is tenant-scoped,
- project status, tasks, deliverables, approvals, communications, and reports have stable route destinations,
- admin actions are audit-logged,
- mutating actions are policy-gated where required,
- client portal MVP can launch read-only before advanced automation is enabled.

## Scope

In scope for this PRD:

- `ajdigital.app` public landing page strategy.
- Authenticated app shell strategy.
- Subdomain strategy for public, app, admin, command, portal, API, and staging surfaces.
- Internal admin portal requirements.
- Internal command center requirements.
- Client portal requirements.
- Project dashboard requirements.
- Communications dashboard requirements.
- Deliverable and approval flow requirements.
- Role model and permission categories.
- Tenant model and tenant isolation requirements.
- Multi-modal asset and interaction requirements.
- MVP build phases and gates.
- Risks and open questions.

## Out Of Scope

Out of scope for this PRD:

- Code implementation.
- Production deployment.
- DNS changes.
- Secret creation or secret migration.
- Payment or billing implementation.
- Production database migration execution.
- Live connector OAuth setup.
- Automatic outbound messaging.
- Client-triggered autonomous workflow execution.
- Per-client wildcard subdomains.
- White-label custom domains.
- Public exposure of internal command center data.
- Replacement of existing AJ Digital OS runtime architecture.

## Constraints

- Implementation requires explicit operator approval with `proceed`.
- Public routes must not load tenant-private data.
- Client routes must be tenant-scoped server-side.
- Internal command center routes must not be client-facing.
- File-backed runtime stores are acceptable for local/internal development but not sufficient for production multi-tenant client access.
- Mutating actions must preserve existing enforcement, approval, audit, and governance behavior.
- Raw credentials, refresh tokens, bot tokens, session cookies, and client secrets must not be stored in repo files.
- Communications ingestion must respect consent, sensitivity, retention, and source traceability.
- External write actions and CRM/vault writes must be policy-gated.
- The initial implementation must be additive and must not replace Hermes, Control Plane, governance, retrieval, cache, attribution, dashboard, or runtime logic.

## Existing Assets And Prior Work To Reuse

- `dashboard/` Next.js App Router dashboard.
- `dashboard/app/command/page.tsx` command center surface.
- `dashboard/components/Sidebar.tsx` existing dashboard navigation model.
- `dashboard/lib/api.ts` Hermes/dashboard API client layer.
- `dashboard/lib/control-client.ts` control action payload and enforcement helper layer.
- `src/hermes/hermes-status-api.ts` existing Hermes status/API route surface.
- `src/control-plane/` existing control-plane and run governance concepts.
- `src/core/events/` system event ledger.
- `src/core/observability/` metrics snapshot layer.
- `src/attribution/` MAP attribution event pipeline.
- `src/retrieval/` retrieval layer.
- `src/cache/` cache layer.
- `src/connectors/` connector layer direction.
- `src/normalization/` entity normalization direction.
- `docs/architecture/communications-intelligence-layer-spec.md`.
- `docs/architecture/deliverable-and-approval-routing-spec.md`.
- `docs/architecture/task-category-and-folder-spec.md`.
- `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`.
- `docs/architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`.

## Non-Goals

- Do not implement this PRD until explicitly approved.
- Do not expose the current internal dashboard publicly without auth and authorization.
- Do not build per-client wildcard subdomains in MVP.
- Do not add outbound messaging automation in MVP.
- Do not send communications in the operator's name.
- Do not store secrets, tokens, refresh tokens, or client-private credentials in repo files.
- Do not reintroduce Firebase.
- Do not replace Hermes, Control Plane, governance, retrieval, cache, attribution, or dashboard architecture.
- Do not perform production deployment from this PRD.

## Recommended Subdomain Strategy

Use one primary app first, with host-aware routing and shared auth/session policy.

| Host | Surface | Audience | MVP Status | Notes |
|---|---|---:|---|---|
| `ajdigital.app` | Public landing page | Public | Build first | Explains AJ Digital app platform and routes to login/request access. |
| `app.ajdigital.app` | Authenticated app shell | Internal and approved clients | Build first | Main logged-in product shell. |
| `admin.ajdigital.app` | Admin portal | Owner/admin only | Build after auth | Tenant, user, role, policy, connector, audit management. |
| `command.ajdigital.app` | Command center | Internal operators | Alias or rewrite | Host alias to internal command center route. |
| `portal.ajdigital.app` | Client portal | Client users | MVP after tenant hardening | Project status, deliverables, approvals, reports, messages. |
| `api.ajdigital.app` | API/webhook boundary | Systems/integrations | Later | Signed webhooks, integration callbacks, external API. |
| `staging.ajdigital.app` | Staging environment | Internal only | Needed before production | Preview hardening and QA. |
| `docs.ajdigital.app` | Documentation and help | Internal or public-limited | Optional later | Can be deferred until portal content matures. |
| `status.ajdigital.app` | Status page | Public or client-limited | Optional later | Can be third-party or static initially. |

### Deferred Subdomain Pattern

Do not use `client-name.ajdigital.app` in MVP.

Reason: per-client wildcard tenant routing creates branding, SSL, auth, routing, and data-isolation complexity before the product has proven stable tenant boundaries.

Preferred MVP pattern:

- `portal.ajdigital.app/t/{tenantSlug}`
- `app.ajdigital.app/{workspace}`
- auth/session determines the active `tenantId`
- URL tenant slug is only a hint, never the authorization source

Future pattern:

- `client-name.ajdigital.app` only after tenant isolation, custom branding, and domain provisioning are mature.

## Product Surfaces

### Public Landing Page

Route:

- `https://ajdigital.app/`

Purpose:

- Explain what the AJ Digital app platform is.
- Establish the product as the agency command system and client operations portal.
- Route users to login, request access, or view approved public material.

Required sections:

- Product positioning
- What the platform manages
- Who it is for
- Operator command center overview
- Client portal overview
- Project and deliverable visibility
- Communications intelligence overview
- Security and access boundary statement
- Login/request access CTA

Constraints:

- No client-private screenshots.
- No internal system secrets.
- No public claims that imply autonomous client action before governance and approval gates are live.
- No fake production metrics.

### Authenticated App Shell

Host:

- `app.ajdigital.app`

Purpose:

- Shared authenticated shell for internal and client-authorized users.
- Route users based on role, tenant, and allowed modules.

Core shell requirements:

- session-aware layout,
- tenant selector for users with multiple tenants,
- role-aware navigation,
- global command/search later,
- notification center later,
- audit-safe error handling,
- no data fetch without tenant context where tenant data is involved.

### Internal Admin Portal

Host:

- `admin.ajdigital.app`

Primary routes:

- `/admin`
- `/admin/tenants`
- `/admin/users`
- `/admin/roles`
- `/admin/policies`
- `/admin/connectors`
- `/admin/audit`
- `/admin/billing` later

Purpose:

- Manage tenants, users, roles, permissions, connectors, policies, and audit records.

MVP requirements:

- Tenant list and detail view
- User list and role assignment
- Connector status inventory
- Governance policy visibility
- Audit/event browser
- Admin-only route guard

Deferred:

- Billing management
- Self-service tenant provisioning
- Custom domains
- Marketplace-style connector install

### Command Center

Host:

- `command.ajdigital.app`

Internal route:

- `/command`

Purpose:

- Internal operator cockpit for AJ Digital OS.

Existing foundations to preserve:

- system health,
- control runs,
- DAG runs,
- recent events,
- MAP evaluations,
- retrieval docs,
- cache entries,
- module status.

MVP enhancements:

- Operator overview
- Active projects panel
- Pending approvals panel
- Failed or blocked runs panel
- Communications priority panel
- Client risk alerts
- Connector health panel
- Recent deliverables panel

Constraints:

- Internal operators only.
- All mutating actions require existing enforcement and approval behavior.
- Do not make command center a client-facing route.

### Client Portal

Host:

- `portal.ajdigital.app`

Primary routes:

- `/portal`
- `/portal/projects`
- `/portal/projects/[projectId]`
- `/portal/deliverables`
- `/portal/approvals`
- `/portal/messages`
- `/portal/reports`
- `/portal/settings`

Purpose:

- Give clients a focused view of their work, deliverables, approvals, communication summaries, and reports.

MVP requirements:

- Client dashboard
- Assigned project list
- Project detail
- Deliverable list
- Deliverable detail
- Approval/revision action for allowed deliverables
- Report view
- Client-safe messages or communications summaries
- Client-safe account settings

MVP access model:

- client users cannot see internal run logs by default,
- client users cannot see global system events,
- client users cannot see other tenants,
- client users cannot trigger autonomous workflows unless a policy explicitly allows it,
- client-facing data must include `tenantId`.

Deferred:

- Client-created tasks
- Client-triggered automations
- File upload to production storage
- Custom branding per tenant
- White-label domains
- In-app billing

### Project Dashboard

Primary routes:

- `/projects`
- `/projects/[projectId]`
- `/clients`
- `/clients/[clientId]`

Purpose:

- Manage internal and client projects from one operational surface.

MVP entities:

- Tenant
- Client
- Project
- Task
- Milestone
- Deliverable
- Approval
- CommunicationThread
- Report
- RunReference

MVP dashboard panels:

- project status,
- milestone status,
- active tasks,
- blocked tasks,
- pending approvals,
- latest deliverables,
- latest communications,
- linked runs,
- linked system events,
- notes and next actions.

### Communications Dashboard

Primary routes:

- `/comms`
- `/comms/digest`
- `/comms/threads`
- `/comms/follow-ups`
- `/comms/sources`

Purpose:

- Surface daily communications intelligence and follow-up priorities across email, phone, SMS, DMs, chat sessions, meetings, and CRM notes.

MVP requirements:

- Read-only communications digest first
- Priority-ranked follow-ups
- Thread list
- Source/channel labels
- Participant and tenant linkage
- Next action extraction
- Review status
- CRM/vault write status later

Constraints:

- Raw payloads must not be exposed broadly.
- Mutating CRM or vault writes require policy gates.
- Call recordings/transcripts require consent and retention policy.
- Browser scraping is not an MVP source.
- Automatic outbound replies are out of scope.

### Deliverables And Approvals

Primary routes:

- `/deliverables`
- `/deliverables/[deliverableId]`
- `/approvals`
- `/approvals/[approvalId]`

Purpose:

- Manage client-facing and internal deliverable review.

MVP requirements:

- Deliverable registry view
- Status filtering: draft, pending approval, approved, published, failed, archived
- Client-safe preview
- Internal metadata panel
- Approval action
- Revision request action
- Publish-readiness indicator
- Audit trail

Constraints:

- Current deliverable routing is local/file-backed and should remain compatible.
- Live publish adapters are out of scope for MVP.
- Client users see only approved or pending-client-review artifacts assigned to their tenant.

## Proposed Plan

Recommended plan:

1. Review and approve this PRD.
2. Confirm auth provider, production database direction, and DNS/hosting plan.
3. Build Phase 1 only: public landing page and authenticated app shell.
4. Add tenant, role, and route-guard foundation.
5. Wrap the existing command center in the authenticated internal app boundary.
6. Build internal project/client dashboard surfaces.
7. Build read-only client portal MVP.
8. Add approval/revision actions for deliverables.
9. Add communications dashboard once approved source policies and data contracts are ready.
10. Complete production hardening before client production access.

## Role Model

### Roles

| Role | Scope | Description |
|---|---|---|
| `owner` | global | Full AJ Digital control. Can manage all tenants, users, policies, connectors, and command center actions. |
| `admin` | global or tenant | Administrative access scoped by assignment. |
| `operator` | internal | Can manage projects, runs, approvals, deliverables, and client work within assigned scope. |
| `strategist` | internal | Can view and update strategy, communications summaries, projects, reports, and recommendations. |
| `producer` | internal | Can manage deliverables, tasks, assets, and review queues. |
| `client_admin` | tenant | Client-side admin for one tenant. Can view assigned projects, users, deliverables, approvals, and reports. |
| `client_member` | tenant | Client user with assigned project and deliverable access. |
| `viewer` | tenant or project | Read-only user. |
| `integration_service` | system | Non-human service identity for connector and webhook operations. |

### Permission Categories

- view public
- view tenant
- view project
- view deliverable
- review deliverable
- approve deliverable
- request revision
- manage project
- manage tenant
- manage user
- manage connector
- view audit
- run command
- approve command
- mutate external system

### Authorization Rules

- Role is necessary but not sufficient; tenant/project assignment is also required.
- Client users are denied access to internal command center routes.
- Internal users still require explicit tenant context before viewing client-private data.
- Service identities must be scoped to connector actions and audited.
- Public routes must not load tenant data.

## Tenant Model

### Tenant Types

| Type | Description |
|---|---|
| `internal` | AJ Digital's own operating tenant. |
| `client` | External client account. |
| `sandbox` | Demo/testing tenant with non-production data. |
| `partner` | Future partner or collaborator workspace. |

### Required Tenant Fields

- `tenantId`
- `tenantSlug`
- `tenantType`
- `displayName`
- `status`
- `primaryOwnerUserId`
- `allowedDomains`
- `branding`
- `policyProfileId`
- `createdAt`
- `updatedAt`

### Tenant Statuses

- `draft`
- `active`
- `paused`
- `offboarding`
- `archived`

### Tenant Isolation Requirements

- Every client-facing record must include `tenantId`.
- Tenant isolation must be enforced at the data access layer, not only UI filtering.
- URL slugs must never be trusted as authorization.
- Cross-tenant reads must be denied by default.
- Internal global views must require owner/admin/operator permission and audit trail.
- File-backed runtime stores must be migrated or wrapped with tenant-safe access before production client access.

## Multi-Modal Requirements

The platform should support multiple information modes over time:

- text: tasks, notes, reports, summaries, decisions,
- files: deliverables, briefs, exports, attachments,
- images: design assets, screenshots, creative deliverables,
- audio/transcripts: calls, meetings, voice notes where consent policy allows,
- communications: email, SMS, DMs, CRM notes, chat session exports,
- runtime events: control runs, DAG runs, system events, attribution events,
- AI outputs: recommendations, summaries, proposals, diagnostics, reports.

MVP handling:

- Treat all non-text assets as metadata plus safe file references.
- Do not build production file upload until storage, access control, scanning, retention, and tenant policy are defined.
- Do not expose raw call/audio/transcript material to clients without consent policy and review.

## Data And Persistence Strategy

### MVP Direction

Use the current file-backed runtime for local/internal development only. For client-facing multi-tenant production, define a database-backed model before portal launch.

Recommended production targets:

- Postgres/Neon or Supabase Postgres for tenants, users, projects, tasks, deliverables, approvals, reports, and audit records.
- Object storage for files and assets.
- Redis or managed cache for idempotency/cache where needed.
- Event/log storage for high-volume system and attribution events.

### Required Core Tables Or Collections

- tenants
- users
- tenant_memberships
- roles
- permissions
- projects
- project_memberships
- tasks
- deliverables
- approvals
- reports
- communication_threads
- communication_messages or summaries
- connector_accounts
- audit_events
- run_references
- notification_events

## Information Architecture

### Public

- `/`
- `/login`
- `/request-access`
- `/privacy`
- `/terms`
- `/status` later

### Internal

- `/command`
- `/admin`
- `/projects`
- `/clients`
- `/tasks`
- `/deliverables`
- `/approvals`
- `/comms`
- `/reports`
- `/runs`
- `/agents`
- `/connectors`
- `/governance`
- `/events`
- `/settings`

### Client

- `/portal`
- `/portal/projects`
- `/portal/deliverables`
- `/portal/approvals`
- `/portal/messages`
- `/portal/reports`
- `/portal/settings`

## MVP Phases

### Phase 0: PRD And Architecture Approval

Deliverables:

- This PRD reviewed and approved.
- Subdomain map approved.
- Auth/data provider selected.
- Tenant model approved.
- MVP route map approved.

Exit criteria:

- Operator says `proceed`.

### Phase 1: Public Landing And Auth Shell

Deliverables:

- `ajdigital.app` landing page.
- Login/request access route.
- Authenticated app shell.
- Role-aware navigation stub.
- No client-private data exposed.

Exit criteria:

- Public routes load without auth.
- Private routes require auth.
- No admin/client portal functionality is exposed without role checks.

### Phase 2: Tenant And Role Foundation

Deliverables:

- Tenant model.
- User membership model.
- Role and permission model.
- Route guards.
- Tenant selector.
- Admin tenant/user list.

Exit criteria:

- Client user cannot access internal command routes.
- Internal user cannot view client tenant data without assignment or elevated permission.
- Tenant id is enforced server-side.

### Phase 3: Internal Project Command Center

Deliverables:

- Internal projects dashboard.
- Client index.
- Project detail page.
- Task/milestone panels.
- Deliverables and approvals panels.
- Existing command center linked into the app shell.

Exit criteria:

- Operators can inspect client/project state from a single command center surface.
- Existing dashboard functionality remains intact.

### Phase 4: Client Portal Read-Only MVP

Deliverables:

- Client portal dashboard.
- Client project view.
- Deliverables view.
- Reports view.
- Client-safe communications summary.

Exit criteria:

- Client user only sees assigned tenant/project records.
- No client can access internal run logs, global events, or other tenants.

### Phase 5: Client Approvals And Revision Requests

Deliverables:

- Approval queue.
- Deliverable approval action.
- Revision request action.
- Audit trail.
- Notification stubs.

Exit criteria:

- Approval actions are policy-gated and audited.
- Deliverable status transitions are valid and reversible where possible.

### Phase 6: Communications Intelligence Dashboard

Deliverables:

- Communications digest.
- Thread browser.
- Follow-up queue.
- Source status panel.
- Review workflow.

Exit criteria:

- No raw secret or sensitive payload is exposed.
- Summaries link back to source references.
- Mutating CRM/vault writes remain gated.

### Phase 7: Production Hardening

Deliverables:

- Production database migration.
- Audit logging.
- Rate limiting.
- Error handling.
- Monitoring.
- Staging environment.
- Backup/rollback plan.
- Deployment runbook.

Exit criteria:

- Production readiness checklist is complete.
- Staging smoke test passes.
- Operator approves production deployment.

## Security And Governance Requirements

- Auth is required for all non-public routes.
- Role checks must happen server-side.
- Tenant checks must happen at data access boundaries.
- Mutating actions must be audited.
- High-risk actions must use approval gates.
- Connector actions must declare risk level.
- Secrets must be stored outside git-controlled files.
- Client-private data must not be logged in public or global logs.
- Raw communications must have source references, retention policy, and sensitivity labels.
- External webhooks must be signed before mutation.
- Production deploys require explicit operator approval.

## UX Requirements

### Public Landing

- Clear first-viewport signal: AJ Digital app platform.
- Primary action: login or request access.
- Avoid generic SaaS claims.
- Explain command center, client portal, project visibility, and communications intelligence in plain language.

### Internal App

- Dense, operational, dashboard-first UI.
- Fast scanning of clients, projects, tasks, approvals, events, and blocked work.
- No marketing-style hero inside authenticated dashboards.
- Route labels should match operator workflows.

### Client Portal

- Calm and focused.
- Show what matters: status, next action, deliverables, approvals, reports, messages.
- Avoid exposing internal implementation details.
- Use client-safe language.

## Analytics And Outcome Metrics

MVP metrics:

- public landing visits,
- login attempts,
- active users,
- active tenants,
- active projects,
- pending approvals,
- approval turnaround time,
- deliverables by status,
- blocked projects,
- communication follow-ups by priority,
- report views.

Later outcome metrics:

- revenue influenced,
- spend reduced,
- time saved,
- follow-up completion rate,
- client response latency,
- workflow profitability,
- MAP score correlation to outcomes.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Exposing internal dashboard too early | Client data or runtime details could leak | Require auth, roles, tenant checks, and separate client-safe portal routes. |
| Tenant isolation is incomplete | Cross-client data exposure | Enforce tenant access in data layer before client portal launch. |
| File-backed stores are used in production | Fragile scaling and weak isolation | Migrate core client-facing records to Postgres before production client access. |
| Communications automation overreaches | Privacy, consent, and trust issues | Start read-only, summarize with source refs, gate all writes. |
| Subdomain sprawl | Maintenance and auth complexity | Start with core subdomains and host-aware routing. |
| Client portal becomes a second product | Duplicate dashboard logic | Reuse shared entities, permissions, and components. |
| Admin actions lack auditability | Operational risk | Audit every mutating admin and approval action. |
| Public landing overpromises | Brand and trust risk | Only claim capabilities that are live or clearly marked as platform direction. |

## Open Questions

1. Which auth provider should be used: Supabase Auth, Clerk, Auth0, NextAuth, or another option?
2. Which production database should be canonical: Supabase Postgres, Neon, or another Postgres host?
3. Should `admin.ajdigital.app` and `command.ajdigital.app` be separate deployments or host rewrites into one app?
4. Should client users be invited manually in MVP or request access through a form?
5. What is the first real client tenant to model, or should MVP start with a sandbox tenant only?
6. What client-facing labels should be used: Client Portal, Command Portal, Client Workspace, or another name?
7. Which communications sources are approved for MVP: Gmail, manual imports, call transcripts, SMS exports, CRM notes, or chat exports?
8. What storage provider should hold deliverable files and client-safe assets?
9. What approval statuses and transition rules should clients be allowed to trigger?
10. What public positioning should `ajdigital.app` use relative to `audiojones.com`?
11. What level of white-labeling is required in the first 90 days?
12. Should billing be part of the app roadmap or kept outside the MVP?

## Recommended Immediate Next Step

Approve or revise this PRD before implementation.

If approved, the first implementation task should be:

```txt
Build Phase 1 only: public ajdigital.app landing page plus authenticated app shell scaffold. Do not build client portal features yet. Preserve the existing dashboard architecture and add route/auth boundaries without changing Hermes, Control Plane, governance, retrieval, cache, attribution, or runtime logic.
```
