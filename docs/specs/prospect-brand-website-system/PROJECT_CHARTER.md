---
title: AJ Digital Prospect-to-Personal-Brand Website System — Project Charter and Build Specification
document_type: project_charter
version: 0.1-draft
status: proposal
canonical: false
authority: operator-review-required
owner: AJ Digital LLC
created: 2026-07-19
primary_scope: applications
touched_scopes:
  - governance
  - connectors
  - ingestion
  - normalization
  - memory
  - intelligence
  - orchestration
  - agent-execution
  - interface
  - observability
  - attribution
  - optimization
classification: internal
execution_mode: documentation-first
implementation_authority: not-granted
---

# AJ Digital Prospect-to-Personal-Brand Website System

## Project Charter and Build Specification

## 0. Document Purpose

This document defines the initial charter, operating model, documentation architecture, workflow, automation boundaries, and Codex execution instructions for a repeatable AJ Digital service that:

1. Identifies a founder, executive, expert, creator, or business owner as a prospective client.
2. Evaluates the prospect's existing digital footprint.
3. Acquires or reserves a strategically suitable domain through Cloudflare after explicit operator approval.
4. Aggregates public-source and operator-provided information.
5. Converts that information into a structured prospect knowledge base.
6. Identifies credibility, discoverability, positioning, brand, SEO, AEO, GEO, and conversion gaps.
7. Produces a diagnostic report and opportunity map.
8. Generates a preliminary personal-brand website strategy and mock website.
9. Uses the mock website and diagnostic evidence to begin a consultative sales process.
10. Converts accepted prospects into governed AJ Digital client projects with durable documentation, deliverables, and operational memory.
11. Automates repeatable steps while preserving human approval for financial, reputational, legal, identity, publishing, and outreach actions.

This is a foundational specification. It is intended to establish the system's first governed version and create the basis for future SOPs, schemas, templates, agents, connectors, pricing models, and implementation plans.

---

# 1. Review / Diagnosis

## 1.1 Current Opportunity

AJ Digital is developing a proactive personal-brand website service for prospects who have an incomplete, fragmented, outdated, weak, or nonexistent owned web presence.

The commercial thesis is:

> For founders, experts, executives, and public-facing business operators, an owned personal-brand website is becoming a baseline credibility and discoverability asset rather than an optional marketing accessory.

The service does not begin with a generic website sale. It begins with evidence:

- What appears when the prospect is searched?
- What information is missing?
- Which third-party platforms currently define the person's identity?
- Is the prospect's expertise legible to humans and machines?
- Can search engines and answer engines identify the person's entities, offers, proof, and authority?
- Is there an owned destination for branded search demand?
- Are social profiles, company pages, press references, and product pages connected into a coherent identity?
- Is the person's positioning strong enough to support a credible website?
- Which missing brand and offer assets create additional consulting opportunities?

The resulting diagnostic, documentation, and mock website are sales-enablement assets as well as potential client deliverables.

## 1.2 Current Process Risk

Without a governed system, the process is vulnerable to:

- Repeating manual research for every prospect.
- Inconsistent source capture and attribution.
- Invented or overconfident claims.
- Weak distinction between facts, inferences, assumptions, and recommendations.
- Unstructured client folders.
- Documentation that cannot be reliably consumed by agents.
- Duplicate files across the AJ Vault, local external drive, and repositories.
- Domain purchases made without sufficient approval or ownership records.
- Public mock sites accidentally appearing official.
- Unapproved outreach or publication.
- Brand recommendations that exceed the available evidence.
- Unclear pricing and packaging.
- Scope creep from website mock-up into full brand strategy.
- Research assets becoming stranded after a sale or rejection.
- Agent access to one prospect's information while working on another.
- Automation that executes financial or reputational actions without an operator gate.

## 1.3 Project Classification

This project is initially classified as:

```yaml
project:
  type: internal-operating-capability
  complexity_tier: 4
  delivery_model: documentation-first
  client_impact: indirect-then-direct
  automation_risk: medium-to-high
```

The system is Tier 4 because it touches:

- AJ Digital OS architecture.
- Client and prospect memory.
- Local filesystem provisioning.
- Obsidian knowledge structures.
- Public web research.
- Cloudflare and domain operations.
- Website generation and deployment.
- Agent orchestration.
- Sales workflows.
- Financial approvals.
- Attribution and reporting.
- Potential multi-client isolation.

---

# 2. Decision

## Proceed

Build a governed, modular **Prospect-to-Personal-Brand Website System** inside AJ Digital OS.

The first execution phase must be:

```text
Inspect
→ Map
→ Design
→ Document
→ Validate
```

Not:

```text
Assume
→ Automate
→ Purchase
→ Publish
```

The initial Codex task is primarily diagnostic and documentation-oriented. It may create low-risk templates, schemas, fixtures, and local scaffolding only when current repository doctrine authorizes those changes.

It must not automatically:

- Purchase a domain.
- Transfer a domain.
- change nameservers.
- publish a prospect-facing website.
- contact a prospect.
- create public claims in the prospect's name.
- impersonate the prospect.
- commit secrets.
- alter canonical AJ Vault doctrine.
- reorganize the external client drive.
- create or merge a pull request without operator approval.

---

# 3. Working Name and Service Positioning

## 3.1 Internal System Name

Recommended internal working name:

```text
AJ Digital Prospect-to-Brand Website System
```

Alternative internal names that may be evaluated:

- Prospect Brand Bootstrap System
- Founder Presence Bootstrap System
- Digital Authority Launch System
- Owned Presence Opportunity Engine
- Personal Brand Prospecting System

The internal name is provisional and must not become client-facing doctrine without review.

## 3.2 Client-Facing Category

The service should be positioned as a combination of:

- Digital-presence diagnostic.
- Personal-brand foundation.
- Owned web presence.
- Authority and discoverability architecture.
- Website strategy and implementation.
- Optional positioning and brand consultation.

It should not be presented merely as:

```text
A five-page website.
```

A stronger framing is:

> AJ Digital identifies where a founder's digital identity, authority, and discoverability are fragmented, then builds the owned website and brand foundation needed to make that identity clear to customers, search engines, and AI answer systems.

## 3.3 Commercial Wedge

The preliminary website mock-up is the visual wedge.

The diagnostic report is the evidentiary wedge.

The deeper consultation is the strategic upsell.

The final website and ongoing authority system are the implementation and recurring-revenue opportunities.

---

# 4. Project Vision

Create a repeatable AJ Digital operating capability that converts an identified prospect into a structured, evidence-backed personal-brand opportunity package with minimal repetitive manual work and strong operator control.

The system should make it possible to initiate a governed prospect project from a small intake record containing, at minimum:

```yaml
prospect:
  name: string
  known_urls: []
  known_company: string | null
  operator_notes: string | null
  proposed_domain: string | null
```

From that intake, the system should support generation of:

- A source registry.
- A prospect profile.
- A digital-footprint inventory.
- An evidence and claim ledger.
- A gap analysis.
- An opportunity matrix.
- A preliminary brand asset inventory.
- A mock-site content brief.
- A sitemap.
- A wireframe or website mock.
- A client-facing diagnostic report.
- A consultation agenda.
- A proposal-ready scope.
- A governed local project folder.
- An Obsidian project index.
- A task and approval record.
- An audit trail.

---

# 5. Project Mission

Build the documentation, schemas, SOPs, connector boundaries, and automation design required to turn AJ Digital's proactive personal-brand website process into a repeatable, agent-ready service line.

The system must support AJ Digital's broader operating philosophy:

```text
Diagnosis before prescription.
Intelligence before automation.
Evidence before claims.
Structure before scale.
Human approval before irreversible action.
Owned assets before platform dependency.
Documentation before agent execution.
```

---

# 6. Business Objectives

## 6.1 Primary Objectives

1. Reduce the time required to research and prepare a qualified prospect.
2. Increase sales conversion by showing the prospect a concrete gap and a credible future state.
3. Productize the research, diagnostic, brand-foundation, website, and consultation process.
4. Create reusable prospect and client documentation that agents can safely consume.
5. Establish a consistent local and Obsidian storage model.
6. Build a clear pricing and packaging framework.
7. Distinguish what can be automated from what requires operator review.
8. Create an extensible foundation that can later support multi-agent execution.
9. Track cost, time, conversion, and revenue attribution per prospect.
10. Preserve prospect-specific evidence and avoid cross-client contamination.

## 6.2 Secondary Objectives

- Build a library of reusable website sections and personal-brand patterns.
- Build a taxonomy of digital-presence gaps.
- Build reusable prompts and research rubrics.
- Create a repeatable consultation upsell motion.
- Create recurring services around website operation, content, AEO/SEO/GEO, analytics, authority development, and business memory.
- Create benchmarks showing what a strong founder-owned web presence contains.
- Develop future scoring models for prospect fit and opportunity size.

---

# 7. Non-Goals for Version 0.1

Version 0.1 will not attempt to:

- Fully automate domain purchases.
- Fully automate legal brand clearance.
- Produce a definitive trademark analysis.
- Invent a prospect's USP, mission, personal story, niche, or zone of genius.
- Treat inferred positioning as client-approved truth.
- Publish production websites without approval.
- automate cold outreach without an approved outreach standard.
- scrape platforms in violation of their terms or access controls.
- bypass authentication, robots controls, rate limits, or paywalls.
- create a universal brand identity without human consultation.
- build a complete CRM.
- replace the AJ Digital Vault.
- create a separate Obsidian vault per prospect by default.
- migrate existing client folders before a filesystem audit and approved migration plan.
- refactor unrelated AJ Digital OS modules.
- commit credentials or personal data into Git.

---

# 8. Governing Principles

## 8.1 Evidence Discipline

Every material statement must be classified as one of:

```yaml
evidence_class:
  - verified_fact
  - attributed_claim
  - inference
  - assumption
  - recommendation
  - unknown
```

Every verified fact or attributed claim must preserve:

- Source URL or source-file reference.
- Retrieval date.
- Quoted or summarized evidence.
- Source type.
- Confidence.
- Whether it is safe for public use.
- Whether client verification is required.

## 8.2 No Fabricated Identity

Agents must not fabricate:

- Credentials.
- Client history.
- Revenue.
- awards.
- partnerships.
- testimonials.
- press coverage.
- education.
- personal values.
- origin stories.
- client outcomes.
- service claims.
- biographies.

Missing information is a gap, not permission to invent.

## 8.3 Draft-State Transparency

Prospect-facing mock sites must clearly remain:

```yaml
site_status:
  - internal_mock
  - private_preview
  - client_review
  - approved_for_publication
  - production
```

A mock must not imply endorsement, authorization, or an official relationship.

## 8.4 Human Approval Boundaries

Human approval is mandatory for:

- Domain purchase.
- Domain transfer.
- Domain renewal commitment.
- Nameserver changes.
- DNS changes affecting live services.
- Public deployment.
- Prospect outreach.
- Proposal delivery.
- Price quotation.
- Use of sensitive or ambiguous personal information.
- Publication of inferred claims.
- Destructive file operations.
- Canonical doctrine changes.
- Secrets access.
- Paid API usage above an approved threshold.

## 8.5 Client and Prospect Isolation

Every prospect or client project must have an explicit identifier.

All records, files, generated content, logs, and agent runs must resolve to that identifier.

No agent may combine one prospect's data with another prospect's project unless the operation is an explicitly approved benchmark analysis using sanitized data.

---

# 9. Target Operating Model

## 9.1 Lifecycle

```text
Prospect Identified
        ↓
Prospect Intake Created
        ↓
Domain Candidate Evaluated
        ↓
Operator Domain Decision
        ↓
Public-Source Research
        ↓
Source Normalization
        ↓
Evidence and Claim Ledger
        ↓
Digital Presence Diagnostic
        ↓
Brand Asset Inventory
        ↓
Gap and Opportunity Analysis
        ↓
Mock-Site Strategy
        ↓
Content and Sitemap Draft
        ↓
Private Mock Build
        ↓
Internal QA
        ↓
Sales Brief and Consultation Plan
        ↓
Operator Approval
        ↓
Prospect Outreach
        ↓
Discovery / Consultation
        ↓
Refinement and Proposal
        ↓
Client Conversion or Archive
        ↓
Production Delivery
        ↓
Ongoing Authority and Optimization
```

## 9.2 Prospect State Machine

```yaml
prospect_status:
  - identified
  - intake_pending
  - research_ready
  - researching
  - evidence_review
  - diagnostic_ready
  - mock_planning
  - mock_building
  - internal_review
  - pitch_ready
  - contacted
  - discovery_scheduled
  - proposal_pending
  - won
  - lost
  - nurture
  - archived
```

Transitions must be explicit, auditable, and reversible where practical.

---

# 10. Core Workstreams

## Workstream A — Current-State Diagnostics

Inspect and document:

- AJ Digital OS repository layout.
- Existing canonical architecture and governance documents.
- Existing client folder doctrine.
- Existing Obsidian AJ Vault client structure.
- Current external-drive client project paths.
- Existing prospect or client templates.
- Current research workflows.
- Existing website templates and design systems.
- Existing Cloudflare tooling and credentials pattern.
- Existing automation platforms, including n8n or other orchestrators.
- Existing deployment workflows.
- Existing analytics and reporting capabilities.
- Existing naming, metadata, and archival standards.

Required output:

```text
CURRENT_STATE_DIAGNOSTIC.md
```

The diagnostic must distinguish:

- Exists and is canonical.
- Exists but is draft.
- Exists but conflicts.
- Exists but is incomplete.
- Exists in more than one location.
- Missing.
- Unknown because access was unavailable.

## Workstream B — Service and Offer Architecture

Define:

- Ideal customer profile.
- Prospect qualification criteria.
- Trigger conditions.
- Service promise.
- Scope boundaries.
- Inputs.
- Outputs.
- Time requirements.
- Cost drivers.
- Pricing logic.
- Packaging.
- Upsells.
- Recurring services.
- Exclusions.
- Approval requirements.

Required output:

```text
SERVICE_OFFER_ARCHITECTURE.md
```

## Workstream C — Prospect Research and Aggregation

Define the lawful and ethical collection of:

- Official websites.
- Company websites.
- LinkedIn.
- Public social profiles.
- Interviews.
- Podcasts.
- press mentions.
- product pages.
- public event appearances.
- public directories.
- public filings where appropriate.
- operator notes.
- prospect-provided documents.
- prior communications.
- search result observations.
- structured metadata.
- public media assets with usage status.

Required outputs:

```text
RESEARCH_SOP.md
SOURCE_REGISTRY_SCHEMA.yaml
PROSPECT_PROFILE_SCHEMA.yaml
EVIDENCE_CLAIM_LEDGER_SCHEMA.yaml
```

## Workstream D — Digital Gap and Opportunity Analysis

Create a diagnostic model covering:

- Owned website presence.
- Branded search presence.
- Entity clarity.
- Knowledge graph consistency.
- Search snippet quality.
- Social profile consistency.
- Founder-to-company association.
- Offer clarity.
- Audience clarity.
- Proof and credibility.
- biography completeness.
- media and speaking presence.
- conversion pathways.
- contact and booking pathways.
- structured data readiness.
- content coverage.
- technical SEO.
- AEO readiness.
- GEO readiness.
- local search where applicable.
- reputation risks.
- broken, outdated, or conflicting information.
- brand asset maturity.
- privacy and personal-data exposure.
- differentiation.
- competitive whitespace.

Required outputs:

```text
DIGITAL_PRESENCE_DIAGNOSTIC_STANDARD.md
GAP_TAXONOMY.yaml
OPPORTUNITY_SCORING_MODEL.md
CLIENT_FACING_DIAGNOSTIC_REPORT_TEMPLATE.md
```

## Workstream E — Brand Asset Architecture

Define a branched checklist for each asset:

```yaml
asset_status:
  - verified_existing
  - existing_needs_revision
  - partially_available
  - inferred_not_approved
  - missing
  - not_applicable
  - client_input_required
  - consultation_required
```

Asset groups must include:

### Strategy and Positioning

- Brand spine.
- mission.
- vision.
- values.
- brand promise.
- positioning statement.
- category.
- niche.
- ideal audience.
- USP.
- differentiators.
- zone of genius.
- founder narrative.
- offer architecture.
- message hierarchy.
- proof architecture.
- objections.
- calls to action.

### Verbal Identity

- Brand voice.
- tone.
- vocabulary.
- tagline.
- elevator pitch.
- short bio.
- long bio.
- social bio.
- founder introduction.
- service descriptions.
- content pillars.

### Visual Identity

- Logo.
- logo variants.
- marks.
- color palette.
- typography.
- imagery direction.
- photography.
- iconography.
- graphic language.
- layout principles.
- accessibility requirements.
- usage rules.
- brand kit.
- brand guidelines.

### Digital Identity

- Domain.
- social handles.
- profile imagery.
- email identity.
- favicon.
- social preview.
- metadata.
- schema entities.
- canonical links.
- analytics.
- search-console ownership.

Required outputs:

```text
BRAND_ASSET_INVENTORY_TEMPLATE.md
BRAND_DISCOVERY_GAP_REPORT_TEMPLATE.md
BRAND_DOCUMENTATION_ARCHITECTURE.md
```

## Workstream F — Client Documentation Template

Design a reusable, prospect/client-specific documentation architecture that inherits AJ Digital OS principles but remains proportionate to the project.

Recommended logical structure:

```text
<CLIENT_OR_PROSPECT_ROOT>/
├── 00-CONTROL/
│   ├── PROJECT_INDEX.md
│   ├── STATUS.md
│   ├── APPROVALS.md
│   ├── DECISION_LOG.md
│   ├── RISK_REGISTER.md
│   └── SOURCE_REGISTER.md
├── 01-INTAKE/
│   ├── PROSPECT_INTAKE.md
│   ├── COMMUNICATION_NOTES.md
│   ├── CLIENT_PROVIDED_FACTS.md
│   └── OPEN_QUESTIONS.md
├── 02-RESEARCH/
│   ├── SOURCE_INVENTORY.md
│   ├── DIGITAL_FOOTPRINT.md
│   ├── SEARCH_PRESENCE.md
│   ├── SOCIAL_PROFILES.md
│   ├── PRESS_AND_MEDIA.md
│   ├── COMPETITIVE_CONTEXT.md
│   └── EVIDENCE_CLAIM_LEDGER.md
├── 03-STRATEGY/
│   ├── POSITIONING.md
│   ├── AUDIENCE.md
│   ├── OFFER_ARCHITECTURE.md
│   ├── MESSAGE_ARCHITECTURE.md
│   ├── AUTHORITY_STRATEGY.md
│   └── CONTENT_PILLARS.md
├── 04-BRAND/
│   ├── BRAND_SPINE.md
│   ├── VERBAL_IDENTITY.md
│   ├── VISUAL_DIRECTION.md
│   ├── COLOR_PALETTE.md
│   ├── TYPOGRAPHY.md
│   ├── IMAGE_DIRECTION.md
│   ├── BRAND_ASSET_INVENTORY.md
│   └── BRAND_GUIDELINES.md
├── 05-DIAGNOSTICS/
│   ├── DIGITAL_PRESENCE_DIAGNOSTIC.md
│   ├── SEO_AEO_GEO_GAP_ANALYSIS.md
│   ├── CREDIBILITY_GAP_ANALYSIS.md
│   ├── OPPORTUNITY_MATRIX.md
│   └── RECOMMENDATIONS.md
├── 06-WEBSITE/
│   ├── WEBSITE_BRIEF.md
│   ├── SITEMAP.md
│   ├── USER_JOURNEYS.md
│   ├── PAGE_REQUIREMENTS.md
│   ├── CONTENT_MODEL.md
│   ├── COPY_DECK.md
│   ├── STRUCTURED_DATA_PLAN.md
│   └── ACCEPTANCE_CRITERIA.md
├── 07-DESIGN/
│   ├── MOODBOARD.md
│   ├── WIREFRAMES/
│   ├── MOCKUPS/
│   ├── DESIGN_SYSTEM.md
│   └── DESIGN_REVIEW.md
├── 08-BUILD/
│   ├── BUILD_PLAN.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DEPLOYMENT_PLAN.md
│   ├── QA_PLAN.md
│   └── CHANGELOG.md
├── 09-SALES/
│   ├── PITCH_BRIEF.md
│   ├── CONSULTATION_AGENDA.md
│   ├── SCOPE_OPTIONS.md
│   ├── PRICING_WORKSHEET.md
│   └── PROPOSAL_INPUTS.md
├── 10-DELIVERABLES/
│   ├── REPORTS/
│   ├── BRAND/
│   ├── WEBSITE/
│   └── EXPORTS/
├── 11-OPERATIONS/
│   ├── DOMAIN_RECORD.md
│   ├── ACCESS_REGISTER.md
│   ├── ANALYTICS.md
│   ├── MAINTENANCE.md
│   └── RUNBOOK.md
└── 99-ARCHIVE/
```

This is a proposed logical template, not an authorization to impose these paths.

Codex must first locate the actual canonical AJ Vault and external-drive conventions and then produce:

```text
CLIENT_PROJECT_DOCUMENTATION_TEMPLATE_PROPOSAL.md
PATH_MAPPING_AND_RECONCILIATION_REPORT.md
```

## Workstream G — Domain and Cloudflare Operations

Design a capability matrix that distinguishes:

- Domain availability search.
- Registrar eligibility.
- Purchase.
- registration data.
- renewal.
- transfer.
- lock status.
- nameserver management.
- DNS record management.
- SSL/TLS.
- redirects.
- email routing.
- security.
- analytics.

Critical rule:

> Do not assume that a Cloudflare API or MCP supports domain registration purchases merely because Cloudflare supports DNS APIs.

Codex must verify current official Cloudflare documentation before proposing an executable purchase workflow.

Required documents:

```text
CLOUDFLARE_DOMAIN_OPERATIONS_CAPABILITY_MATRIX.md
DOMAIN_ACQUISITION_SOP.md
DOMAIN_APPROVAL_SCHEMA.yaml
DOMAIN_RECORD_TEMPLATE.md
```

Minimum domain record:

```yaml
domain_record:
  prospect_id: string
  domain: string
  registrar: cloudflare
  purchase_status: proposed
  operator_approval_ref: null
  registrant_owner: null
  beneficial_owner: null
  payment_source_ref: null
  purchase_price: null
  renewal_price: null
  auto_renew: null
  acquired_at: null
  renewal_at: null
  transfer_policy_reviewed: false
  intended_disposition:
    - aj_owned_speculative
    - held_for_transfer
    - client_owned
    - unknown
  legal_and_ethics_review:
    trademark_risk: unknown
    impersonation_risk: unknown
    cybersquatting_risk: unknown
  notes: null
```

The project must explicitly define:

- Who legally owns a prospect domain before conversion.
- Whether AJ Digital transfers it, licenses it, includes it, or sells it.
- How acquisition cost is recovered.
- What happens if the prospect declines.
- Renewal and expiration policy.
- Trademark and naming-risk review.
- Refund and cancellation limitations.
- Accounting treatment.
- Required approval.
- Audit retention.

## Workstream H — Mock Website Generation

Define the mock generation pipeline:

```text
Approved Research
→ Approved Claim Set
→ Website Strategy
→ Sitemap
→ Page Briefs
→ Draft Copy
→ Visual Direction
→ Private Mock
→ QA
→ Pitch Asset
```

Minimum mock-site pages:

- Home.
- About.
- Expertise or Services.
- Proof, Work, Media, or Portfolio.
- Insights or Resources.
- Contact or Booking.

Actual page count must respond to evidence and use case.

The system must distinguish:

- Evidence-backed copy.
- Placeholder copy.
- inferred positioning.
- consultation questions.
- client approval required.

Required outputs:

```text
MOCK_SITE_GENERATION_SOP.md
WEBSITE_BRIEF_TEMPLATE.md
SITEMAP_TEMPLATE.md
PAGE_BRIEF_TEMPLATE.md
COPY_DECK_TEMPLATE.md
MOCK_SITE_QA_CHECKLIST.md
```

## Workstream I — Sales Enablement

Define how the diagnostic and mock become a consultative pitch.

Required pitch structure:

1. What was reviewed.
2. What is objectively visible now.
3. What is missing or fragmented.
4. Why the gap matters.
5. What the private mock demonstrates.
6. Which assumptions require the prospect's input.
7. What can be delivered immediately.
8. What deeper strategy requires consultation.
9. Package choices.
10. Next step.

Required outputs:

```text
PITCH_BRIEF_TEMPLATE.md
CONSULTATION_AGENDA_TEMPLATE.md
DISCOVERY_QUESTION_BANK.md
PROPOSAL_SCOPE_TEMPLATE.md
FOLLOW_UP_SEQUENCE_DRAFT.md
```

Outreach automation is excluded until an explicit outreach and approval standard exists.

## Workstream J — Pricing and Packaging

Codex must create a pricing model, not invent a final price without cost evidence.

The model must calculate:

- Domain acquisition.
- Research labor.
- AI/API usage.
- visual asset work.
- copywriting.
- design.
- development.
- deployment.
- project management.
- consultation time.
- revisions.
- software subscriptions.
- payment fees.
- support.
- risk reserve.
- gross margin.
- opportunity cost.

Proposed packaging hypotheses to evaluate:

### Package 1 — Presence Diagnostic

Potential contents:

- Digital footprint review.
- gap report.
- brand asset inventory.
- opportunity matrix.
- consultation.

### Package 2 — Personal Brand Foundation

Potential contents:

- Diagnostic.
- positioning workshop.
- brand spine.
- verbal foundation.
- preliminary visual direction.
- website strategy.

### Package 3 — Personal Brand Website

Potential contents:

- Foundation.
- website copy.
- responsive site.
- domain and DNS setup.
- analytics.
- structured data.
- basic SEO/AEO/GEO implementation.
- launch.

### Package 4 — Founder Authority System

Potential contents:

- Website.
- ongoing content.
- authority asset development.
- AEO/SEO/GEO optimization.
- analytics and reporting.
- profile consistency.
- business memory.
- recurring strategic review.

### Speculative Build Option

The system may evaluate a proactive mock-site option where AJ Digital absorbs pre-sale cost.

That model must quantify:

```text
Expected Gross Profit per Won Project
× Conversion Probability
− Average Pre-Sale Build Cost
− Domain Carrying Cost
− Unrecovered Prospecting Cost
```

Required outputs:

```text
PRICING_STRATEGY.md
PACKAGE_MATRIX.md
COST_MODEL_SCHEMA.yaml
UNIT_ECONOMICS_WORKSHEET.md
```

## Workstream K — SOP and Automation Architecture

Each SOP must define:

```yaml
sop:
  id: string
  name: string
  purpose: string
  trigger: string
  inputs: []
  preconditions: []
  steps: []
  outputs: []
  systems: []
  agent_roles: []
  human_roles: []
  approval_gates: []
  failure_states: []
  retries: []
  rollback: []
  audit_events: []
  metrics: []
  version: string
```

Automation candidates:

- Prospect folder provisioning.
- Obsidian index creation.
- source registry creation.
- URL normalization.
- approved public-page retrieval.
- metadata extraction.
- entity extraction.
- duplicate detection.
- research summarization.
- evidence classification.
- gap checklist population.
- report drafting.
- website brief drafting.
- sitemap drafting.
- mock copy drafting.
- task creation.
- status transitions.
- internal notifications.
- cost logging.
- audit logging.
- archive packaging.

Human-gated actions:

- Domain purchase.
- public deployment.
- outreach.
- price approval.
- proposal delivery.
- publication of claims.
- asset licensing decisions.
- deletion.
- cross-client data use.

Required outputs:

```text
MASTER_WORKFLOW.md
SOP_REGISTRY.yaml
AUTOMATION_CANDIDATE_MATRIX.md
APPROVAL_GATE_MATRIX.md
FAILURE_AND_ROLLBACK_MODEL.md
```

---

# 11. AJ Digital OS Layer Mapping

The proposed system maps to AJ Digital OS as follows:

| AJ Digital OS Layer | Prospect-to-Brand Responsibility |
|---|---|
| Infrastructure | Local drive, repositories, Cloudflare, deployment targets, Obsidian |
| Control Plane | Status, approvals, risk classification, authorized transitions |
| Connectors | Cloudflare, browser, search, social, file, analytics, deployment adapters |
| Ingestion | URLs, notes, files, communications, public pages, form input |
| Normalization | People, companies, offers, claims, sources, assets, gaps |
| Memory | Prospect knowledge, client memory, brand memory, source archive |
| Intelligence | Summaries, gap analysis, opportunity scoring, recommendations |
| Orchestration | Ordered workflow, parallel research, retries, dependencies |
| Agent Execution | Researcher, verifier, strategist, copy planner, QA agents |
| Governance | privacy, evidence, approvals, access, legal and ethical controls |
| Interface | operator dashboard, review queues, project index |
| Applications | prospect project generator, report generator, mock-site builder |
| Observability | run logs, source errors, costs, duration, quality metrics |
| Attribution | prospect source, conversion, package, revenue, agent contribution |
| Optimization | templates, scoring calibration, conversion and margin improvement |

---

# 12. Data Model

## 12.1 Prospect Record

```yaml
prospect:
  id: string
  status: identified
  full_name: string
  preferred_name: null
  company: null
  role: null
  location: null
  known_urls: []
  source_of_lead: null
  relationship_context: null
  operator_notes_ref: null
  proposed_domains: []
  primary_domain_record_ref: null
  research_project_ref: null
  local_project_path: null
  obsidian_project_ref: null
  repository_ref: null
  classification: internal
  created_at: datetime
  updated_at: datetime
```

## 12.2 Source Record

```yaml
source:
  id: string
  prospect_id: string
  url: string
  source_type: string
  publisher: null
  title: null
  author: null
  published_at: null
  retrieved_at: datetime
  access_status: success
  content_ref: null
  public_access: true
  terms_review_required: false
  credibility: unknown
  relevance: unknown
  use_permission: unknown
  notes: null
```

## 12.3 Claim Record

```yaml
claim:
  id: string
  prospect_id: string
  statement: string
  evidence_class: attributed_claim
  source_refs: []
  confidence: low
  public_use_status: client_verification_required
  contradiction_refs: []
  last_verified_at: null
  reviewer: null
```

## 12.4 Gap Record

```yaml
gap:
  id: string
  prospect_id: string
  category: owned_web_presence
  observation: string
  evidence_refs: []
  severity: medium
  business_impact: string
  recommendation: string
  service_mapping: []
  confidence: medium
  client_validation_required: false
```

## 12.5 Asset Record

```yaml
brand_asset:
  id: string
  prospect_id: string
  asset_type: brand_spine
  status: missing
  source_refs: []
  file_refs: []
  quality_status: not_evaluated
  public_use_status: unknown
  next_action: consultation_required
```

## 12.6 Run Record

```yaml
run:
  id: string
  prospect_id: string
  workflow_id: string
  status: planned
  actor_type: agent
  actor_id: string
  risk_level: L1
  approval_status: not_required
  input_refs: []
  output_refs: []
  started_at: null
  completed_at: null
  cost: null
  audit_refs: []
```

---

# 13. Agent Role Model

Potential agent roles:

## Research Agent

- Finds approved public sources.
- Captures metadata.
- Does not make final claims.

## Evidence Verifier

- Confirms source support.
- identifies contradictions.
- classifies confidence.
- blocks unsupported claims.

## Digital Presence Analyst

- Evaluates discoverability and owned presence.
- produces gap observations.
- maps gaps to business impact.

## Brand Asset Auditor

- inventories existing assets.
- classifies missing or weak assets.
- does not invent final strategy.

## Positioning Strategist

- drafts hypotheses.
- labels all hypotheses.
- produces consultation questions.

## Website Strategist

- converts approved evidence and strategy into sitemap and page briefs.

## Copy Drafting Agent

- drafts only from approved claim sets.
- marks placeholders and client-verification items.

## Visual Direction Agent

- proposes visual directions.
- preserves licensing and source records.
- does not treat generated direction as approved identity.

## QA Agent

- checks evidence, consistency, accessibility, broken links, disclaimers, and state.

## Sales Brief Agent

- turns approved diagnostic results into an operator-reviewed pitch brief.

## Archivist

- ensures outputs are stored and indexed in approved locations.

No agent is authorized by default to purchase, publish, send, delete, transfer, or expose private data.

---

# 14. Parallel Execution Plan

After the initial path and governance audit, parallel tasks may include:

```text
Track A — Existing AJ Digital doctrine and path discovery
Track B — Service offer and pricing research
Track C — Prospect research schema and evidence model
Track D — Brand-document architecture
Track E — Gap diagnostic and scoring model
Track F — Cloudflare capability and approval design
Track G — Mock-site workflow and templates
Track H — SOP and automation matrix
Track I — Security, privacy, and legal-risk analysis
Track J — Metrics, attribution, and unit economics
```

Parallel work must use separate bounded change units and worktrees when current AJ Digital standards require them.

No parallel agent may modify the same canonical file without an explicit ownership plan.

---

# 15. File-System and Obsidian Integration Requirements

## 15.1 Source of Truth Model

The project must determine and document the role of:

- AJ Digital Vault / Obsidian.
- External-drive client project folders.
- Git repository.
- cloud storage.
- deployed website repository.
- generated deliverable exports.

Provisional responsibility model:

| Location | Intended Role |
|---|---|
| AJ Digital Vault | Canonical operating knowledge, indexes, decisions, client memory references |
| External client drive | Working assets, source files, deliverables, exports, media |
| Git repository | Versioned schemas, templates, automation code, website source |
| Cloud storage | Approved sharing, backup, client exchange |
| Deployment platform | Private previews and production website runtime |

Codex must validate this model against current doctrine.

## 15.2 No Blind Duplication

Where the same document must exist in more than one system, one location must be declared canonical and the others must be links, exports, mirrors, or generated artifacts.

## 15.3 Path Discovery

Codex must not guess local Windows or external-drive paths.

It must:

1. Locate existing configuration or doctrine.
2. inspect current directories read-only.
3. map observed paths.
4. identify conflicts.
5. propose target paths.
6. create a migration plan.
7. request approval before moving or renaming files.

---

# 16. Security, Privacy, and Legal Controls

The system must account for:

- Public versus private information.
- personal data.
- contact data.
- copyrighted images.
- platform terms.
- robots directives.
- trademark risk.
- domain-name disputes.
- impersonation risk.
- endorsement risk.
- prospect consent.
- data retention.
- deletion requests.
- access control.
- secrets.
- credential rotation.
- audit trails.
- client ownership.
- mock-site disclaimers.

Prospect research must use public information or operator-provided materials unless explicit authorization exists.

Sensitive data must not enter Git.

Secrets must use the approved AJ Digital secret-management pattern.

---

# 17. Observability and Attribution

Track at minimum:

```yaml
metrics:
  prospecting:
    - prospects_created
    - prospects_qualified
    - domains_evaluated
    - domains_purchased
  research:
    - sources_collected
    - sources_rejected
    - facts_verified
    - contradictions_found
    - research_duration
    - research_cost
  production:
    - diagnostics_generated
    - mocks_generated
    - operator_revision_time
    - time_to_pitch_ready
  sales:
    - outreach_approved
    - discovery_booked
    - proposal_sent
    - won
    - lost
    - conversion_rate
  economics:
    - domain_carrying_cost
    - ai_api_cost
    - labor_cost
    - pre_sale_cost
    - project_revenue
    - gross_margin
    - payback_period
  quality:
    - unsupported_claims_found
    - source_coverage
    - qa_failures
    - client_corrections
```

Attribution must preserve:

- Prospect origin.
- source of introduction.
- operator responsible.
- research runs.
- agents used.
- asset versions.
- package sold.
- revenue.
- recurring revenue.
- conversion reason.
- loss reason.

---

# 18. Success Metrics

Version 0.1 is successful when:

1. One prospect can be represented by a complete structured project record.
2. The system creates or proposes a consistent folder and Obsidian project structure.
3. Sources and claims are traceable.
4. Gaps are separated from speculation.
5. A diagnostic report can be produced from the structured data.
6. A mock website brief and sitemap can be produced without inventing facts.
7. Brand assets are classified as existing, missing, weak, or consultation-required.
8. A pricing worksheet can estimate project economics.
9. All irreversible actions remain gated.
10. The full workflow can be handed from one authorized agent to another using the documentation alone.
11. The system records time and cost.
12. The process can be repeated for at least two prospects without cross-contamination.
13. Documentation and implementation remain aligned.
14. The operator can identify the next required decision from the project index.

Initial target benchmarks should be proposed after baseline measurement rather than invented in this charter.

---

# 19. Definition of Ready

Implementation work is ready only when:

- The target repository is confirmed.
- The active branch and worktree are confirmed.
- Current git status is inspected.
- Canonical AJ Digital OS documents are located.
- Current client and vault paths are inspected.
- Scope ownership is declared.
- Applicable approval level is assigned.
- Existing overlapping work is identified.
- The initial change units and acceptance criteria exist.
- Secrets handling is defined.
- Cloudflare capability assumptions are verified.
- No destructive migration is bundled into the initial documentation task.

---

# 20. Definition of Done for Initial Codex Phase

The initial Codex phase is done when it returns:

1. Current-state diagnostic.
2. Canonical documents located.
3. Path map.
4. conflicts and duplicates.
5. proposed target architecture.
6. prospect/client documentation template proposal.
7. source, claim, gap, asset, and run schemas.
8. service lifecycle.
9. SOP registry.
10. automation candidate matrix.
11. approval-gate matrix.
12. Cloudflare capability matrix.
13. pricing and package framework.
14. mock-site workflow.
15. security and privacy model.
16. observability and attribution model.
17. phased implementation plan.
18. dependency graph.
19. worktree plan.
20. decisions requiring operator ratification.
21. exact files created or changed.
22. validation evidence.

The initial phase is not done merely because a large document exists.

---

# 21. Phased Implementation Roadmap

## Phase 0 — Discovery and Governance

- Inspect repository.
- inspect doctrine.
- inspect paths.
- map conflicts.
- confirm scope.
- establish change units.
- write diagnostic.

## Phase 1 — Documentation and Schemas

- Project charter.
- service architecture.
- client template.
- data schemas.
- SOPs.
- approval matrix.
- pricing model.
- reporting templates.

## Phase 2 — Local Prospect Bootstrap Utility

- Create prospect ID.
- create approved folders.
- create Obsidian index.
- seed templates.
- create source registry.
- create project manifest.
- log audit event.

## Phase 3 — Research Pipeline

- URL intake.
- source retrieval.
- normalization.
- evidence extraction.
- claim ledger.
- contradiction detection.
- summaries.
- gap draft.

## Phase 4 — Diagnostic and Reporting

- Gap classification.
- opportunity scoring.
- report generation.
- operator review.
- report export.

## Phase 5 — Mock-Site Pipeline

- Website brief.
- sitemap.
- page briefs.
- draft copy.
- visual direction.
- private preview.
- QA.

## Phase 6 — Sales Workflow

- Pitch brief.
- consultation agenda.
- package matrix.
- proposal inputs.
- approved follow-up.

## Phase 7 — Cloudflare Operations

- Capability verification.
- approved domain check.
- purchase transaction design.
- DNS setup.
- domain ledger.
- renewal tracking.

Domain purchasing should be implemented only after the approval and ownership model is ratified.

## Phase 8 — Optimization

- Measure conversion.
- measure cost.
- calibrate scoring.
- improve templates.
- improve automation.
- evaluate productization.

---

# 22. Risks and Required Countermeasures

| Risk | Countermeasure |
|---|---|
| Buying a domain that creates legal or reputational risk | operator approval, naming review, ownership policy |
| Unsupported Cloudflare registrar automation | official capability verification and manual fallback |
| Prospect perceives mock as impersonation | private preview, disclaimer, no public indexing |
| Fabricated brand story | claim ledger and client verification |
| Copyrighted media misuse | asset licensing registry |
| Unprofitable speculative work | unit economics and prospect qualification |
| Too much process for small prospects | tiered documentation and execution |
| Data scattered across systems | canonical-location declarations and indexes |
| Agent cross-contamination | prospect IDs and isolated run context |
| Automation publishes or contacts without approval | control-plane gates |
| Domain renewals become hidden liabilities | domain ledger and renewal alerts |
| Outdated research | retrieval dates and re-verification |
| Scope expands into full consulting without pricing | package boundaries and change control |
| Canonical doctrine overwritten by a feature branch | proposal status and ADR requirements |
| Existing local folders damaged | read-only audit before migration |
| Personal data stored in Git | classification and secret/privacy controls |

---

# 23. Decisions Requiring Human Ratification

Codex must surface, not silently decide:

1. Final service name.
2. Ideal customer profile.
3. Qualification threshold.
4. Domain ownership model.
5. Domain purchase budget.
6. Domain renewal policy.
7. What happens when a prospect declines.
8. Whether a mock may ever be public.
9. Prospect outreach policy.
10. Client-folder canonical location.
11. Obsidian versus external-drive source-of-truth boundaries.
12. Final client documentation template.
13. Pricing.
14. revision limits.
15. consultation scope.
16. recurring service scope.
17. approved website stack.
18. approved deployment platform.
19. approved research sources and access methods.
20. data retention period.
21. naming and ID convention.
22. whether this becomes an AJ Digital OS module or a separate repository.
23. whether the current branch name complies with the canonical branch framework.
24. whether an ADR is required.
25. which outputs become canonical doctrine.

---

# 24. Codex Execution Directive

```text
Review/Diagnosis owner: Codex
Actionable AI Assistant Task owner: Codex, with bounded sub-agents where supported
Execution location/tool: Current AJ Digital OS repository and operator-approved worktree
Human/operator role: Ratify architecture, paths, purchases, public actions, pricing, and canonical doctrine
Copy/paste destination: Codex planning/execution session
```

## 24.1 Objective

Use this charter to inspect the current AJ Digital OS environment and produce the governed documentation and implementation plan for the AJ Digital Prospect-to-Personal-Brand Website System.

## 24.2 Mandatory First Actions

Before writing or moving files:

1. Confirm repository root.
2. Run read-only git status and branch/worktree inspection.
3. Identify the branch created by the operator.
4. Determine whether its name complies with current branch doctrine.
5. Locate all applicable `AGENTS.md` and instruction files.
6. Locate canonical AJ Digital OS architecture, GOAL, DMAIC, documentation, worktree, Obsidian, client-folder, security, secrets, and agent-execution standards.
7. Inspect the current repository structure.
8. Inspect current client and prospect folders read-only where access is available.
9. Identify the current AJ Vault client path and external-drive project path.
10. Create a current-state evidence inventory.
11. Report contradictions before choosing a target structure.

## 24.3 Required Conduct

- Treat existing canonical documentation as authoritative unless contradicted by current reality.
- Treat current repository and filesystem state as evidence, not permission to mutate.
- Do not duplicate standards.
- Amend through proposal or ADR when required.
- Separate observed facts from recommendations.
- Cite local files and line references in the diagnostic where tooling allows.
- Preserve all existing unrelated work.
- Use narrow staging.
- Do not stage secrets, environment files, client-private data, or unrelated changes.
- Do not commit or push unless explicitly authorized.
- Do not create another branch unless the current branch is unusable and the operator approves replacement.
- Do not create additional worktrees until topology and collision risk are assessed.
- Do not buy domains.
- Do not contact prospects.
- Do not deploy publicly.
- Do not change live DNS.
- Do not move the AJ Vault.
- Do not reorganize the external drive.
- Do not infer missing client facts.

## 24.4 Required Deliverables

Codex should create or propose the following, using actual canonical paths discovered during inspection:

```text
PROJECT_CHARTER.md
CURRENT_STATE_DIAGNOSTIC.md
SERVICE_OFFER_ARCHITECTURE.md
MASTER_WORKFLOW.md
CLIENT_PROJECT_DOCUMENTATION_TEMPLATE_PROPOSAL.md
PATH_MAPPING_AND_RECONCILIATION_REPORT.md
RESEARCH_SOP.md
DIGITAL_PRESENCE_DIAGNOSTIC_STANDARD.md
BRAND_DOCUMENTATION_ARCHITECTURE.md
CLOUDFLARE_DOMAIN_OPERATIONS_CAPABILITY_MATRIX.md
DOMAIN_ACQUISITION_SOP.md
MOCK_SITE_GENERATION_SOP.md
PRICING_STRATEGY.md
PACKAGE_MATRIX.md
AUTOMATION_CANDIDATE_MATRIX.md
APPROVAL_GATE_MATRIX.md
SECURITY_PRIVACY_AND_LEGAL_RISK_MODEL.md
OBSERVABILITY_AND_ATTRIBUTION_PLAN.md
IMPLEMENTATION_SEQUENCE.md
DEPENDENCY_GRAPH.md
WORKTREE_PLAN.md
OPEN_DECISIONS.md
```

Machine-readable artifacts should include:

```text
PROSPECT_PROFILE_SCHEMA.yaml
SOURCE_REGISTRY_SCHEMA.yaml
EVIDENCE_CLAIM_LEDGER_SCHEMA.yaml
GAP_TAXONOMY.yaml
DOMAIN_APPROVAL_SCHEMA.yaml
COST_MODEL_SCHEMA.yaml
SOP_REGISTRY.yaml
```

Templates should include:

```text
PROSPECT_INTAKE_TEMPLATE.md
BRAND_ASSET_INVENTORY_TEMPLATE.md
CLIENT_FACING_DIAGNOSTIC_REPORT_TEMPLATE.md
WEBSITE_BRIEF_TEMPLATE.md
SITEMAP_TEMPLATE.md
PAGE_BRIEF_TEMPLATE.md
COPY_DECK_TEMPLATE.md
MOCK_SITE_QA_CHECKLIST.md
PITCH_BRIEF_TEMPLATE.md
CONSULTATION_AGENDA_TEMPLATE.md
PROPOSAL_SCOPE_TEMPLATE.md
DOMAIN_RECORD_TEMPLATE.md
```

Codex may consolidate files when a smaller structure better matches canonical doctrine, but it must preserve all required semantic responsibilities and explain each consolidation.

## 24.5 Required Return Format

Codex must return:

1. Review / Diagnosis.
2. Decision.
3. Human / Operator Steps.
4. Actionable AI Assistant Tasks.
5. Canonical sources located.
6. Current branch and worktree state.
7. Current folder-path map.
8. Gaps and conflicts.
9. Files created.
10. Files modified.
11. Files deliberately not changed.
12. Automation architecture.
13. Cloudflare capability findings.
14. Pricing and packaging hypotheses.
15. Security and legal risks.
16. Validation performed.
17. Remaining blockers.
18. Decisions requiring ratification.
19. Recommended next change unit.
20. Recommended merge strategy.

---

# 25. Branch and Worktree Note

The already-created branch:

```text
feature/client-doc-automation
```

is understandable but may not comply with the more recent architecture-derived convention:

```text
<change-type>/<primary-architecture-scope>/<capability>-<goal-id>
```

A likely compliant candidate, subject to the actual scope registry and GOAL identifier, is:

```text
docs/applications/prospect-brand-bootstrap-<goal-id>
```

or, if implementation is included:

```text
feat/applications/prospect-brand-bootstrap-<goal-id>
```

Codex must not rename or replace the current branch without operator approval.

---

# 26. Final Operating Model

```text
Public Digital Footprint
        ↓
Governed Ingestion
        ↓
Normalized Prospect Memory
        ↓
Evidence and Claim Ledger
        ↓
Gap and Opportunity Intelligence
        ↓
Brand Asset Inventory
        ↓
Website Strategy
        ↓
Private Mock
        ↓
Diagnostic Sales Conversation
        ↓
Consultation and Refinement
        ↓
Approved Website Build
        ↓
Owned Digital Presence
        ↓
Ongoing Authority, Content, and Optimization
```

The core principle is:

> AJ Digital should not merely create a speculative website. It should create a documented, evidence-backed pathway from fragmented public identity to an owned, governable, and commercially useful founder presence.

---

# AMENDMENT A-001 — Operator Ruling Overlay (2026-07-19)

## A-001.0 Amendment Metadata

```yaml
amendment:
  id: A-001
  title: Operator Ruling Overlay (2026-07-19)
  document_type: charter_amendment
  version: 0.1
  status: proposal
  canonical: false
  authority: operator-ratification-required
  created: 2026-07-19
  decision_basis: OPERATOR_RULINGS_2026-07-19.md
  applies_to: docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md (original text above, preserved verbatim)
```

## A-001.1 Preamble

1. **The original charter above is preserved verbatim.** No line of the imported charter — including its original frontmatter — has been modified, reworded, or deleted. It remains the historical record of the imported proposal.
2. **This overlay supersedes the original wherever the two conflict.** Where a charter clause is listed in the override table below, the Replacement Rule governs. The supersession table in `docs/specs/prospect-brand-website-system/POSITIONING_DECISION_RECORD.md` §3 is incorporated into this overlay by reference: charter clauses listed there are overridden or amended per that table's dispositions even where not repeated in A-001.2 below. Charter clauses listed in neither table remain in force as proposal text, subject to the rulings' constraints.
3. **Decision authority:** the operator (Tyrone / Audio Jones, AJ Digital LLC). **Ruling date:** 2026-07-19.
4. **Evidence base:** `docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md` (Phase 0, read-only inspection of repository, worktrees, AJ Vault, and G:/H:/J: drives). The operator ruled Phase 0 valid and unblocked Phase 1 subject to four rulings.
5. **Full ruling text:** `docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md` (recorded verbatim there; that document is the authoritative statement of the rulings — this appendix is an application overlay, not a restatement of authority).
6. **Governance context (unresolved):** wherever this charter or overlay cites approval rules, human-approval boundaries (charter §8.4), or approval gates (charter Workstream K), those rules remain governed by the AJ Digital OS governance kernel at `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\`. Two pending amendments in that location — `PROPOSED_AMENDMENT-2026-07-10.md` and `PROPOSED_AMENDMENT-2026-07-18.md` — are unresolved as of this amendment and must be reviewed before any approval-gate design in this project is ratified.
7. **Naming note:** per Ruling 3, the system this charter describes is henceforth referred to as the **Founder Authority and Conversion System** (provisional name, adjacent productized service). The original title "AJ Digital Prospect-to-Personal-Brand Website System" is retained above only as the historical name of the imported proposal.

## A-001.2 Overridden Clauses

Legend: **VERIFIED CURRENT STATE** appears in the Evidence column (exact file paths); **PROPOSED FUTURE STATE** appears in the Replacement Rule column. All replacement rules carry `status: proposal, canonical: false` until operator ratification, except where they restate a ratified ruling, in which case the ruling itself is the authority.

| Charter clause (section ref) | Original assumption | Evidence against it (exact file paths) | Replacement rule | Ruling |
|---|---|---|---|---|
| §25 Branch and Worktree Note — branch name | An already-created branch `feature/client-doc-automation` exists and is the working branch for this project. | `CURRENT_STATE_DIAGNOSTIC.md` §1: that branch does not exist locally or on origin. The real branch at charter time was `codex/featuredoclientautomation` (repo `C:\dev\AJ-DIGITAL-OS`), carrying one unrelated ahead-commit and three unrelated staged files: `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md`, `docs/system/AGENT_OPERATIONS_CONTROL_PLANE_SPEC.md`, `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md`. | All Phase 1 work proceeds on the new documentation-only branch `docs/prospect-brand-website-system`, cut from current verified `main` in a fresh worktree (`C:\dev\AJ-DIGITAL-OS-prospect-brand-website-system`). `codex/featuredoclientautomation` is left completely untouched; its staged governance files are not moved or recommitted. | Ruling 1 |
| §25 (naming model) and §24.2 item 6 ("GOAL" standards) | A canonical architecture-derived branch convention `<change-type>/<primary-architecture-scope>/<capability>-<goal-id>` exists, making `docs/applications/prospect-brand-bootstrap-<goal-id>` a likely compliant name. | `CURRENT_STATE_DIAGNOSTIC.md` §2: no such convention exists anywhere in the repository; searches for GOAL-id naming rules returned nothing. The actual canonical standard is workstream-descriptive branch names per `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` §11 (examples: `docs/worktree-doctrine`, `feature/client-portal-gallery-review`). | Use existing doctrine only. Do not introduce a GOAL-based branch convention that is absent from current doctrine. `docs/prospect-brand-website-system` complies with the real standard. | Ruling 1 |
| §3.1 Internal System Name | Working name "AJ Digital Prospect-to-Brand Website System" (with five alternatives) frames the system as a prospect-to-brand website capability. | `OPERATOR_RULINGS_2026-07-19.md` Ruling 3; `docs/knowledge/wiki/business-memory/*` records a documented positioning move away from personal-brand consulting (`CURRENT_STATE_DIAGNOSTIC.md` §5). | The system is named the **Founder Authority and Conversion System** (provisional pending final client-facing naming per charter §23.1). The §3.1 name and alternatives are retired. | Ruling 3 |
| §3.2 Client-Facing Category | The service is positioned as a personal-brand foundation / digital-presence diagnostic / owned-web-presence offering — an implied service category for AJ Digital. | Same as §3.1 row; `CURRENT_STATE_DIAGNOSTIC.md` §5–6 flags the strategic contradiction with `docs/knowledge/wiki/business-memory/*`. | AJ Digital's core category remains: *a Founder Intelligence Systems and operational intelligence consultancy for founder-led service businesses*. The website capability is approved **only as an adjacent, productized service**. It must never position AJ Digital as a personal-brand agency, a general web-design company, a bespoke branding studio, or a disconnected marketing-services provider. The service architecture must distinguish (1) core category, (2) core commercial offers, (3) adjacent deployment capabilities, (4) optional tactical deliverables. | Ruling 3 |
| §1.1 Current Opportunity — thesis framing | "AJ Digital is developing a proactive personal-brand website service…" — the commercial thesis treats the personal-brand website as the service identity. | `docs/knowledge/wiki/business-memory/*` (positioning record away from personal-brand consulting); contradiction #3 in `CURRENT_STATE_DIAGNOSTIC.md` §6. | The thesis is constrained, not deleted: the offering exists to create an owned digital asset that improves trust, authority, qualified lead generation, conversion, attribution, founder-owned audience development, business memory, and measurable revenue outcomes — as an adjacent capability. Personal-brand consulting is rejected as AJ Digital's core category. | Ruling 3 |
| Charter title / frontmatter and §0 Document Purpose item 8 | "Prospect-to-Personal-Brand Website System" as document title and system name; §0 item 8: "a preliminary personal-brand website strategy and mock website." | `OPERATOR_RULINGS_2026-07-19.md` Ruling 3; supersession recorded in `POSITIONING_DECISION_RECORD.md` §3 row 4. | Superseded (naming/framing only). The eleven-step purpose list survives mechanically; "personal-brand" as the system's identity does not. The original title is retained above solely as the historical name of the imported proposal (A-001.1 item 7). | Ruling 3 |
| §2 Decision — system name | "Build a governed, modular **Prospect-to-Personal-Brand Website System** inside AJ Digital OS." | `OPERATOR_RULINGS_2026-07-19.md` Ruling 3; `POSITIONING_DECISION_RECORD.md` §3 row 5. | Superseded (name only). The decision to proceed and the Inspect → Map → Design → Document → Validate ordering stand; the system name is replaced by **Founder Authority and Conversion System**. | Ruling 3 |
| §3.3 Commercial Wedge — upsell destination | "The deeper consultation is the strategic upsell" — an upsell into deeper standalone brand strategy. | `OPERATOR_RULINGS_2026-07-19.md` Ruling 3 (adjacent-capability constraint, four-tier service architecture); `POSITIONING_DECISION_RECORD.md` §3 row 9. | Amended. The wedge mechanics survive (mock = visual wedge, diagnostic = evidentiary wedge); the upsell destination is reframed toward core Founder Intelligence Systems offers (tier 2 of the service architecture), not deeper standalone brand strategy. | Ruling 3 |
| §4 Project Vision — opportunity framing | "converts an identified prospect into a structured, evidence-backed personal-brand opportunity package." | `OPERATOR_RULINGS_2026-07-19.md` Ruling 3; `POSITIONING_DECISION_RECORD.md` §3 row 6. | Amended. "Personal-brand opportunity package" is replaced with authority-and-conversion opportunity framing; the vision's mechanics (intake record, generated artifacts) are unchanged. | Ruling 3 |
| §6.2 Secondary Objectives — "personal-brand patterns" library | "Build a library of reusable website sections and personal-brand patterns." | `OPERATOR_RULINGS_2026-07-19.md` Ruling 3; `POSITIONING_DECISION_RECORD.md` §3 row 7. | Amended (terminology). The pattern library survives as a founder-authority pattern library, not a personal-brand one. | Ruling 3 |
| Workstream F — proposed client tree (`00-CONTROL` … `99-ARCHIVE`) | Client-folder structure is effectively greenfield; a new 13-directory logical template is recommended. | `CURRENT_STATE_DIAGNOSTIC.md` §3: `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` already exists and is versioned (`client-folder-schema-v0.1.json`, `client-folder-schema-v0.2.json`, `_client/_project/_session` manifest templates, `docs/agent-rollout-directive.md`). **Schema exists and is versioned; no live client folder conforms** (corrected against Phase 1 verification — `PATH_MAPPING_AND_RECONCILIATION_REPORT.md` Appendix A.5/A.6 and OC-1; `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §1.6): zero `_client/_project/_session` manifests exist under any live client folder; `G:\AJ-CLIENTS\FLORIDA RAMP AND LIFT` has no v0.2 structure at all; `Paris Nelms` and `TEST-E2E` are divergent/pre-schema; and `G:\AJ-CLIENTS\_TEMPLATE` is itself the divergent legacy tree (OC-1), not the canonical implementation — the v0.2 reference tree is `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\`. The Phase 0 phrasing "in use (3 client folders)" (`CURRENT_STATE_DIAGNOSTIC.md` §6 item 2) overstated adoption; canonicity here rests on Ruling 2, not on adoption. | `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` is the current canonical client-folder standard; v0.2 remains authoritative until formally amended. Phase 1 produces `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` — a reconciliation, not a parallel architecture. It may extend the `00_ADMIN` … `08_ARCHIVE` model but may not replace it or mutate live client folders. The Workstream F tree is demoted to reconciliation input. | Ruling 2 |
| §15.1 Source of Truth Model (provisional table) | The location-role model is provisional and open for the project to determine. | `CURRENT_STATE_DIAGNOSTIC.md` §3–4: observed canonical roles already exist — `G:\AJ-CLIENTS` (client folders under `_GLOBAL_SCHEMA`), `G:\AJ-DELIVERY` (deliverables), vault at `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT`; `J:\CLIENT` is legacy/duplicated; `H:\CLIENTS` is empty. | Source-of-truth determinations must reconcile with `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` v0.2 as the canonical client-folder authority. Any change routes through the v0.3 reconciliation proposal and operator ratification. No writes to G:, H:, or J: during Phase 1. | Ruling 2 |
| §9.1 Lifecycle / §9.2 Prospect State Machine | This project defines its own end-to-end prospect lifecycle and a 17-state prospect state machine (`identified` → `archived`), including outreach, discovery, proposal, and won/lost pipeline states. | `CURRENT_STATE_DIAGNOSTIC.md` §5: a multi-tenant CRM already occupies this layer — `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`, branch `origin/codex/add-qualification-engine-v1`. | The Multi-Tenant CRM owns opportunity lifecycle, pipeline state, communications, and tasks. This system does not define an independent prospect state machine or opportunity pipeline. It defines handoffs, required fields, and workflow triggers into the CRM, documented in `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`. §9.1's asset-production stages (research → strategy → mock build → QA) remain in scope as this system's internal production workflow only. | Ruling 4 |
| §12.1 Prospect Record | This project defines its own canonical prospect record schema. | Same CRM evidence: `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`. | The Multi-Tenant CRM owns canonical prospect and company records. §12.1 is demoted from schema definition to integration-contract input: this project documents required identifiers and handoff fields against the CRM object model, and may not create another prospect database, CRM object model, or canonical client identity system. | Ruling 4 |
| Workstream B — qualification elements (ideal customer profile, prospect qualification criteria, trigger conditions) | This system defines prospect qualification as part of its own service architecture. | `docs/specs/founder-opportunity-engine-v1.md`: the Founder Opportunity Engine already implements prospect discovery → website/revenue-leak analysis → qualification gates → Demand×Leak×Fit scoring → CRM-ready opportunity output (`CURRENT_STATE_DIAGNOSTIC.md` §5). | The Founder Opportunity Engine owns discovery, leak analysis, qualification, and scoring. `SERVICE_OFFER_ARCHITECTURE.md` defines the offer, target customer, and its **integration** with FOE outputs — not a parallel qualification methodology. Qualification thresholds (charter §23.3) are FOE-side decisions. | Ruling 4 |
| §6.2 Secondary Objectives — "Develop future scoring models for prospect fit and opportunity size" | Scoring-model development is a legitimate future objective of this system. | `docs/specs/founder-opportunity-engine-v1.md` (existing Demand×Leak×Fit scoring); Ruling 4 prohibition on independent lead-scoring engines. | Struck as an independent objective of this system. Scoring enhancements route through the Founder Opportunity Engine as change proposals to that system. | Ruling 4 |
| Workstream D — `OPPORTUNITY_SCORING_MODEL.md` output | This system builds a new opportunity-scoring model as part of its diagnostic. | `docs/specs/founder-opportunity-engine-v1.md` owns website/revenue-leak analysis and opportunity scoring (`CURRENT_STATE_DIAGNOSTIC.md` §5). | Diagnostic work must consume FOE leak-analysis and qualification outputs via a documented handoff rather than re-scoring prospects. No independent lead-scoring engine. Residual scope ambiguity (gap-severity prioritization inside a delivered diagnostic vs. lead scoring) is logged in A-001.3 Open Contradictions, not resolved here. | Ruling 4 |
| §17 Observability — prospecting/sales metrics (`prospects_created`, `prospects_qualified`, `outreach_approved` … `conversion_rate`) and attribution fields | This system tracks prospecting, sales-pipeline, and attribution metrics itself. | CRM ownership of pipeline state, attribution, and customer history where already specified: `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`; FOE ownership of qualification: `docs/specs/founder-opportunity-engine-v1.md`. | Pipeline and qualification metrics are sourced from the CRM and FOE via integration contracts. This system tracks only the research, production, economics, and quality metrics of the assets it owns (research/production/economics/quality groups in §17). Exact metric-store ownership is partially open — see A-001.3. | Ruling 4 |
| Workstream J — package names "Personal Brand Foundation" (Package 2), "Personal Brand Website" (Package 3) | Client-facing packages carry "personal brand" service naming. | Ruling 3 forbidden-positioning list; `docs/knowledge/wiki/business-memory/*` positioning record. | Package naming and framing must present the offering under the Founder Authority and Conversion System as an adjacent productized service; no package may market AJ Digital as a personal-brand agency or branding studio. Final names route through `SERVICE_OFFER_ARCHITECTURE.md` and operator ratification (charter §23.1, §23.13). | Ruling 3 |
| Workstream A — Current-State Diagnostics instruction | The diagnostic (`CURRENT_STATE_DIAGNOSTIC.md`) is an open instruction awaiting execution. | `docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md` exists and was ruled valid: "Phase 0 is valid and the project is unblocked for Phase 1" (`OPERATOR_RULINGS_2026-07-19.md`). | Workstream A is **complete**. Its findings are the evidence base of this amendment and of all Phase 1 deliverables. | Decision — Proceed (rulings preamble) |
| §24.4 Required Deliverables (and §20 Definition of Done for Initial Codex Phase) | The initial phase produces ~22 documents plus 7 YAML schemas plus 12 templates. | `OPERATOR_RULINGS_2026-07-19.md` "Phase 1 Required Deliverables": exactly six documents under `docs/specs/prospect-brand-website-system/`, documentation only, with the Constraints section (no code, no G:/H:/J: writes, no schema implementation, no staging/committing until reviewed). | Phase 1 scope is the six ruling deliverables: `PATH_MAPPING_AND_RECONCILIATION_REPORT.md`, `SERVICE_OFFER_ARCHITECTURE.md`, `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md`, `POSITIONING_DECISION_RECORD.md`, `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`, and this charter amendment. All other §24.4 artifacts are deferred pending further operator authorization. | Rulings — Phase 1 Required Deliverables + Constraints |

## A-001.3 Open Contradictions (discovered during this amendment; recorded, not resolved)

Per the rulings' constraint "Report any newly discovered contradiction rather than resolving it through assumption":

1. **Workstream D diagnostic scope vs. FOE leak analysis.** Ruling 4 assigns website/revenue-leak analysis to the Founder Opportunity Engine (`docs/specs/founder-opportunity-engine-v1.md`) but assigns authority strategy, trust assets, and conversion assets to this system. Charter Workstream D's diagnostic model (technical SEO, AEO/GEO readiness, conversion pathways, reputation) overlaps FOE's analysis territory. Which system produces the client-facing diagnostic report, and where gap-severity prioritization inside that report stops being "analysis" and starts being "scoring," is not fully specified. To be proposed in `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` and ratified by the operator.
2. **Metrics and attribution store ownership (§17/§18).** Ruling 4 gives the CRM attribution and customer history "where already specified," but does not state whether this system may maintain its own production-metrics store for asset work or must write all metrics through CRM objects. Partially constrained by the §17 override row; final ownership split unresolved.
3. **Prospect intake record system-of-record (§4).** The charter's minimal intake YAML (`prospect: name, known_urls, known_company, operator_notes, proposed_domain`) could be (a) an FOE discovery input, (b) a CRM record creation, or (c) a new intake artifact of this system. Ruling 4 prohibits an independent prospect database but does not name the intake's system-of-record. To be settled in the integration map.
4. **Approval-gate baseline is a moving target.** Charter §8.4 and Workstream K approval gates must conform to the governance kernel (`G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\`), where `PROPOSED_AMENDMENT-2026-07-10.md` and `PROPOSED_AMENDMENT-2026-07-18.md` are pending. Any approval-gate matrix drafted now may be invalidated by their resolution. Recorded as unresolved governance context, consistent with A-001.1 item 6.

## A-001.4 Amendment Log

| Amendment | Date | Authority | Summary |
|---|---|---|---|
| A-001 | 2026-07-19 | Operator (Tyrone / Audio Jones, AJ Digital LLC), per `OPERATOR_RULINGS_2026-07-19.md`; overlay recorded for ratification | Applies the four operator rulings to the imported charter: (1) corrects §25's nonexistent branch and absent GOAL naming convention to the approved `docs/prospect-brand-website-system` branch under `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` §11; (2) declares `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` v0.2 canonical and demotes Workstream F/§15.1 to a v0.3 reconciliation path; (3) renames the system to Founder Authority and Conversion System, an adjacent productized service that must not reposition AJ Digital's core Founder Intelligence Systems category; (4) subordinates §9.1/§9.2, §12.1, Workstream B/D, §6.2, and §17 to FOE and CRM ownership boundaries — handoffs and integration contracts only. Marks Workstream A complete via `CURRENT_STATE_DIAGNOSTIC.md`; resets Phase 1 scope to the six ruling deliverables; logs four open contradictions. |
| A-001-r1 | 2026-07-19 | Same authority basis as A-001; cross-document consistency revision, recorded for operator ratification with the rest of this overlay | (1) Corrects the Workstream F override row's evidence text against Phase 1 verified findings (`PATH_MAPPING_AND_RECONCILIATION_REPORT.md` Appendix A.5/A.6 and OC-1; `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §1.6): the v0.2 schema exists and is versioned, but no live client folder conforms, zero manifests exist, and `G:\AJ-CLIENTS\_TEMPLATE` is the divergent legacy tree rather than the canonical implementation. (2) Adds override rows for the charter title/frontmatter and §0 item 8, §2 (system name), §3.3 (upsell destination), §4 (opportunity framing), and §6.2 ("personal-brand patterns" library), and amends A-001.1 item 2 to incorporate `POSITIONING_DECISION_RECORD.md` §3 by reference — aligning the two documents' supersession status. No replacement rule from A-001 is weakened; both changes tighten fidelity to Rulings 2 and 3. |
