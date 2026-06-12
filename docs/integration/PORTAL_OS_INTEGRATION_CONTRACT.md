# Portal ↔ AJ Digital OS Integration Contract (v1)

**Status:** DRAFT — pending operator approval. No implementation until this document is approved (merge of its PR = approval).
**Scope:** `aj_client_portal_system` (clientportal.ajdigital.app, Clerk + portal Supabase) ⇄ AJ-DIGITAL-OS (this repo).
**Date:** 2026-06-12

## 0. Governing rule

```txt
Portal owns identity and client-facing engagement.
OS owns operations, workflow execution, diagnostics, offers, attribution, and normalized intelligence.
```

Integration is **contract-based (events + projections), never shared-database**. The two Supabase projects remain separate. The legacy Firebase booking platform (`audiojones-admin`/`-client`) is OUT of scope for v1 (pending retire-vs-separate-business decision).

`approval` is **dual-domain**:
- OS approval = execution/control-plane gate (RunRecord.approvalStatus).
- Portal approval = client-facing consent/decision artifact (`approval_requests`).
- Bridge = the immutable `portal.approval_decided` event carrying `portalApprovalId` and optional `osApprovalId`/`workflowRunId`. OS resolves its gate only after HMAC validation of that event.

---

## 1. Portal Supabase schema mapping (portal-owned records)

| Portal table | Ownership | Notes |
|---|---|---|
| `tenants`, `app_users` | **PORTAL** (Clerk-bound identity root) | OS receives `portal.tenant_created` / `portal.client_created` and mirrors via `normalizeTenant()` / `normalizeContact()` |
| `clients` | **PORTAL** (profile/presentation) | OS normalized copy keyed by `portalTenantId` |
| `projects`, `milestones` | **PORTAL** | OS notified via events; no OS write-back |
| `approval_requests` | **PORTAL** (client-facing artifact) | Dual-domain bridge per §0; row may carry `os_approval_id`, `os_workflow_run_id` columns (nullable FKs-by-convention, added in portal migration 0002) |
| `deliverables`, `reports` | **PORTAL** (presentation) | `os.report_ready` creates/updates `reports` rows via sync worker |
| `support_requests` | **PORTAL** | emits `portal.support_request_created` |
| `integrations` | **PORTAL** (status display) | emits `portal.activity_logged` on change |
| `business_memory_records`, `activity_logs` | **PORTAL** | activity high-signal subset emitted as `portal.activity_logged` |
| `attribution_events` | **⚠️ becomes a PROJECTION** | Deprecate portal writes; superseded by `os_attribution_event_projection` (§6). Existing seed rows remain display-only |

**New projection tables (portal migration 0002 — names are normative):**

```txt
os_workflow_run_projection
os_attribution_event_projection
os_diagnostic_projection
os_offer_projection
```

Common projection columns: `id uuid pk`, `tenant_id uuid not null`, `os_source_id text not null unique`, `payload jsonb not null`, `os_updated_at timestamptz not null`, `synced_at timestamptz not null default now()`, plus per-table typed display columns as needed. **Projections are read-models. Nothing in the portal app may write them.** (Enforced by RLS, §8.)

## 2. OS endpoint/webhook mapping (OS-owned records)

| Surface | Direction | Record types | Status |
|---|---|---|---|
| `POST /api/events/intake` | portal → OS | all `portal.*` events | **NEW** (P2). Reuses the existing HMAC middleware from `src/security/webhook-signature.ts` |
| `POST` approval webhook (`src/api/approval-webhook.ts`) | portal → OS (via intake mapping) | OS approval gate resolution | EXISTS; intake maps `portal.approval_decided` → `ApprovalResolver` when `osApprovalId` present |
| Projection sync worker | OS → portal Supabase | `os.workflow_run_*`, `os.attribution_event_recorded`, `os.diagnostic_completed`, `os.offer_created` | **NEW** (P4). Server-to-server, portal service-role key |
| `os.approval_required` handler | OS → portal Supabase | creates `approval_requests` row (status `pending`, carries `os_approval_id`, `os_workflow_run_id`) | **NEW** (P4) |
| `os.report_ready` handler | OS → portal Supabase | creates `reports` row with R2 artifact URL | **NEW** (P4) |
| Hermes API `:7420` | — | — | **NOT a portal surface.** Unauthenticated; stays private. Never expose via tunnel/Vercel |

## 3. Event payload schemas

**Envelope (all events, both directions):**

```jsonc
{
  "eventId": "uuid v4",            // idempotency key (§5)
  "eventType": "portal.approval_decided",
  "schemaVersion": 1,
  "occurredAt": "ISO-8601 UTC",
  "tenantId": "uuid",              // PORTAL tenant id — canonical tenant key both sides
  "actor": { "type": "client_user | operator | system", "id": "clerk user id | agent id" },
  "data": { /* per-family, below */ }
}
```

**Portal-emitted families (canonical list):**

| eventType | data (required fields) |
|---|---|
| `portal.tenant_created` | `tenantId, name, plan` |
| `portal.client_created` | `clientId, tenantId, companyName, primaryContactEmail` |
| `portal.project_created` | `projectId, name, phase, objective` |
| `portal.milestone_updated` | `milestoneId, projectId, title, done, dueDate` |
| `portal.deliverable_submitted` | `deliverableId, category, status, title` |
| `portal.report_published` | `reportId, period, title` |
| `portal.support_request_created` | `supportRequestId, type, priority, subject` |
| `portal.approval_decided` | `portalApprovalId, decision (approved\|changes_requested\|rejected), approvalType, riskLevel, decidedBy` + optional `osApprovalId`, `workflowRunId`, `note` |
| `portal.activity_logged` | `activityId, kind, message, projectId?` |

**OS-emitted families:**

| eventType | data (required fields) |
|---|---|
| `os.workflow_run_created` | `runId, workflowId, taskType, status` |
| `os.workflow_run_updated` | `runId, status, approvalStatus, updatedAt` (+ `errors[]`, `warnings[]` when present) |
| `os.diagnostic_completed` | `diagnosticId, runId?, category, summary, findingsCount` |
| `os.offer_created` | `offerId, leadRef, summary, validUntil` (pricing detail stays in OS; projection holds display summary) |
| `os.attribution_event_recorded` | `attributionId, label, value, unit, period` — `label` maps onto portal `AttributionLabel` enum |
| `os.approval_required` | `osApprovalId, runId, approvalType, title, summary, riskLevel, dueAt?` |
| `os.approval_resolved` | `osApprovalId, runId, resolution, resolvedBy, portalApprovalId?` |
| `os.report_ready` | `reportRef, period, title, artifactUrl (R2 public URL)` |

Unknown fields are ignored (forward-compatible); unknown `eventType` → accepted, logged, dead-lettered (never 4xx — prevents producer retry storms). `schemaVersion` bumps are additive-only within v1.

## 4. HMAC signing contract

Identical to the proven OS webhook scheme (`src/security/webhook-signature.ts`):

- Headers: `x-aj-signature`, `x-aj-timestamp` (unix seconds), `x-aj-nonce`, `x-aj-webhook-id`.
- Signature: `HMAC-SHA256(secret, "{timestamp}.{nonce}.{rawBody}")`, hex-encoded.
- Skew window: `AJ_WEBHOOK_MAX_SKEW_SECONDS` (default 300). Nonce replay rejected within TTL (`AJ_WEBHOOK_REPLAY_TTL_SECONDS`, default 600).
- **Distinct secrets per direction** (env names only): `PORTAL_TO_OS_WEBHOOK_SECRET` (portal signs, OS verifies). OS→portal direction needs no webhook secret in v1 (direct service-role writes), but reserve `OS_TO_PORTAL_WEBHOOK_SECRET` for a future portal intake endpoint.
- Failure semantics (inherited from existing webhooks): missing headers → 400, bad signature → 401, replay → 409, malformed payload → 422, internal → 500.

## 5. Idempotency

- `eventId` is the idempotency key, end to end.
- OS intake: durable processed-set keyed `intake:{eventId}` (Redis `SETNX` + 7-day TTL) **plus** permanent event log row (Neon `portal_events` table: eventId pk, type, tenantId, receivedAt, payload, outcome). Duplicate delivery → `200 {"duplicate": true}` — never an error, so producers can retry blindly.
- Projection writes: natural idempotency via upsert on `os_source_id`; stale-update guard: apply only if incoming `os_updated_at` ≥ stored value.
- Approval bridge: resolving an already-resolved OS approval via a duplicate `portal.approval_decided` is a no-op success (the existing `ApprovalResolver` 422 on invalid-state is mapped to `duplicate:true` when the recorded resolution matches).

## 6. Projection refresh rules

- **Push-based**: the OS sync worker upserts on every relevant OS event (target lag ≤ 60s).
- Upsert key `os_source_id`; monotonic `os_updated_at` guard (§5); deletions are soft (status field), never row deletes.
- **Full resync command** (operational recovery): `npm run sync:projections -- --tenant <tenantId> [--table <name>] --full` — truncates and rebuilds that tenant's projection rows from OS stores. Safe at any time because projections are read-models.
- `synced_at` staleness is monitorable; alert if max-lag > 15 min while OS emits events (Prometheus metric `portal_projection_lag_seconds` via existing `/metrics`).

## 7. Backfill / migration plan

1. Portal migration `0002`: add projection tables + `os_approval_id`/`os_workflow_run_id` columns on `approval_requests` + RLS policies (§8). Additive only; zero impact on seed mode.
2. **Default posture: start-from-now.** No historical OS run backfill in v1 — OS data predates portal tenancy and lacks portal `tenantId` mapping.
3. Tenant linkage: a one-time mapping table in OS (`portalTenantId ↔ OS clientId`) seeded manually per onboarded tenant; events for unmapped tenants are accepted and dead-lettered for later replay.
4. **Demo-tenant guard:** the portal's "Florida Ramp & Lift" seed tenant is excluded by tenantId blocklist in both the portal emitter and OS intake — seed data must never enter OS attribution.
5. Portal seed→live cutover happens per-page, per-tenant, after P4 projections carry real data (existing portal DAL already supports the dual mode).

## 8. Security / RLS requirements

- **Projections RLS (portal Supabase):** `SELECT` policy `tenant_id = current_tenant_id()` (same as existing tables); **no INSERT/UPDATE/DELETE policies at all** — writes possible only via service role (the OS sync worker). This is what mechanically prevents future agents treating projections as writable.
- `approval_requests` keeps its existing client-update policy (decide only); the new `os_*` columns are set only by service role.
- Secrets (names only, values via env/secret manager, never committed): `PORTAL_TO_OS_WEBHOOK_SECRET`, `PORTAL_SUPABASE_URL`, `PORTAL_SUPABASE_SERVICE_ROLE_KEY` (held by OS sync worker only), reserve `OS_TO_PORTAL_WEBHOOK_SECRET`.
- The portal browser bundle never holds any OS secret; all portal→OS emission happens in server actions / route handlers.
- OS `/api/events/intake` is reachable only via the existing Cloudflare tunnel hostname allocated for it (future `events.ajdigital.app`, Access-protected or signature-only — decision at P2) — never via the unauthenticated `:7420` API.
- Pre-existing flags this contract inherits but does not fix (tracked separately): Hermes `:7420` unauthenticated on LAN; legacy `audiojones-client` `/api/internal/events` auth stub on a public deployment; portal Clerk **test** keys exposed in a session transcript (rotate at convenience).

## 9. Approval & change control

- Approval of this contract = merge of its PR into `main` (HUMAN_REQUIRED per governance kernel).
- Changes after approval: append-versioned (`v1.1`, `v2`) — no silent edits.
- Implementation phases P2–P5 (defined in the 2026-06-12 diagnosis report) each remain individually gated.
