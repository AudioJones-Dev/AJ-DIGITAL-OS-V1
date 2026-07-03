# AJ Digital OS CRM Schema Alignment

**Status:** architecture alignment audit
**Date:** 2026-07-03
**Owner:** AJ Digital OS engineering
**Scope:** compare existing AJ Digital OS CRM/client/project/deliverable schema surfaces against the `audiojones-clean` handoff contract
**Decision level:** documentation only. No endpoint, migration, runtime wiring, CRM sync, n8n workflow, HubSpot sync, UI, storage, or production change is authorized by this document.

## Decision Summary

AJ Digital OS already has most of the right canonical ownership surfaces for the `audiojones-clean` handoff:

- tenant-scoped CRM tables
- CRM service contracts
- contact, lead, and opportunity persistence
- CRM audit and attribution hooks
- client, mission, mission run, deliverable, and asset schema surfaces
- deliverable lifecycle states and approval transitions
- tenant context and RLS binding helpers

The current implementation does not yet fully satisfy the handoff contract.

The missing layer is not another CRM table set. The missing layer is an intake and alignment layer:

```txt
signed website event
-> idempotent intake record
-> tenant resolution
-> consent/suppression validation
-> create/link CRM objects through existing service contracts
-> emit audit/attribution
-> return receipt/projection
```

Hard rule:

Do not duplicate CRM, client, project, onboarding, deliverable, or reporting truth in `audiojones-clean`, n8n, HubSpot, or a new sidecar schema. Extend AJ Digital OS where the operational concept already belongs.

## Source Documents And Surfaces Inspected

Contract source:

- `origin/main:docs/architecture/AUDIOJONES_CLEAN_HANDOFF_CONTRACT.md`

AJ Digital OS docs:

- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`
- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md`
- `docs/integration/PORTAL_OS_INTEGRATION_CONTRACT.md`
- `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`
- `docs/architecture/deliverable-and-approval-routing-spec.md`
- `docs/architecture/deliverable-approval-lifecycle-spec.md`

AJ Digital OS schema/code:

- `supabase/migrations/20260626150000_crm_multitenant_rls.sql`
- `sql/supabase-schema.sql`
- `sql/neon-os-schema.sql`
- `src/crm/crm-types.ts`
- `src/crm/crm-store.ts`
- `src/crm/crm-service.ts`
- `src/crm/crm-schemas.ts`
- `src/crm/persistent-crm-store.ts`
- `src/crm/postgres-crm-store.ts`
- `src/crm/crm-audit.ts`
- `src/crm/crm-attribution.ts`
- `src/crm/tenant-context.ts`
- `src/db/crm-tenant-context.ts`
- `src/types/deliverable.types.ts`
- `src/core/deliverable-store.ts`
- `src/services/runtime/deliverable-lifecycle.ts`

## Current Branch State

Local branch at time of this audit:

```txt
feat/crm-go-live-cli
```

Known dirty local file intentionally excluded from this audit:

```txt
data/memory/shared/failures.jsonl
```

That file is runtime/memory state and must not be bundled with architecture documentation.

## Alignment Verdict

| Contract area | Current support | Verdict |
| --- | --- | --- |
| Event-based integration, no shared DB | Portal contract establishes doctrine | Satisfied as doctrine, not implemented for website |
| Signed website intake | HMAC style exists elsewhere, no website-specific intake | Missing |
| Idempotency and dead-letter | No website handoff event log found | Missing |
| Tenant resolution | `CrmTenantContext`, `crm_tenants`, and RLS context exist | Partial |
| Contact intake | Types, schemas, stores, service, DB table exist | Mostly satisfied |
| Company intake | Type and DB table exist, service/store methods are missing | Partial |
| Lead intake | Types, schemas, stores, service, DB table exist | Mostly satisfied |
| Opportunity intake | Types, schemas, stores, service, DB table exist | Mostly satisfied |
| Source reference mapping | DB metadata exists, TS service/store does not expose it | Partial |
| Consent/suppression | `consentStatus` exists on contacts | Partial |
| Audit | CRM audit exists for CRM object actions only | Partial |
| Attribution | CRM service emits attribution for CRM writes | Partial |
| Client/project/onboarding | `clients`, `missions`, `mission_runs` exist; project boundary unresolved | Partial |
| Deliverables/reports | Deliverable lifecycle and SQL surfaces exist | Partial |
| Storage references | Asset/deliverable schema and R2 client surfaces exist | Partial |
| HubSpot boundary | CRM module is OS-native; HubSpot not canonical | Satisfied as doctrine |

## Existing Schema That Satisfies The Contract

### Tenant And CRM Foundation

The CRM migration defines tenant-scoped operational tables:

- `crm_tenants`
- `crm_tenant_memberships`
- `crm_tenant_settings`
- `crm_tenant_module_flags`
- `crm_companies`
- `crm_contacts`
- `crm_leads`
- `crm_pipelines`
- `crm_pipeline_stages`
- `crm_opportunities`
- `crm_tasks`
- `crm_notes`
- `crm_activities`
- `crm_agent_configs`
- `crm_agent_run_refs`
- `crm_connector_accounts`
- `crm_connector_credentials`
- `crm_knowledge_items`
- `crm_memory_index`
- `crm_attribution_events`
- `crm_audit_events`
- `crm_approval_refs`

These tables align with the handoff contract's requirement that AJ Digital OS own CRM and operational truth.

### Tenant Isolation

Existing support:

- CRM records use `tenantId` in TypeScript.
- CRM database tables use `tenant_id`.
- CRM tables use composite tenant-leading primary keys.
- RLS helper functions use `app.tenant_id`, `app.actor_id`, `app.actor_type`, and `app.platform_admin_mode`.
- `withTenantContext(...)` binds tenant settings inside a transaction on a checked-out connection.
- `resolveCrmTenantContext(...)` enforces explicit tenant context by actor type.

This satisfies the handoff doctrine that every operational write must resolve `tenantId` before mutation.

### Contact, Lead, And Opportunity Services

Existing service and store support:

- `CrmService.createContact(...)`
- `CrmService.updateContact(...)`
- `CrmService.createLead(...)`
- `CrmService.updateLead(...)`
- `CrmService.createOpportunity(...)`
- `CrmService.updateOpportunity(...)`
- `PersistentCrmStore`
- `PostgresCrmStore`

Existing behavior:

- validates records with Zod schemas
- asserts record tenant matches context
- writes tenant-scoped records
- translates duplicate ID conflicts
- emits CRM audit events
- emits CRM attribution events
- enforces approval policy for selected CRM actions

This is the correct service boundary for a future website handoff adapter. The adapter should not write directly to SQL tables.

### Client, Mission, Deliverable, And Asset Surfaces

Existing SQL surfaces include:

- `clients`
- `missions`
- `mission_runs`
- `deliverables`
- `assets`

Existing deliverable code includes:

- `DeliverableRecord`
- `DeliverableStore`
- `DeliverableLifecycleService`
- lifecycle states: `draft`, `pending_approval`, `approved`, `published`, `failed`, `archived`
- valid primary transitions: `draft -> pending_approval -> approved -> published`

These surfaces align with the contract's downstream operational lifecycle, but they do not yet define a website handoff path from CRM opportunity into client/project/onboarding/deliverable work.

## Existing Schema That Partially Satisfies The Contract

### Company Support

The DB migration defines `crm_companies`, and `CrmContact` / `CrmLead` / `CrmOpportunity` can reference `companyId`.

Gap:

- `CrmStore` does not expose company CRUD methods.
- `CrmService` does not expose company create/link/update methods.
- `CrmSchemas` does not currently validate `CrmCompany` even though `CrmCompany` exists as a type.
- `PostgresCrmStore` does not map `crm_companies`.

Implication:

A website handoff can carry company data, but future code cannot yet create/link companies through the canonical service boundary.

Required direction:

Add company support to the existing CRM service/store contracts before website intake tries to map `lead.companyName` or `lead.companyDomain` into canonical CRM company records.

### Source References And Metadata

The SQL migration includes `metadata jsonb` on CRM tables.

Gap:

- TypeScript CRM types do not expose metadata on contact, lead, or opportunity records.
- `PostgresCrmStore` does not select, insert, update, or return metadata fields.
- `PersistentCrmStore` does not persist metadata for source references.

Implication:

The handoff contract needs durable source references such as:

- `sourceSystem`
- `sourceEventId`
- `sourceLeadId`
- `diagnosticSessionId`
- `diagnosticResultId`
- `sourceRoute`
- `recommendedOffer`
- `handoffReason`

These should not become separate duplicate lead tables. They should live as structured metadata or explicit source-reference tables attached to OS-owned CRM records.

Required direction:

Approve one of two patterns before implementation:

1. Add typed `metadata` to CRM objects and store source references there.
2. Add a dedicated `crm_source_refs` / `crm_external_refs` table keyed by `tenant_id`, object type, object ID, source system, and source ID.

The second pattern is cleaner for idempotency and lookup.

### Consent And Suppression

Existing support:

- `CrmContact.consentStatus`
- DB `crm_contacts.consent_status`
- allowed statuses: `unknown`, `opted_in`, `opted_out`

Gap:

- No separate suppression table exists.
- No consent event history exists.
- No policy is defined for `suppressionStatus` from website payloads.
- No adapter maps website `consentToContact` into CRM consent semantics.

Required direction:

For Phase 1 intake, map:

| Website input | CRM behavior |
| --- | --- |
| `consentToContact = true` and not suppressed | `consentStatus = opted_in` |
| `consentToContact = false` | `consentStatus = opted_out` or review-only lead depending on approved policy |
| `suppressionStatus = suppressed` | block outbound automation and require review |
| missing consent | default to `unknown` and block outbound automation |

Do not create outbound tasks from suppressed or non-consented records.

### Audit Events

Existing support:

- `crm_contact_created`
- `crm_contact_updated`
- `crm_lead_created`
- `crm_lead_updated`
- `crm_opportunity_created`
- `crm_opportunity_updated`
- `crm_approval_required`
- `crm_action_blocked`

Gap:

The handoff contract needs audit events for intake lifecycle:

- `website_handoff_received`
- `website_handoff_accepted`
- `website_handoff_rejected`
- `website_handoff_needs_review`
- `tenant_resolution_failed`
- `handoff_duplicate_ignored`

Current `CrmAuditObjectType` is limited to:

- `contact`
- `lead`
- `opportunity`

Required direction:

Do not overload CRM object audit events to represent intake lifecycle. Add an intake audit/event layer or extend audit types after the intake model is approved.

### Attribution Events

Existing support:

- CRM service calls `emitCrmAttribution(...)`.
- CRM attribution maps object writes to general attribution events.
- DB migration includes `crm_attribution_events`.

Gap:

- Current emitted attribution uses generic `entity_normalized` / `entity_updated` mapping.
- Handoff-specific attribution families are not typed yet.
- There is no guaranteed link from website source IDs to CRM attribution events.

Required direction:

Add handoff-specific attribution semantics only after source-reference mapping is approved.

Minimum future attribution events:

- `website_lead_captured`
- `diagnostic_completed`
- `website_handoff_accepted`
- `lead_source_classified`
- `lead_scored`
- `lead_qualified`
- `opportunity_created`
- `opportunity_won`

## Missing Schema Needed For The Handoff Contract

### 1. Website Intake Event Log

Current status:

No dedicated website handoff intake event log was found.

Needed:

```txt
website_handoff_events
```

Purpose:

- store accepted event envelope metadata
- preserve safe payload snapshot or redacted payload
- support replay/debugging
- provide immutable audit trail before CRM writes

Suggested fields:

- `event_id`
- `event_type`
- `schema_version`
- `source_system`
- `environment`
- `occurred_at`
- `received_at`
- `correlation_id`
- `source_lead_id`
- `diagnostic_session_id`
- `diagnostic_result_id`
- `tenant_id`
- `status`
- `payload_redacted`
- `error_code`
- `error_message`

### 2. Idempotency Store

Current status:

CRM tables prevent duplicate object IDs inside a tenant, but the handoff contract needs event-level idempotency before CRM writes.

Needed:

```txt
website_handoff_idempotency_keys
```

or equivalent event log uniqueness.

Required keys:

- `event_id`
- `source_system`
- `source_lead_id`
- `diagnostic_session_id`
- `tenant_id` after resolution

Do not rely only on `crm_leads.lead_id`, because the website source lead ID may not be the same as the canonical OS CRM lead ID.

### 3. Dead-Letter / Review Queue

Current status:

No handoff dead-letter or review queue was found.

Needed for:

- unresolved tenant
- ambiguous tenant
- consent/suppression conflict
- malformed but authenticated event
- duplicate source IDs across possible tenants
- company/contact matching ambiguity

This can be part of `website_handoff_events` via status fields or a separate queue table. The first implementation should prefer a single intake event table with status until volume proves otherwise.

### 4. Source Reference Model

Current status:

CRM table metadata exists in SQL, but source-reference semantics are not typed in service contracts.

Recommended model:

```txt
crm_source_refs
```

Suggested fields:

- `tenant_id`
- `source_ref_id`
- `source_system`
- `source_object_type`
- `source_object_id`
- `target_object_type`
- `target_object_id`
- `event_id`
- `diagnostic_session_id`
- `diagnostic_result_id`
- `created_at`
- `metadata`

Purpose:

- idempotent link from website source records to OS CRM records
- clean separation between source identity and operational object identity
- optional future HubSpot/external refs without making HubSpot canonical

### 5. Receipt Projection

Current status:

No website-facing receipt model was found.

Needed events:

- `ajos.handoff_accepted`
- `ajos.handoff_rejected`
- `ajos.handoff_needs_review`
- `ajos.report_ready`

This can be implemented as:

- an outbound event table
- an integration outbox
- a projection table
- an API response plus durable receipt

The architecture should choose one before endpoint implementation.

### 6. Tenant Resolution Mapping

Current status:

`crm_tenants` exists, and `legacy_client_id` can bridge to `clients.id`.

Gap:

No explicit mapping was found for website source routes, company domains, diagnostic modules, or public website leads into tenant IDs.

Needed:

```txt
website_handoff_tenant_rules
```

or equivalent configuration.

Suggested inputs:

- source route
- diagnostic key
- email domain
- company domain
- explicit tenant key
- default intake tenant
- demo/sandbox blocklist

## Object Alignment Matrix

| Handoff object | Existing AJ Digital OS object | Alignment | Required next action |
| --- | --- | --- | --- |
| website lead source record | none in OS; source belongs to website | Do not duplicate | Store source refs only |
| handoff event | none found | Missing | Add intake event schema |
| tenant | `crm_tenants`, `clients` bridge | Partial | Define website tenant resolution rules |
| contact | `crm_contacts`, `CrmContact`, service/store | Strong | Add source refs and dedupe policy |
| company | `crm_companies`, `CrmCompany` type | Partial | Add service/store/schema support |
| lead | `crm_leads`, `CrmLead`, service/store | Strong | Add source refs and handoff metadata |
| opportunity | `crm_opportunities`, `CrmOpportunity`, service/store | Strong | Define qualification-to-opportunity policy |
| pipeline/stage | `crm_pipelines`, `crm_pipeline_stages` | Partial | Define default website intake pipeline/stage |
| task/follow-up | `crm_tasks` table | Partial | Add service support before automation |
| audit | `crm_audit_events`, file audit log | Partial | Add handoff event types |
| attribution | `crm_attribution_events`, attribution emitter | Partial | Add website-specific attribution types |
| client account | `clients`, `crm_tenants.legacy_client_id` | Partial | Define conversion from opportunity to client |
| project | no final single canonical project object | Open | Do not create new table until project boundary approved |
| onboarding | missions/workflows and dashboard surfaces | Partial | Define accepted-client workflow trigger |
| deliverable | `deliverables`, `DeliverableRecord` | Partial | Link workflow outputs to source refs |
| report | deliverable/report projection doctrine | Partial | Define `ajos.report_ready` projection |
| storage | `assets`, R2 client, output paths | Partial | Define provider and object-key permissions |

## What Should Not Be Added

Do not add:

- a second CRM under `audiojones-clean`
- website-owned client/project/deliverable tables
- n8n-owned CRM state
- HubSpot mirror tables as editable truth
- global contact/lead lookup tables without tenant scope
- direct website writes into AJ Digital OS operational tables
- duplicate project tables before the OS project/missions boundary is decided
- raw website payload dumps containing PII in public repo fixtures
- secrets, tokens, credentials, production exports, or private client data

## Recommended Additive Schema Direction

The safest schema direction is additive and contract-first:

### A. Intake Schema

Add an OS-owned intake event model for website handoff events.

Ownership:

- AJ Digital OS

Purpose:

- event verification result
- idempotency
- tenant resolution
- safe redacted payload snapshot
- dead-letter/review state

### B. Source Reference Schema

Add a source-reference model instead of stuffing all integration state into CRM object fields.

Ownership:

- AJ Digital OS

Purpose:

- map `audiojones-clean` source IDs to OS contact/lead/opportunity/client/workflow/deliverable refs
- preserve optional future HubSpot refs as external projections
- support idempotent retries and reporting joins

### C. Company Service Contract

Extend existing CRM service/store contracts for companies before implementing website company mapping.

Ownership:

- AJ Digital OS CRM module

Purpose:

- create/link company records inside tenant boundary
- support tenant-scoped company dedupe by name/domain
- prevent direct SQL writes from intake code

### D. Handoff Receipt Model

Add a durable receipt/projection model.

Ownership:

- AJ Digital OS

Purpose:

- return accepted/rejected/needs-review status
- expose downstream object refs safely
- support website/read-model reconciliation

### E. Project/Onboarding Boundary Decision

Resolve whether the first operational object after opportunity is:

- `client`
- `mission`
- `mission_run`
- portal `project` projection
- future OS `project`
- workflow wrapper around existing mission concepts

Do not create a new project schema until this is decided.

## Compatibility With Existing CRM Code

### Compatible Now

A future adapter can already use:

- `CrmTenantContext`
- `resolveCrmTenantContext(...)`
- `withTenantContext(...)`
- `CrmService.createContact(...)`
- `CrmService.createLead(...)`
- `CrmService.createOpportunity(...)`
- CRM audit events for object writes
- CRM attribution emission for object writes

### Needs Extension First

Before wiring website handoff:

- add event envelope types and validators
- add intake event persistence
- add idempotency/dead-letter behavior
- add tenant resolution rules
- add company service/store support
- add source-reference model
- add receipt model
- add handoff-specific audit/attribution types
- decide default intake pipeline/stage

### Should Stay Out Of First Implementation

- project table creation
- onboarding UI changes
- deliverable generation
- HubSpot sync
- n8n orchestration
- Metabase dashboards
- PostHog events
- storage provider activation
- production endpoint exposure

## Proposed First Code Boundary

The first code phase should not wire an endpoint.

Recommended first implementation:

```txt
src/integrations/audiojones-clean/handoff-types.ts
src/integrations/audiojones-clean/handoff-schemas.ts
src/integrations/audiojones-clean/handoff-mapping.ts
tests/integrations/audiojones-clean/handoff-schemas.test.ts
```

Purpose:

- define event envelope
- define handoff payload
- define receipt payload
- define tenant resolution result type
- validate placeholder fixtures
- map payload to intended CRM object drafts without writing them

Do not write to CRM, database, n8n, HubSpot, or storage in the first code phase.

## Recommended Implementation Sequence

### Phase 1 - Alignment Lock

- Approve this document.
- Confirm no duplicate lifecycle tables outside AJ Digital OS.
- Confirm source-reference strategy.
- Confirm company service gap.

### Phase 2 - Event Schema Package

- Add TypeScript types.
- Add Zod schemas.
- Add placeholder fixtures.
- Add validation tests.
- No endpoint.

### Phase 3 - Intake Persistence Spec

- Design event log.
- Design idempotency keys.
- Design dead-letter/review status.
- Design receipt persistence.
- Choose DB placement.

### Phase 4 - CRM Service Gap Fill

- Add company schema/service/store support.
- Add source-reference persistence.
- Add handoff-specific audit types.
- Add handoff-specific attribution types.

### Phase 5 - Local Adapter

- Map validated event into CRM draft operations.
- Resolve tenant using approved rules.
- Validate consent and suppression.
- Produce receipt object.
- No network endpoint yet.

### Phase 6 - Signed Intake Endpoint

- Add endpoint only after prior phases pass.
- Verify HMAC, timestamp, nonce, schema, and idempotency before writes.
- Keep endpoint local/staging until approved.

### Phase 7 - Website Outbox Integration

- Wire `audiojones-clean` outbox to OS intake.
- Keep HubSpot/n8n optional and non-canonical.

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Intake code writes directly to SQL and bypasses CRM service | High | Require adapter to use service contracts after validation |
| Company data is ignored or duplicated | Medium | Add company service/store support before website mapping |
| Website source IDs are lost in generic metadata | High | Add explicit source-reference model or approved typed metadata |
| Duplicate handoff creates duplicate CRM objects | High | Add idempotency and tenant-scoped source refs before endpoint |
| Tenant resolution defaults to the wrong client | High | Dead-letter ambiguous handoffs and require approved tenant rules |
| Consent false still triggers automation | High | Enforce suppression policy before CRM tasks/workflows |
| Project schema is invented prematurely | High | Stop at opportunity/workflow intent until project boundary is approved |
| HubSpot becomes hidden CRM truth | Medium | Keep HubSpot optional external projection only |
| n8n becomes pseudo-state | Medium | Keep durable truth in OS event log and CRM records |
| Public repo receives sensitive payload data | High | Use placeholder fixtures only and redacted payload snapshots |

## Open Questions

1. What is the default `tenantId` for unassigned public Audio Jones website leads?
2. Should website leads always create `crm_leads`, or should low-fit leads remain only in intake review?
3. What source-reference model is preferred: typed CRM metadata or a dedicated `crm_source_refs` table?
4. What is the default pipeline and stage for website-originated opportunities?
5. What creates a client account: operator approval, opportunity won, payment event, signed agreement, or manual command?
6. Which object is canonical for project/onboarding in the first operational handoff: mission, workflow, portal project projection, or future project?
7. Should intake event storage live in the CRM database, OS execution database, or a separate integration schema?
8. What is the approved redaction policy for storing website payload snapshots?

## Definition Of Done

This alignment doc is done when:

- existing CRM/client/project/deliverable surfaces are mapped to the handoff contract
- satisfied, partial, and missing areas are separated
- duplicate-state risks are explicit
- recommended additive schema direction is documented
- the first code boundary is schema/types/tests only
- no code, migration, runtime file, secret, endpoint, n8n workflow, HubSpot sync, UI, storage, or production system is changed

## Next Implementation Prompt

```txt
Review/Diagnosis owner: Codex
Actionable AI Assistant Task owner: Codex
Execution location/tool: C:\dev\AJ-DIGITAL-OS
Human/operator role: Audio approves schema/type plan only; no endpoint or database migration yet
Copy/paste destination: Codex

Task:
Create the Phase 2 event schema package plan for receiving `audiojones-clean` handoff events into AJ Digital OS.

Source documents:
- docs/architecture/AJ_DIGITAL_OS_CRM_SCHEMA_ALIGNMENT.md
- origin/main:docs/architecture/AUDIOJONES_CLEAN_HANDOFF_CONTRACT.md
- docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md
- docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md
- src/crm/crm-types.ts
- src/crm/crm-service.ts
- src/crm/crm-schemas.ts
- src/crm/crm-store.ts
- src/crm/postgres-crm-store.ts

Create one Markdown file only:
docs/architecture/AUDIOJONES_CLEAN_HANDOFF_EVENT_SCHEMA_PLAN.md

Required sections:
1. Current alignment summary
2. Event envelope type plan
3. Handoff payload type plan
4. Receipt type plan
5. Tenant resolution result type plan
6. Source-reference type plan
7. Consent and suppression type plan
8. Zod validation plan
9. Placeholder fixture strategy
10. Future file-by-file implementation scope
11. Out of scope
12. Validation commands
13. Risk register
14. Definition of done

Constraints:
- Documentation only.
- Do not create endpoint code.
- Do not create database migrations.
- Do not modify CRM runtime behavior.
- Do not wire n8n.
- Do not wire HubSpot.
- Do not add UI.
- Do not write secrets.
- Do not commit runtime payloads or client data.
- Preserve AJ Digital OS as CRM and operational truth.
- Preserve `audiojones-clean` as source system only.
```
