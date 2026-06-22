# AJ Digital Multi-Tenant CRM Module Spec

**Version:** 0.1
**Status:** Documentation spec plus local foundation scaffold - not production implemented
**Owner:** AJ Digital LLC
**Platform Owner:** AJ Digital
**Product Layer:** Founder Intelligence System - CRM Core
**Related DB/RLS Spec:** `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md`
**Last Updated:** 2026-06-15

---

## 1. Purpose

Define the AJ Digital Multi-Tenant CRM Module as a client-facing CRM application layer inside AJ Digital OS.

This module is not "CRM for AJ only." It is a multi-tenant CRM platform module that AJ Digital can offer to multiple client businesses while preserving strict tenant isolation across CRM records, conversations, memory, connectors, credentials, agents, approvals, audit logs, attribution, billing state, and reporting.

Core doctrine:

- HubSpot-like UX.
- AJ Digital OS architecture.
- Client-isolated data.
- Founder Intelligence layer on top.

## 2. Product Thesis

The CRM module should provide the daily operating surface that founder-led service businesses actually use:

- contacts
- companies
- leads
- opportunities
- pipelines
- tasks
- conversations
- forms
- bookings
- quotes
- invoices
- products and services
- reporting
- workflows

The strategic value is not generic CRM storage. The strategic value is a governed revenue intelligence system that connects lead flow, call handling, follow-up, quotes, invoices, agent activity, attribution, and business memory into one tenant-owned operating layer.

Client-facing description:

> A client-owned CRM, AI receptionist, follow-up engine, and revenue intelligence dashboard built for founder-led service businesses.

## 3. Platform Owner / Tenant Admin / Tenant User / Tenant Agent Roles

### Platform Owner: AJ Digital

AJ Digital can:

- create tenants
- disable tenants
- switch active tenant context
- manage client workspaces
- view tenant health
- configure platform-level modules
- audit tenant activity
- manage shared infrastructure
- assign tenant admins
- provision default pipelines
- provision default agents
- provision default dashboards

AJ Digital must not accidentally execute client actions outside the selected tenant context.

### Tenant Admin: Client Business Owner

Tenant admins can:

- manage their team
- manage contacts
- manage leads
- manage pipelines
- view conversations
- approve outbound actions
- configure business profile
- configure AI receptionist rules
- configure booking settings
- connect phone, email, calendar, and payment tools
- view tenant attribution
- view tenant reports

### Tenant User: Client Staff

Tenant users can:

- manage assigned leads
- complete tasks
- update contacts
- view permitted conversations
- move opportunities through pipeline
- request AI assistance
- draft follow-ups

### Tenant Agent: AI Worker

Tenant agents can:

- ingest tenant-specific data
- summarize conversations
- recommend next actions
- draft messages
- create pending tasks
- classify leads
- enrich CRM records
- flag risks

Tenant agents cannot:

- cross tenant boundaries
- access another tenant's memory
- send outbound actions without permission
- export data without approval
- delete records without approval
- change tenant billing or payment settings

## 4. Multi-Tenant Architecture Requirement

AJ Digital CRM Module must be multi-tenant by default.

The system must support AJ Digital offering the CRM module to multiple client businesses while maintaining strict tenant isolation across data, memory, agents, connectors, settings, billing, audit logs, and attribution.

AJ Digital is the platform owner. Each client business is a tenant. Each tenant has isolated contacts, companies, leads, opportunities, pipelines, conversations, invoices, agents, settings, and memory.

AJ Digital can switch client context from an admin layer. AI agents must always operate inside the selected tenant context. No client data can bleed into another client workspace.

This module must align with the existing AJ Digital OS tenant-isolation doctrine in `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`.

## 5. Tenant Context Doctrine

Every action in the CRM must execute inside an explicit tenant context.

No user, agent, workflow, connector, automation, or API route may act without a resolved `tenantId`.

Required tenant-scoped entities:

- contacts
- companies
- leads
- opportunities
- pipelines
- tasks
- notes
- conversations
- quotes
- invoices
- bookings
- forms
- products/services
- AI agents
- knowledge base
- memory
- files
- connectors
- credentials
- audit logs
- attribution events
- dashboards
- settings
- user permissions

Every record must include:

```ts
tenantId: string;
createdAt: Date;
updatedAt: Date;
```

Every action must include:

```ts
tenantId: string;
actorType: "platform_user" | "tenant_user" | "agent" | "system";
actorId: string;
riskLevel: "L0" | "L1" | "L2" | "L3" | "L4";
approvalStatus?: "not_required" | "pending" | "approved" | "rejected";
```

The active tenant context must be visible in the UI wherever a user or agent can change records, launch workflows, connect tools, send messages, approve actions, or inspect memory.

## 6. Data Routing Model

The CRM must route all data through the selected tenant workspace.

### Required Routing Rule

```text
Request
-> Resolve authenticated user
-> Resolve selected tenant
-> Verify user has access to tenant
-> Bind tenantId to request context
-> Execute action inside tenant boundary
-> Emit tenant-scoped audit event
-> Emit tenant-scoped attribution event if applicable
```

### Forbidden Pattern

```ts
contacts.find(...);
leads.find(...);
conversations.find(...);
memory.retrieve(...);
connectors.execute(...);
```

Forbidden global lookups:

- global contact lookup
- global lead lookup
- global conversation lookup
- global agent memory lookup
- global connector execution

### Required Pattern

```ts
tenant.contacts.find(...);
tenant.leads.create(...);
tenant.memory.retrieve(...);
tenant.connectors.execute(...);
tenant.audit.emit(...);
tenant.attribution.emit(...);
```

Cross-tenant search is forbidden except for approved platform-level admin reporting. Platform-level reporting must be read-only, audited, permissioned, and explicit about aggregation scope.

## 7. HubSpot-Like Functional Scope

The goal is not to blindly clone HubSpot.

The goal is to provide the core CRM operating surface that clients actually use, with AJ Digital OS intelligence layered on top.

### Core HubSpot-Like Objects

- Contacts
- Companies
- Deals / Opportunities
- Pipelines
- Tasks
- Notes
- Activities
- Forms
- Bookings
- Quotes
- Invoices
- Products / Services
- Conversations
- Inbox
- Reporting
- Workflows
- Users / Teams
- Permissions

### Core UX Expectations

- A left-nav CRM shell with stable tenant context.
- Dense list, board, detail, inbox, calendar, and report views.
- Search, filter, sort, bulk selection, saved views, and ownership assignment.
- Clear object relationships: contact -> company -> opportunity -> activity -> quote/invoice.
- Fast lead triage and follow-up workflows.
- Approval status surfaced before any outbound or high-risk action.
- Activity timelines that merge human, connector, workflow, and agent actions.

## 8. AJ Digital OS Extensions

AJ Digital extensions:

- business memory per tenant
- AI receptionist per tenant
- lead intelligence per tenant
- revenue leak detection
- attribution events
- MAP scoring
- approval inbox
- agent run logs
- client health dashboard
- follow-up intelligence
- stale lead recovery
- speed-to-lead monitoring
- missed-call revenue recovery
- client-owned knowledge base

These extensions must use AJ Digital OS primitives:

- Control Plane / Kernel for action gating.
- Connector / Driver Layer for external tools.
- Data Normalization Layer for CRM objects.
- Memory Layer for tenant-specific context.
- Intelligence Layer for recommendations and leak detection.
- Orchestration Layer for workflows.
- Agent Execution Layer for AI workers.
- Governance Layer for approvals and policy.
- Interface / Shell Layer for admin, tenant, and approval surfaces.
- Observability Layer for logs and health.
- Attribution Layer for MAP and revenue intelligence.

## 9. Core Data Models

All models are tenant-scoped unless explicitly marked platform-level.

### Tenant

```ts
interface CrmTenant {
  tenantId: string;
  name: string;
  status: "active" | "disabled" | "suspended" | "sandbox";
  ownerUserId: string;
  businessProfileId?: string;
  defaultPipelineId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### User And Membership

```ts
interface TenantMembership {
  tenantId: string;
  userId: string;
  role: "tenant_admin" | "tenant_user";
  status: "active" | "invited" | "disabled";
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Contact

```ts
interface CrmContact {
  tenantId: string;
  contactId: string;
  companyId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  lifecycleStage: "new" | "lead" | "qualified" | "customer" | "inactive";
  ownerUserId?: string;
  source?: string;
  consentStatus?: "unknown" | "opted_in" | "opted_out";
  createdAt: Date;
  updatedAt: Date;
}
```

### Company

```ts
interface CrmCompany {
  tenantId: string;
  companyId: string;
  name: string;
  domain?: string;
  industry?: string;
  ownerUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Lead

```ts
interface CrmLead {
  tenantId: string;
  leadId: string;
  contactId?: string;
  companyId?: string;
  status: "new" | "working" | "qualified" | "unqualified" | "converted" | "lost";
  source?: string;
  score?: number;
  urgency?: "low" | "medium" | "high";
  ownerUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Opportunity

```ts
interface CrmOpportunity {
  tenantId: string;
  opportunityId: string;
  pipelineId: string;
  stageId: string;
  contactId?: string;
  companyId?: string;
  value?: number;
  currency?: string;
  expectedCloseDate?: Date;
  status: "open" | "won" | "lost";
  createdAt: Date;
  updatedAt: Date;
}
```

### Pipeline And Stage

```ts
interface CrmPipeline {
  tenantId: string;
  pipelineId: string;
  name: string;
  objectType: "lead" | "opportunity";
  stages: CrmPipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

interface CrmPipelineStage {
  stageId: string;
  name: string;
  order: number;
  probability?: number;
  requiresApproval?: boolean;
}
```

### Conversation

```ts
interface CrmConversation {
  tenantId: string;
  conversationId: string;
  channel: "phone" | "sms" | "email" | "chat" | "form" | "manual";
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  assignedUserId?: string;
  status: "open" | "pending" | "closed";
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Task

```ts
interface CrmTask {
  tenantId: string;
  taskId: string;
  title: string;
  status: "open" | "done" | "cancelled";
  dueAt?: Date;
  assignedUserId?: string;
  relatedObjectType?: "contact" | "company" | "lead" | "opportunity" | "conversation";
  relatedObjectId?: string;
  createdByActorId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Quote And Invoice

```ts
interface CrmCommercialDocument {
  tenantId: string;
  documentId: string;
  type: "quote" | "invoice";
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  status: "draft" | "sent" | "accepted" | "paid" | "void" | "expired";
  amount: number;
  currency: string;
  externalProvider?: string;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Tenant Memory Record

```ts
interface CrmTenantMemoryRecord {
  tenantId: string;
  memoryId: string;
  namespace: "business_profile" | "knowledge_base" | "conversation" | "attribution" | "agent";
  sourceObjectType?: string;
  sourceObjectId?: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  createdAt: Date;
  updatedAt: Date;
}
```

## 10. Required Workflows

### Tenant Provisioning

```text
AJ platform admin creates tenant
-> provision default settings
-> provision default pipeline
-> provision default dashboard
-> provision default agents
-> invite tenant admin
-> emit platform audit event
```

### Lead Intake

```text
Inbound form/call/chat/email
-> resolve tenant from route, domain, number, form, or connector
-> create/update contact
-> create lead
-> classify source
-> score lead
-> create task if follow-up required
-> emit audit event
-> emit attribution event
```

### Speed-To-Lead

```text
New lead
-> start response timer
-> check business hours and receptionist rules
-> draft or trigger approved response
-> create follow-up task
-> monitor response latency
-> flag SLA breach
-> emit speed-to-lead attribution event
```

### Missed-Call Recovery

```text
Missed call
-> match or create contact
-> create conversation
-> classify urgency
-> draft callback/SMS
-> request approval if outbound action is gated
-> create recovery task
-> emit missed-call recovery event
```

### Quote / Invoice Tracking

```text
Opportunity reaches quote stage
-> generate or import quote
-> associate quote with contact/company/opportunity
-> monitor sent/accepted/paid state
-> attribute won revenue to source, workflow, and agent influence
```

### Approval-Governed Outbound Action

```text
Agent drafts outbound action
-> calculate risk level
-> check tenant policy
-> create approval request if required
-> tenant admin approves/rejects
-> execute approved action
-> write audit event
-> write attribution event if meaningful
```

## 11. Agents

Tenant agents are AI workers operating inside one explicit tenant context.

Required agents:

- AI receptionist agent
- lead triage agent
- conversation summary agent
- follow-up draft agent
- stale lead recovery agent
- attribution analyst agent
- revenue leak detection agent
- CRM data hygiene agent
- client health analyst agent

Every agent must declare:

```ts
interface CrmTenantAgent {
  tenantId: string;
  agentId: string;
  role: string;
  allowedActions: string[];
  forbiddenActions: string[];
  requiredConnectors: string[];
  memoryScope: "tenant";
  approvalRequiredFor: string[];
  outputSchema: unknown;
  createdAt: Date;
  updatedAt: Date;
}
```

Agent execution requirements:

- Every run receives `tenantId`.
- Every memory lookup is tenant-scoped.
- Every connector call is tenant-scoped.
- Every generated outbound action is approval-gated according to tenant policy.
- Every meaningful recommendation or action emits audit and attribution events.

## 12. Connectors

Connectors must be tenant-scoped and credential-scoped.

Required connector categories:

- email
- calendar
- phone
- SMS
- web chat
- form builder
- website intake
- payment processor
- accounting or invoicing
- CRM import/export
- Google Workspace
- analytics
- ad platforms
- file storage

Connector requirements:

- Credentials belong to exactly one tenant unless explicitly platform-owned infrastructure credentials are used for shared plumbing.
- Connector execution requires resolved `tenantId`.
- Connector logs must never expose credential values.
- Connector failures must be visible in tenant health.
- Connector events that affect lead, revenue, follow-up, or attribution state must emit tenant-scoped attribution events.

## 13. Governance And Approval Rules

The CRM module must use AJ Digital OS governance and approval doctrine.

Approval required by default:

- outbound SMS/email/voice action initiated by an agent
- quote/invoice send
- payment setting change
- connector credential connection or revocation
- contact export
- bulk update
- deletion
- pipeline automation that affects customer communication
- billing or tenant plan changes
- cross-tenant reporting export

Risk levels:

| Level | Meaning | Example |
|---|---|---|
| L0 | Read-only | View contact, inspect dashboard |
| L1 | Low-risk internal write | Add internal note, create draft task |
| L2 | Tenant operational write | Move lead stage, assign owner |
| L3 | External or sensitive action | Send message, update invoice, export records |
| L4 | Platform/admin/high-impact action | Disable tenant, change billing, cross-tenant reporting |

No approval rule may allow an agent to cross tenant boundaries.

## 14. Attribution Events

The CRM module must emit tenant-scoped attribution events for meaningful business actions.

Required attribution event families:

- lead_created
- lead_source_classified
- lead_scored
- lead_qualified
- lead_disqualified
- speed_to_lead_timer_started
- speed_to_lead_sla_met
- speed_to_lead_sla_missed
- missed_call_detected
- missed_call_recovered
- conversation_summarized
- follow_up_task_created
- follow_up_sent
- stale_lead_flagged
- stale_lead_recovered
- quote_created
- quote_sent
- quote_accepted
- invoice_created
- invoice_paid
- opportunity_created
- opportunity_stage_changed
- opportunity_won
- opportunity_lost
- revenue_leak_detected
- agent_recommendation_created
- agent_action_approved
- agent_action_rejected
- workflow_completed

Every attribution event must include:

```ts
tenantId: string;
eventType: string;
actorType: "platform_user" | "tenant_user" | "agent" | "system";
actorId: string;
relatedContactId?: string;
relatedLeadId?: string;
relatedOpportunityId?: string;
relatedConversationId?: string;
relatedWorkflowId?: string;
relatedAgentRunId?: string;
mapScore?: {
  meaningful: number;
  actionable: number;
  profitable: number;
  total: number;
};
occurredAt: Date;
```

## 15. Observability Requirements

The CRM module must make tenant health and workflow health observable.

Required observability surfaces:

- tenant health dashboard
- connector health dashboard
- agent run log
- approval queue metrics
- speed-to-lead metrics
- missed-call recovery metrics
- stale lead metrics
- follow-up latency metrics
- quote/invoice state metrics
- attribution coverage metrics
- audit log explorer
- workflow failure queue
- API error rate by tenant
- connector failure rate by tenant

Required dimensions:

- tenantId
- actorType
- actorId
- objectType
- objectId
- connectorId
- agentId
- workflowId
- riskLevel
- approvalStatus
- source
- outcome

## 16. Security Requirements

Security requirements:

- Tenant isolation is mandatory.
- All API routes must verify tenant access.
- All mutable actions must pass permission and approval policy.
- Tenant users can only access assigned or permitted tenant records.
- Tenant agents can only access their assigned tenant.
- Connector credentials must be encrypted or stored through an approved credential vault.
- Secrets must never be logged, embedded in memory, or sent to agents as raw values.
- Exports require approval and audit.
- Deletions require approval and soft-delete retention where practical.
- Cross-tenant admin reporting must be read-only, explicit, audited, and permissioned.
- Client data classification must support public, internal, confidential, and restricted data.
- Production deployment must include cross-tenant isolation tests before acceptance.

## 17. UI Requirements

The UI should be HubSpot-like in familiarity but AJ Digital OS-native in governance, memory, attribution, and intelligence.

Required platform admin views:

- tenant switcher
- tenant directory
- tenant health dashboard
- tenant provisioning flow
- platform-level module settings
- cross-tenant reporting with explicit admin mode
- platform audit explorer

Required tenant views:

- CRM dashboard
- contacts
- companies
- leads
- opportunities
- pipeline board
- tasks
- inbox / conversations
- forms
- bookings
- quotes
- invoices
- products / services
- reports
- workflows
- users / teams
- permissions
- AI receptionist settings
- business profile
- knowledge base
- connectors
- approval inbox
- agent run logs
- attribution dashboard

UI doctrine:

- The active tenant context must be visible before state-changing actions.
- Approval-required actions must be visually distinct from immediate actions.
- AI-generated drafts must be labeled as drafts until approved or sent by an authorized user.
- Audit and attribution context should be available from object timelines.
- Platform admin mode must be visually distinct from tenant workspace mode.

## 18. Tenant Isolation Acceptance Criteria

The build is not accepted unless all of the following are true:

- Every tenant-scoped table includes `tenantId`.
- Every API route verifies tenant access.
- Every agent execution receives an explicit tenant context.
- Every connector credential is scoped to one tenant.
- Every memory lookup is tenant-scoped.
- Every attribution event is tenant-scoped.
- Every audit event is tenant-scoped.
- Platform admin can switch tenant context.
- Tenant user cannot access another tenant.
- Tenant agent cannot access another tenant.
- Cross-tenant search is forbidden except for approved platform-level admin reporting.
- Test suite includes cross-tenant isolation tests.
- Seed data includes at least two tenants to prove isolation.

## 19. MVP Acceptance Criteria

MVP is accepted only when these capabilities exist and are validated:

- Platform admin can create and disable tenants.
- Platform admin can switch active tenant context.
- Tenant admin can invite users and assign roles.
- Tenant admin can configure business profile and AI receptionist rules.
- Tenant-scoped contacts, companies, leads, opportunities, pipelines, tasks, notes, conversations, forms, bookings, quotes, invoices, products/services, settings, and permissions exist.
- Tenant users can create, update, and search permitted CRM objects inside their tenant.
- Tenant users cannot see another tenant's CRM objects.
- At least two tenants exist in seed/test data.
- All tenant-scoped API routes enforce `tenantId`.
- AI receptionist and lead triage agents run only with explicit tenant context.
- Outbound AI actions require approval before send.
- Connector credentials are tenant-scoped.
- Tenant-scoped audit logs exist for state-changing actions.
- Tenant-scoped attribution events exist for lead, conversation, follow-up, quote, invoice, and opportunity milestones.
- Dashboard exposes tenant health, pipeline status, approval queue, agent run logs, and attribution summary.
- Cross-tenant isolation tests pass.

## 20. Non-MVP Scope

Non-MVP:

- full website builder
- unlimited white-label agency resale controls
- marketplace or plugin ecosystem
- advanced custom object builder
- full accounting system replacement
- payroll
- inventory management
- open-ended cross-tenant analytics
- unsupervised outbound AI actions
- autonomous deletion or export
- production migration of all historical client data
- external data warehouse sync
- public API for third-party developers
- mobile native applications

## 21. Recommended Implementation Sequence

1. Confirm data model and tenant context contract.
2. Create tenant registry and membership model.
3. Add seed data with at least two tenants.
4. Build tenant context resolver and tenant access guard.
5. Define CRM normalized object schemas.
6. Implement tenant-scoped persistence for core objects.
7. Add cross-tenant isolation tests before broad UI work.
8. Build platform admin tenant switcher and tenant directory.
9. Build tenant CRM shell and core object views.
10. Add pipelines, tasks, conversations, and activity timelines.
11. Add approval inbox and outbound action gates.
12. Add tenant-scoped agent execution contracts.
13. Add tenant-scoped connector registry and credential metadata.
14. Add tenant-scoped attribution events.
15. Add observability and tenant health views.
16. Add AI receptionist, speed-to-lead, missed-call recovery, and stale-lead workflows.
17. Add quote/invoice tracking and revenue influence reporting.
18. Run full security, isolation, permission, and acceptance validation.

## 22. Competitive Offer Positioning

AJ Digital CRM Module exists as the CRM/application layer inside the broader Founder Intelligence System offer.

The module should compete with tools like HubSpot, GoHighLevel, Pipedrive, LeadStack, and agency white-label CRMs on surface functionality, but differentiate through AJ Digital OS architecture.

### Competitor Offer Pattern

Competitors sell:

- CRM replacement
- unlimited subaccounts
- AI receptionist
- forms
- automations
- booking pages
- quotes and invoices
- website builder
- lower subscription cost
- agency white-label ownership

### AJ Digital Offer Pattern

AJ Digital sells:

- Founder Intelligence System
- multi-tenant client-owned CRM
- business memory
- lead intelligence
- speed-to-lead monitoring
- missed-call recovery
- revenue leak detection
- attribution tracking
- AI receptionist
- approval-governed automations
- client dashboards
- operating system for founder-led revenue operations

### Required Differentiation

The CRM module must not only store CRM data.

It must answer:

- Which leads are being lost?
- Which follow-ups are late?
- Which calls created revenue?
- Which campaigns produced qualified opportunities?
- Which client workspace is unhealthy?
- Which automations need intervention?
- Which agent action influenced revenue?
- Which business process is leaking money?

### Product Doctrine

LeadStack is a business in a repo.

AJ Digital CRM Module is a revenue intelligence system inside a founder operating system.

## 23. Missing Decisions

These decisions remain open before implementation:

- Primary database target for CRM persistence: Supabase Postgres or Neon Postgres.
- Tenant identity mapping details between CRM `tenantId`, database `tenant_id`, and existing platform `client_id`.
- Authentication provider and session model.
- Tenant membership and role granularity beyond MVP roles.
- Credential vault provider and encryption strategy.
- Billing ownership model for client payment connectors.
- Data retention policy by tenant and object type.
- Import strategy from HubSpot, GoHighLevel, Pipedrive, spreadsheets, or existing client systems.
- Exact UI package and route placement for the CRM shell.
- Which outbound channels are enabled in MVP.
- Whether cross-tenant platform reporting is limited to health metrics or includes revenue rollups.
