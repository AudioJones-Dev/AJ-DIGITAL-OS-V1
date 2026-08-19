---
title: Operator Rulings — Prospect-to-Personal-Brand Website System Phase 1 Authorization
document_type: operator_decision_record
version: 1.1
status: ratified
decision_authority: Operator-ratified
repository_publication_state: Pending merge
canonical: true
canonicality_note: >
  "canonical: true" refers to DECISION AUTHORITY only: this file is authoritative
  evidence of the operator ruling issued 2026-07-19. It is not repository-effective
  canonical documentation until merged into the governed default branch through the
  standard PR process; until then its repository publication state is
  Proposed / pending merge. (Clarified per operator directive 2026-07-19;
  the verbatim ruling body below is unchanged from v1.0.)
authority: operator (Tyrone / Audio Jones, AJ Digital LLC)
decision_date: 2026-07-19
supersedes: conflicting clauses in PROJECT_CHARTER.md (see AMENDMENT appendix there)
context: >
  Issued in response to CURRENT_STATE_DIAGNOSTIC.md (Phase 0). Recorded verbatim
  below; only this frontmatter block was added. Pending governance amendments
  PROPOSED_AMENDMENT-2026-07-10.md and PROPOSED_AMENDMENT-2026-07-18.md
  (G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE) are recorded as
  unresolved governance context per the constraints below.
---

# Operator Rulings — 2026-07-19 (verbatim)

Phase 0 is valid and the project is unblocked for Phase 1, subject to four explicit rulings.

The diagnostic correctly identified that the imported charter contained filesystem-dependent assumptions that were not authoritative. The verified repository, vault, and drive state must supersede those assumptions.

One correction: there are effectively four decisions, not three. The overlap with the Founder Opportunity Engine and multi-tenant CRM requires an integration-boundary ruling so Phase 1 does not design duplicate qualification or prospect-record systems.

## Decision — Proceed

### Ruling 1 — Branch

Approve a new documentation-only branch:

`docs/prospect-brand-website-system`

Requirements:

- Cut from current, verified main
- Use a fresh worktree
- Leave codex/featuredoclientautomation completely untouched
- Do not move or recommit its staged governance files
- Do not introduce a GOAL-based branch convention that is absent from current doctrine

### Ruling 2 — Client-folder authority

Declare this the current canonical client-folder standard:

`G:\AJ-CLIENTS\_GLOBAL_SCHEMA`

The existing v0.2 schema remains authoritative until formally amended.

Phase 1 must produce a v0.3 reconciliation proposal, not a parallel folder architecture. The proposal may extend the existing 00_ADMIN … 08_ARCHIVE model but may not replace it or mutate live client folders.

### Ruling 3 — Strategic positioning

Reject personal-brand consulting as AJ Digital's core category.

AJ Digital remains positioned as:

> A Founder Intelligence Systems and operational intelligence consultancy for founder-led service businesses.

Approve the website capability only as an adjacent, productized service:

**Founder Authority and Conversion System**

Its purpose is to create an owned digital asset that improves:

- Trust
- Authority
- Qualified lead generation
- Conversion
- Attribution
- Founder-owned audience development
- Business memory
- Measurable revenue outcomes

The system must not reposition AJ Digital as:

- A personal-brand agency
- A general web-design company
- A bespoke branding studio
- A disconnected marketing-services provider

The service architecture must distinguish:

1. Core AJ Digital category
2. Core commercial offers
3. Adjacent deployment capabilities
4. Optional tactical deliverables

### Ruling 4 — Existing-system boundaries

The project must integrate with, not duplicate:

- founder-opportunity-engine-v1.md
- multi-tenant CRM prospect records

Boundary:

- **Founder Opportunity Engine** → discovers and qualifies prospects (prospect discovery, website/revenue-leak analysis, qualification, scoring, CRM-ready opportunity output)
- **Multi-Tenant CRM** → stores prospect, opportunity, communication, and lifecycle records (canonical prospect and company records, opportunity lifecycle, communications, tasks, pipeline state, attribution and customer history where already specified)
- **Founder Authority and Conversion System** → delivers the approved website, authority, content, trust, and conversion assets (founder and company source collection, authority strategy, messaging and positioning assets, website planning and production, content architecture, trust assets, conversion assets, approved handoffs into CRM and intelligence systems)

The new system may define handoffs, required fields, workflow triggers, and asset-generation processes. It may not create another independent:

- Prospect database
- Lead-scoring engine
- Qualification methodology
- CRM object model
- Opportunity pipeline
- Canonical client identity system

Document integration contracts and handoffs instead.

## Phase 1 Required Deliverables

Create documentation only under `docs/specs/prospect-brand-website-system/`:

1. PATH_MAPPING_AND_RECONCILIATION_REPORT.md — verified repository/vault/drive paths, charter-assumed paths, conflicts, missing paths, canonical destinations, proposed destinations, canonical versus draft/proposal status, existing-system ownership boundaries, no live mutations.
2. SERVICE_OFFER_ARCHITECTURE.md — core category, adjacent-capability classification, customer problem, target customer, diagnostic → design → build → operate lifecycle, standardized deliverables, measurable outcomes, scope boundaries, exclusions, integration with the Founder Opportunity Engine, integration with the multi-tenant CRM, path into attribution, business memory, and managed intelligence, conditions under which the service should not be sold.
3. CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md — v0.2 inventory, mapping from charter requirements to v0.2, conflicts and redundancies, proposed minimum additions, rejected charter paths, backward-compatibility strategy, migration impact, acceptance criteria, ratification requirements.
4. POSITIONING_DECISION_RECORD.md — Founder Intelligence Systems remains the core category; personal-brand consulting is not a core strategic offer; founder authority and conversion work is an approved adjacent capability; commercial outcomes are mandatory; the decision supersedes conflicting charter language.
5. SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md — Founder Opportunity Engine ownership, Multi-Tenant CRM ownership, Founder Authority and Conversion System ownership, source and destination objects, workflow handoffs, required identifiers, duplicate-system prohibitions, unresolved integration decisions.
6. PROJECT_CHARTER.md amendment — preserve the imported charter verbatim; add a clearly labeled amendment, ruling overlay, or decision appendix; do not silently rewrite or erase the original assumptions; identify clauses overridden, evidence supporting each override, replacement rule, decision authority, date of ruling.

## Constraints

- Documentation only.
- No application code.
- No writes to G:, H:, or J:.
- No vault restructuring.
- No client-folder changes.
- No schema implementation.
- No staging or committing until all Phase 1 documents are complete and reviewed.
- Do not mark proposals canonical.
- Do not create new doctrine outside this bounded project.
- Do not duplicate existing systems.
- Preserve exact paths and evidence.
- Record the July 10 and July 18 governance amendments as pending context where relevant.
- Report any newly discovered contradiction rather than resolving it through assumption.

## Operator ruling

Phase 1 may proceed as a documentation-only reconciliation and service-architecture pass. No build work or live schema mutation is authorized.
