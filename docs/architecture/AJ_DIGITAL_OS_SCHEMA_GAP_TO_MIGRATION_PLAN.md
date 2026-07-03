# AJ Digital OS Schema Gap To Migration Plan

**Owner:** AJ Digital OS engineering
**Status:** Architecture and migration planning only
**Scope:** non-destructive schema gap analysis for AudioJones Clean handoff, intake, CRM, client, project, workflow, deliverable, approval, reporting, memory, audit, and source-reference objects
**Last updated:** 2026-07-03

## 1. Purpose

Translate the handoff contract, intake event model, and CRM object model into a non-destructive migration plan.

This document does not authorize migrations, endpoints, automations, runtime wiring, HubSpot sync, n8n workflows, data backfills, or project creation from website events. It defines what exists, what is missing, what must be extended, what should remain event/log state, and what must not be duplicated.

The immediate next step after this document is a migration PRD, not migrations.

## 2. Current State Summary

### What Exists Now

Existing tenant-native CRM schema:

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

Existing operational/delivery schema surfaces:

- `clients`
- `missions`
- `mission_runs`
- `deliverables`
- `assets`
- `subscriptions`
- `client_agents`
- `control_runs`
- `approvals`
- `dag_runs`

Existing runtime/service surfaces:

- `src/crm/crm-types.ts`
- `src/crm/crm-store.ts`
- `src/crm/crm-service.ts`
- `src/crm/crm-schemas.ts`
- `src/crm/postgres-crm-store.ts`
- `src/crm/persistent-crm-store.ts`
- `src/types/deliverable.types.ts`
- `src/core/deliverable-store.ts`
- `src/services/runtime/deliverable-lifecycle.ts`
- `src/security/approvals/*`
- `src/agent-roles/shared-memory.ts`
- `src/memory/*`
- `src/memory-runtime/*`

### What Is Already Canonical

- Tenant isolation is canonical through `crm_tenants`, tenant context, tenant-leading queries, and CRM RLS design.
- Contacts, leads, and opportunities have TypeScript types, validation schemas, store contracts, service methods, Postgres store support, and persistent file-backed support.
- CRM audit and attribution event tables exist.
- CRM approval references exist.
- Deliverables have runtime lifecycle support for `draft`, `pending_approval`, `approved`, and `published`.
- File asset metadata exists through `assets`.
- Workflow execution surfaces exist through `mission_runs`, `dag_runs`, and runtime records.
- Tenant-scoped business memory concepts exist through `crm_knowledge_items`, `crm_memory_index`, semantic memory, and file-backed memory.

### What Is Partial

- Company exists as a table and type but is not fully exposed through service/store/schema contracts.
- Tasks exist as a table but are not yet confirmed as canonical service-level intake outputs.
- Client and tenant alignment is partial through `crm_tenants.legacy_client_id` and `clients`.
- Project is not canonical yet. Existing candidates include `missions`, portal project projections, workflow wrappers, or a future project table.
- Reports exist as deliverables, projections, Hermes-generated performance reports, attribution reports, and file/report artifacts, but not as one canonical `Report` object.
- Approval has several surfaces: `approvals`, `crm_approval_refs`, deliverable approval lifecycle, and security approval stores. These need alignment before migration.
- Activity/audit is partial: `crm_audit_events` exists, but intake-specific activity event families are not modeled.
- Source references are partial: some source fields and metadata exist, but no typed source-reference table exists.

### What Is Missing

- `SourceReference` table/model.
- `IntakeReceipt` table/model.
- `DeadLetterEvent` table/model.
- Durable idempotency model for website-originated events.
- Tenant resolution rules for website-originated events.
- Handoff receipt projection model.
- Explicit source-to-canonical object mapping.
- Canonical `ClientAccount` bridge.
- Canonical `Project` boundary.
- `DeliverableVersion` model.
- `ApprovalEvent` event history model.
- Unified `Report` object or approved report-as-deliverable doctrine.

### What Is Legacy Or Should Not Be Extended

- `data/memory/shared/failures.jsonl` should be treated as runtime memory state until explicitly reviewed.
- `.lumenignore` should not be staged or included in this architecture work without separate review.
- n8n must not become CRM, intake, idempotency, dead-letter, retry, or project truth.
- HubSpot must not become canonical CRM truth.
- Website-originated lead tables should not be duplicated inside `audiojones-clean`.
- A new project table should not be created until the project boundary is approved.

## 3. Source Architecture Inputs

The following canonical docs drive this plan:

- `docs/architecture/AUDIOJONES_CLEAN_HANDOFF_CONTRACT.md`
- `docs/architecture/AJ_DIGITAL_OS_CRM_SCHEMA_ALIGNMENT.md`
- `docs/architecture/AJ_DIGITAL_OS_INTAKE_EVENT_MODEL.md`
- `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`

Branch note: at the time this plan was prepared, those canonical docs were present on `origin/main` and not in the local `feat/crm-go-live-cli` worktree. This plan should be landed on `main` with the clean worktree pattern so these references resolve together.

The source architecture establishes:

- `audiojones-clean` owns public website lead capture, diagnostics, conversion events, and handoff requests.
- AJ Digital OS owns canonical CRM and operational truth.
- Website events may request intake.
- AJ Digital OS decides canonical CRM state.
- No website event directly creates a project.
- No orchestration tool becomes source of truth.
- HubSpot is optional external projection only.
- n8n is orchestration only.
- Storage systems store files only; AJ Digital OS owns file metadata and lifecycle references.

## 4. Desired Canonical Object Model

The migration plan must preserve this canonical object model:

| Object | Intended canonical role |
| --- | --- |
| Tenant | CRM and operational isolation boundary |
| Contact | Tenant-scoped person record |
| Company | Tenant-scoped organization/account record |
| Lead | Pre-opportunity commercial interest |
| Opportunity | Qualified commercial deal or buying motion |
| Client | Operational customer record |
| ClientAccount | Bridge from CRM commercial state to delivery state |
| Project | Delivery container for onboarding, workflows, deliverables, approvals, and reports |
| ProjectMember | Role assignment for project participants |
| WorkflowRun | Execution instance for onboarding, delivery, automation, or report generation |
| Task | Follow-up, review, operational, or delivery action |
| Deliverable | Operational artifact metadata and lifecycle state |
| DeliverableVersion | Version history for deliverable revisions and approvals |
| FileAsset | Storage metadata for files and generated outputs |
| ApprovalRequest | Current approval gate or approval request |
| ApprovalEvent | Append-only approval decision/event history |
| Report | Reporting artifact, executive summary, or approved projection |
| ActivityLog | Append-only operational event and object mutation record |
| IntakeReceipt | Durable receipt for a website-originated handoff attempt |
| DeadLetterEvent | Safe holding record for events that cannot proceed automatically |
| SourceReference | Link between external source records and AJ Digital OS canonical objects |

## 5. Gap Matrix

| Object | Classification | Current source | Desired source | Gap | Risk | Recommended migration action | Dependency | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant | Exists | `crm_tenants`, tenant context, RLS | `crm_tenants` | Tenant resolution rules for website events missing | Wrong tenant writes | Add tenant resolution plan and tests before intake endpoint | SourceReference, IntakeReceipt | P1 |
| Contact | Exists but needs extension | `crm_contacts`, `CrmContact`, CRM service/store | `crm_contacts` plus source refs | Source refs and consent provenance not durable enough | Duplicate contacts and consent drift | Add source refs before intake writes; preserve current IDs | SourceReference | P1 |
| Company | Exists but needs extension | `crm_companies`, `CrmCompany` type | `crm_companies` plus service/store | Service/store/schema methods incomplete | Company duplication or direct SQL bypass | Add company service/store/schema support in later PRD | Tenant model | P3 |
| Lead | Exists but needs extension | `crm_leads`, `CrmLead`, CRM service/store | `crm_leads` plus source refs | No intake/source idempotency relationship | Retry creates duplicates | Add source refs and intake receipts before live ingestion | SourceReference, IntakeReceipt | P1 |
| Opportunity | Exists but needs extension | `crm_opportunities`, pipelines/stages | `crm_opportunities` | Qualification-to-opportunity policy not final | Premature deal creation | Align opportunity creation policy after lead intake | Lead policy | P4 |
| Client | Exists but needs extension | `clients`, `crm_tenants.legacy_client_id` | Existing `clients` or approved bridge | Tenant/client relationship unclear | Divergent CRM and delivery identities | Define tenant/client/client-account bridge before conversion automation | ClientAccount decision | P5 |
| ClientAccount | Missing | No final object found | New bridge or mapped view | Object not defined | CRM won deal cannot safely become delivery account | Plan only; do not migrate until boundary approved | Client boundary | P5 |
| Project | Do not implement yet | `missions`, portal project projection, future table candidates | Approved project boundary | No final canonical object | Website-to-project shortcut and duplicated project truth | Block project table; document boundary decision first | ClientAccount | P6 |
| ProjectMember | Do not implement yet | No final object found | Project membership table after project approval | Depends on project identity | Role assignments tied to wrong project concept | Defer until project boundary is approved | Project | P6 |
| WorkflowRun | Exists but needs extension | `mission_runs`, `dag_runs`, runtime run records | Execution run linked to tenant/project | Link to client/project/account not stable | Execution records detached from CRM | Add links only after client/project boundary | Project boundary | P6 |
| Task | Exists but needs extension | `crm_tasks` table | `crm_tasks` plus service/store | Service contract not confirmed | Automation bypasses governance | Add service/store plan before intake-generated tasks | CRM service gap fill | P3 |
| Deliverable | Exists but needs extension | `deliverables`, `DeliverableRecord`, lifecycle service | `deliverables` linked to approved project/client model | Project/client linkage incomplete | Deliverables attached to wrong container | Keep current lifecycle; align relationships later | Project boundary | P7 |
| DeliverableVersion | Missing | No final object found | New version table or event log | Version history not explicit | Approval and revision ambiguity | Model as event/log first; table only if needed | Deliverable/ApprovalEvent | P7 |
| FileAsset | Exists but needs extension | `assets`, storage references, R2 surfaces | `assets` plus policy fields | Access policy and version linkage incomplete | Public/private file leakage | Add storage metadata and policy plan before migration | DeliverableVersion | P7 |
| ApprovalRequest | Exists but needs extension | `approvals`, `crm_approval_refs`, approval store | Unified approval request model | Multiple approval surfaces | Conflicting approval state | Align security approvals and CRM approval refs | ApprovalEvent | P7 |
| ApprovalEvent | Should be modeled as event/log, not core table | Audit logs and approval stores | Append-only approval event history | Decision history not normalized | Lost audit chain | Add event family or table after approval model PRD | ApprovalRequest | P7 |
| Report | Exists but needs extension | Deliverables, Hermes performance reports, attribution reports, portal projection docs | Report as deliverable subtype or approved projection | Canonical report identity unclear | Duplicate report tables | Decide report-as-deliverable vs separate report model | Deliverable alignment | P8 |
| ActivityLog | Exists but needs extension | `crm_audit_events`, runtime audit, attribution events | Append-only audit/activity record | Intake event families missing | Intake decisions not traceable | Extend audit event taxonomy after intake schema | IntakeReceipt | P8 |
| IntakeReceipt | Missing | No table/model found | New intake receipt table | No durable intake result | Duplicate retries and unclear outcomes | Add before live endpoint | SourceReference | P1 |
| DeadLetterEvent | Missing | No table/model found | New dead-letter table or status-backed queue | Unsafe events have no holding state | Bad automated writes or lost events | Add before endpoint activation | IntakeReceipt | P2 |
| SourceReference | Missing | Loose source fields/metadata only | New source-reference table | External IDs not typed | Lost traceability and duplicate records | Add before destructive normalization or sync | Tenant model | P1 |
| Memory | Exists but needs boundary | `crm_memory_index`, `crm_knowledge_items`, local file memory | Tenant-scoped memory plus runtime memory policy | Runtime files mixed with repo state | Sensitive or noisy runtime state in git | Treat runtime memory separately; review gitignore policy | Public repo safety | P8 |

## 6. Non-Destructive Migration Principles

- Do not drop or rename existing production tables in v0.
- Prefer additive migrations.
- Preserve existing IDs.
- Add source-reference tables before destructive normalization.
- Add intake receipts before live ingestion.
- Add dead-letter handling before endpoint activation.
- Backfill only after schema is stable.
- No project creation directly from website events.
- Do not duplicate CRM, client, project, deliverable, or report truth in `audiojones-clean`.
- Do not make HubSpot canonical.
- Do not make n8n canonical.
- Do not store secrets, webhook signing secrets, access tokens, private CRM exports, or live payload dumps in the public repo.
- Tenant resolution must happen before CRM mutation.
- Ambiguous tenant/contact/company matching must dead-letter instead of guessing.
- Cross-tenant matching is forbidden outside explicit approved reporting paths.
- Add indexes and constraints before endpoint activation, not after traffic starts.

## 7. Proposed Migration Phases

### Phase 0: Documentation Only

- Approve the object model.
- Approve this schema gap-to-migration plan.
- Create a migration PRD.
- Confirm database target, branch strategy, rollback plan, and naming convention.

### Phase 1: Source Reference + Intake Receipt Tables

- Add `crm_source_refs`.
- Add `crm_intake_receipts`.
- Add idempotency constraints before any endpoint exists.
- Add synthetic fixtures only.

### Phase 2: Dead-Letter Event Table

- Add `crm_dead_letter_events`.
- Define replay, rejection, review, and archive behavior.
- Ensure dead-letter records preserve original source IDs and safe payload summaries.

### Phase 3: Contact/Company/Lead Normalization Extensions

- Extend service/store/schema support for company operations.
- Add source-reference links for contacts and leads.
- Add consent provenance fields only if source references are not enough.
- Avoid direct SQL writes outside service contracts.

### Phase 4: Opportunity/Deal Alignment

- Define qualification-to-opportunity rules.
- Add source references for opportunities.
- Preserve pipeline/stage semantics.
- Do not create opportunities from low-confidence intake events.

### Phase 5: Client/Client Account Boundary

- Decide whether `ClientAccount` wraps existing `clients`, maps to `crm_tenants.legacy_client_id`, or becomes a new bridge.
- Define conversion trigger from won opportunity to client/account.
- Require human approval for first implementation.

### Phase 6: Project/Onboarding Boundary

- Decide whether canonical project is `missions`, a workflow wrapper, a portal projection, or a future `projects` table.
- Do not create any project table until this decision is approved.
- Website handoff remains blocked from project creation.

### Phase 7: Deliverables/Files/Approvals Alignment

- Align deliverables with approved project/client boundary.
- Decide whether `DeliverableVersion` is a table or event history.
- Align `ApprovalRequest` and `ApprovalEvent` across security approvals, CRM refs, and deliverable approvals.
- Define file asset access policy and storage metadata.

### Phase 8: Reporting/Activity/Audit Alignment

- Decide whether `Report` is a deliverable subtype, reporting projection, or separate table.
- Extend `crm_audit_events` or add explicit activity event families for intake, source refs, dead letters, and report readiness.
- Preserve platform reporting as explicit, read-only, audited views.

### Phase 9: Backfill + Reconciliation

- Backfill only after v0 schema is deployed and stable.
- Reconcile source refs from existing CRM source fields where safe.
- Reconcile clients and tenants through approved mapping.
- Use dry-run reports before data writes.

### Phase 10: Endpoint Implementation Plan

- Design signed website intake endpoint.
- Design website outbox contract.
- Design n8n delivery role if used.
- Do not implement endpoint until migrations, tests, and rollback are approved.

## 8. Migration Objects

### `crm_source_refs`

**Purpose:** durable links from external source records to AJ Digital OS canonical records.

**Key fields:**

- `tenant_id`
- `source_ref_id`
- `source_system`
- `source_environment`
- `source_object_type`
- `source_object_id`
- `source_event_id`
- `target_object_type`
- `target_object_id`
- `relationship_type`
- `status`
- `metadata`
- `created_at`
- `updated_at`

**Relationships:**

- Belongs to `crm_tenants`.
- Links to contacts, companies, leads, opportunities, clients, workflow runs, deliverables, reports, or future project objects by typed target fields.

**Idempotency requirements:**

- Unique tenant-scoped key on `source_system`, `source_environment`, `source_object_type`, `source_object_id`, `target_object_type`, and `target_object_id`.
- Source event ID should be preserved for replay and audit.

**Audit requirements:**

- Emit activity/audit events for created, linked, superseded, revoked, and replayed refs.

**Sensitive data:** can contain low-risk source metadata, but must not contain secrets, raw tokens, full CRM exports, or private payload dumps.

**Implementation priority:** Phase 1.

### `crm_intake_receipts`

**Purpose:** durable intake decision record for website-originated events.

**Key fields:**

- `intake_receipt_id`
- `source_system`
- `source_environment`
- `source_event_id`
- `source_event_type`
- `source_record_type`
- `source_record_id`
- `tenant_id`
- `status`
- `decision_reason`
- `idempotency_key`
- `request_hash`
- `receipt_payload`
- `created_object_refs`
- `dead_letter_id`
- `received_at`
- `processed_at`
- `created_at`
- `updated_at`

**Relationships:**

- May link to tenant, source refs, dead-letter events, contacts, companies, leads, opportunities, tasks, and later reports.

**Idempotency requirements:**

- Unique key on `source_system`, `source_environment`, and `source_event_id`.
- Duplicate event ID must return the original receipt.

**Audit requirements:**

- Emit audit/activity for received, validated, duplicate, accepted, rejected, needs_review, retryable_failure, and terminal_failure.

**Sensitive data:** can contain PII summaries and safe payload snippets; must not contain credentials, raw request signatures, private exports, or full payload dumps unless encrypted/redacted policy is approved.

**Implementation priority:** Phase 1.

### `crm_dead_letter_events`

**Purpose:** safe holding queue for authenticated events that cannot proceed automatically.

**Key fields:**

- `dead_letter_id`
- `intake_receipt_id`
- `tenant_id`
- `source_system`
- `source_environment`
- `source_event_id`
- `reason_code`
- `review_status`
- `safe_payload_snapshot`
- `operator_notes`
- `replay_count`
- `last_replayed_at`
- `resolved_at`
- `created_at`
- `updated_at`

**Relationships:**

- Belongs to an intake receipt.
- May link to eventual source refs and CRM objects after replay.

**Idempotency requirements:**

- Replay must reuse original source event ID and idempotency key.
- Dead-letter resolution must not create duplicate CRM objects.

**Audit requirements:**

- Emit audit/activity for dead_lettered, review_started, resolved, replayed, rejected, and archived.

**Sensitive data:** likely contains sensitive payload summaries; redact by default and store only safe subsets until encryption policy exists.

**Implementation priority:** Phase 2.

### `crm_companies` Extensions

**Purpose:** support canonical company creation/linking through service/store contracts.

**Key fields:** existing `company_id`, `tenant_id`, `name`, `domain`, `industry`, `owner_user_id`, `metadata`, timestamps.

**Relationships:**

- Existing relationships to contacts, leads, and opportunities.
- Future source refs.

**Idempotency requirements:**

- Tenant-scoped match by normalized domain, then normalized name.
- Multiple candidates dead-letter.

**Audit requirements:**

- Company created, updated, linked, merge_candidate, duplicate_blocked.

**Sensitive data:** low to medium, depending on metadata.

**Implementation priority:** Phase 3.

### `crm_tasks` Service Extension

**Purpose:** allow approved intake, booking, follow-up, or review tasks through service contracts.

**Key fields:** existing table plus service-layer validation.

**Relationships:**

- Related object type and ID can point to contact, company, lead, opportunity, intake receipt, or dead letter.

**Idempotency requirements:**

- Avoid duplicate tasks from duplicate intake receipts.

**Audit requirements:**

- Task requested, created, updated, completed, cancelled.

**Sensitive data:** may contain PII in task descriptions; require redaction guidance.

**Implementation priority:** Phase 3.

### `ClientAccount` Boundary Object

**Purpose:** bridge commercial opportunity state to operational client delivery state.

**Proposed table name:** not approved. Candidate: `client_accounts`.

**Key fields:** not approved.

**Relationships:**

- Tenant, company, primary contact, won opportunity, client.

**Idempotency requirements:**

- One active client account per tenant/company/opportunity conversion path unless explicitly approved.

**Audit requirements:**

- Conversion requested, approved, created, linked, archived.

**Sensitive data:** high, because it may include client commercial and operational details.

**Implementation priority:** Phase 5 planning only.

### `Project` Boundary Object

**Purpose:** canonical delivery container.

**Proposed table name:** do not approve yet.

**Key fields:** blocked until project boundary decision.

**Relationships:**

- Client account, project members, workflow runs, tasks, deliverables, approvals, reports.

**Idempotency requirements:**

- No website-originated event may create project state.

**Audit requirements:**

- Project creation must be approval-gated.

**Sensitive data:** high.

**Implementation priority:** Phase 6 decision only.

### `DeliverableVersion`

**Purpose:** track deliverable revisions and approval history.

**Proposed table name:** candidate `deliverable_versions`, but event-log modeling should be evaluated first.

**Key fields:** deliverable ID, version number, status, file asset refs, approval refs, created by, created at.

**Relationships:**

- Deliverable, file assets, approval events.

**Idempotency requirements:**

- Version numbers or content hashes must prevent duplicate versions from retries.

**Audit requirements:**

- Version created, submitted, approved, published, superseded.

**Sensitive data:** can reference client files and reports; no raw content in public repo.

**Implementation priority:** Phase 7.

### `ApprovalEvent`

**Purpose:** append-only history of approval decisions and transitions.

**Proposed table name:** candidate `approval_events` or extension of existing audit events.

**Key fields:** approval ID, event type, actor, channel, prior status, next status, reason, timestamp.

**Relationships:**

- Approval request, deliverable, CRM object, project, workflow run.

**Idempotency requirements:**

- Approval decision events should be unique per approval ID, action, actor, and timestamp/correlation ID.

**Audit requirements:**

- Approval events are audit records by definition.

**Sensitive data:** should contain reasons and metadata only, not secrets or private payloads.

**Implementation priority:** Phase 7.

### `Report`

**Purpose:** canonical reporting artifact or approved projection.

**Proposed table name:** not approved. Candidate: report-as-deliverable subtype first.

**Key fields:** blocked until report doctrine is approved.

**Relationships:**

- Deliverable, file asset, client account, project, workflow run, source refs.

**Idempotency requirements:**

- Report period, report type, client/project, and generating run should prevent duplicate reports.

**Audit requirements:**

- Report generated, ready, published, superseded, archived.

**Sensitive data:** high; report payloads may include client operational metrics.

**Implementation priority:** Phase 8.

### `ActivityLog` Extensions

**Purpose:** append-only intake, object mutation, approval, and integration events.

**Preferred source:** extend `crm_audit_events` event taxonomy first.

**Key fields:** existing audit fields plus event families for intake, source refs, dead letters, report readiness, and replay.

**Relationships:**

- Any canonical object.

**Idempotency requirements:**

- Activity events should include source event ID and correlation ID where applicable.

**Audit requirements:**

- Append-only.

**Sensitive data:** must be redacted and safe for public development fixtures.

**Implementation priority:** Phase 8.

## 9. Idempotency And Deduplication

### Required Identity Fields

| Field | Purpose |
| --- | --- |
| `source_system` | Producer, initially `audiojones-clean` |
| `source_environment` | `local`, `preview`, `staging`, or `production` |
| `source_event_id` | Event-level idempotency key |
| `source_record_id` | Website lead/session/object ID |
| `source_record_type` | `lead`, `diagnostic_session`, `booking`, `suppression`, or approved type |
| `canonical_record_id` | AJ Digital OS object ID after creation/linking |
| `canonical_record_type` | Target object type |
| `tenant_id` | Required before CRM mutation |
| `idempotency_key` | Stable computed key over source system/environment/event ID |
| `request_hash` | Redacted payload hash for replay comparison |

### Match Strategy

1. Check event-level idempotency by `source_system + source_environment + source_event_id`.
2. If duplicate event exists, return original `IntakeReceipt`.
3. Resolve tenant.
4. Check source-reference links for source record ID.
5. Match contact tenant-scoped by normalized email, then phone when policy allows.
6. Match company tenant-scoped by normalized domain, then normalized name.
7. Match lead by source reference first, then safe contact/company context.
8. Match opportunity only after qualification policy passes.
9. Dead-letter ambiguous matches.

### Duplicate Handling

- Duplicate event ID: return original receipt.
- Duplicate source lead inside same tenant: link to existing source ref and CRM lead where safe.
- Duplicate source lead across possible tenants: dead-letter.
- Duplicate contact/company candidates: dead-letter.
- Duplicate opportunity candidates: require review.

### Retry Behavior

- Retry must reuse original source event ID.
- Retry must not generate a new CRM record if receipt exists.
- Retry of dead-lettered event must preserve original source refs and receipt.
- Retry state belongs in OS persistence, not n8n.

### Dead-Letter Behavior

Dead-letter when:

- Tenant cannot be resolved.
- Source event is valid but ambiguous.
- Contact/company matching returns multiple candidates.
- Consent or suppression state blocks automatic action.
- Payload version is unsupported but authenticated.
- A replay attempts to mutate an already-final receipt.

## 10. Project Creation Boundary

Website event may create or request:

- Intake receipt
- Source reference
- Lead
- Contact/company match
- Opportunity/deal candidate
- Follow-up or review task after OS approval rules pass

Website event may not directly create:

- Client
- Client account
- Project
- Onboarding workflow
- Workflow run
- Deliverable
- File asset
- Approval request for delivery state
- Report

This boundary is non-negotiable for v0. It prevents the dangerous shortcut:

```txt
website form -> project
```

The approved flow is:

```txt
website event -> intake receipt -> source reference -> CRM decision -> opportunity decision -> approved conversion -> client/project workflow
```

## 11. Public Repo Safety

AJ-DIGITAL-OS-V1 is public. Therefore:

- No secrets.
- No private client data.
- No credentials.
- No real CRM exports.
- No live webhook secrets.
- No sensitive operational payloads.
- Use synthetic examples only.
- Do not commit raw intake payload dumps.
- Do not commit signed webhook examples with real signatures.
- Do not commit private deliverables or storage URLs.
- Do not commit production database dumps.
- Treat `data/memory/shared/failures.jsonl` as runtime state until reviewed.
- Treat `.lumenignore` as a separate workstream unless reviewed and approved.

## 12. Implementation Readiness Checklist

Before migrations:

- [ ] Schema owner confirmed.
- [ ] Target database confirmed.
- [ ] Branch strategy confirmed.
- [ ] Backup/rollback plan written.
- [ ] Migration naming convention confirmed.
- [ ] Test database available.
- [ ] Synthetic fixture data prepared.
- [ ] No secrets in repo.
- [ ] Source architecture docs are present on the target branch.
- [ ] Tenant resolution policy approved.
- [ ] SourceReference schema approved.
- [ ] IntakeReceipt schema approved.
- [ ] DeadLetterEvent schema approved.
- [ ] Project creation boundary approved as blocked for website events.
- [ ] Public repo safety reviewed.
- [ ] Backfill scope explicitly deferred until schema stability.

## 13. Risks And Open Questions

| Risk or question | Severity | Current answer | Required decision |
| --- | --- | --- | --- |
| Project/client boundary unresolved | High | Do not implement project table yet | Decide `ClientAccount` and `Project` model |
| Tenant isolation mistakes | High | Tenant context and RLS exist | Define website tenant resolution and dead-letter policy |
| Company service support incomplete | Medium | Table/type exists but service/store incomplete | Add company service/store/schema PRD |
| File storage provider and access policy | Medium | Assets/R2 surfaces exist | Define file asset permissions and signed URL policy |
| Approval model split | Medium | `approvals`, `crm_approval_refs`, deliverable approvals exist | Align ApprovalRequest and ApprovalEvent |
| Reporting source unclear | Medium | Reports exist as deliverables/projections | Decide report-as-deliverable vs separate Report object |
| Memory/audit boundary | Medium | CRM memory and runtime memory both exist | Define runtime memory vs tenant memory policy |
| `.lumenignore` status | Low | Untracked local file | Review separately; do not stage in this work |
| `data/memory/shared/failures.jsonl` status | Medium | Dirty runtime file | Decide gitignore/tracked/runtime-state policy separately |
| HubSpot canonical drift | High | Optional projection only | Store HubSpot IDs as external refs only |
| n8n retry/idempotency drift | High | Orchestration only | Store retry/idempotency in OS |
| Public repo data leak | High | Public repo confirmed | Synthetic fixtures only; no private payloads |

## 14. Recommended Next Action

Create a migration PRD, not migrations yet.

Recommended next artifact:

```txt
docs/architecture/AJ_DIGITAL_OS_SCHEMA_MIGRATION_PRD.md
```

The migration PRD should:

- choose target database for v0 intake tables
- confirm migration naming convention
- define exact additive migrations
- define rollback strategy
- define test database requirements
- define synthetic fixtures
- define validation commands
- define approval gates
- explicitly keep endpoints, automations, and website wiring out of scope

## Definition Of Done

This schema gap-to-migration plan is done when:

- The current schema surfaces are mapped against the desired object model.
- Every canonical object has a gap classification.
- Additive migration principles are explicit.
- SourceReference, IntakeReceipt, and DeadLetterEvent are prioritized before endpoint activation.
- Project creation from website events remains blocked.
- Public repo safety constraints are explicit.
- The next action is a migration PRD, not migrations.

## Next Implementation Prompt

```txt
Review/Diagnosis owner: Codex
Actionable AI Assistant Task owner: Codex
Execution location/tool: C:\dev\AJ-DIGITAL-OS
Human/operator role: Audio approves migration PRD only; no implementation yet
Copy/paste destination: Codex

Task:
Create the AJ Digital OS schema migration PRD for the AudioJones Clean handoff and CRM intake layer.

Source documents:
- docs/architecture/AUDIOJONES_CLEAN_HANDOFF_CONTRACT.md
- docs/architecture/AJ_DIGITAL_OS_CRM_SCHEMA_ALIGNMENT.md
- docs/architecture/AJ_DIGITAL_OS_INTAKE_EVENT_MODEL.md
- docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md
- docs/architecture/AJ_DIGITAL_OS_SCHEMA_GAP_TO_MIGRATION_PLAN.md
- docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md
- docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md
- supabase/migrations/20260626150000_crm_multitenant_rls.sql
- sql/supabase-schema.sql
- sql/neon-os-schema.sql

Create only:
docs/architecture/AJ_DIGITAL_OS_SCHEMA_MIGRATION_PRD.md

Required sections:
1. Problem
2. Desired outcome
3. Scope
4. Out of scope
5. Success criteria
6. Target database decision
7. Migration naming convention
8. Proposed additive migrations
9. Rollback plan
10. Test database plan
11. Synthetic fixture plan
12. Validation commands
13. Security and public repo constraints
14. Approval gates
15. Risks and open questions
16. Next Implementation Prompt

Constraints:
- Documentation only.
- Do not create migrations.
- Do not create endpoints.
- Do not wire audiojones-clean.
- Do not wire HubSpot.
- Do not wire n8n.
- Do not create a project table.
- Do not stage runtime files.
- Do not push unless explicitly instructed.

Output:
Markdown PRD only.
```
