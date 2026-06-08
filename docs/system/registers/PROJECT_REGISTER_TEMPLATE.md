# Project Register Template

```yaml
title: Project Register
status: Draft
owner: <owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
project: <project or portfolio name>
artifact_type: register
source_of_truth: docs/system/registers/PROJECT_REGISTER_TEMPLATE.md
```

**Register purpose:** Track every project moving through the Founder Intelligence Product Factory lifecycle.
**Framework source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Execution source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Artifact source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_ARTIFACT_INDEX.md`

---

## 1. Purpose

The Project Register is the authoritative control plane for project state across the Founder Intelligence Product Factory lifecycle.

It tracks where each project is, who owns it, what gate controls progression, what risk level is active, and what action is required next. It is not a narrative project brief. It is the operating ledger used to prevent project drift, duplicate work, unclear ownership, and undocumented gate movement.

## 2. Usage Rules

1. Create one row for every FIPF engagement, internal initiative, client installation, automation, AI agent, SaaS product, or operational intelligence project.
2. Do not move a project to a new phase until the required gate has passed or the exception is documented.
3. Keep the current phase aligned with the FIPF lifecycle: Opportunity, Founder, Product, Architecture, Build, Operations, Growth.
4. Keep status current: Active, Blocked, Deferred, Completed.
5. Update the register whenever project state, owner, gate, risk level, or next action changes.
6. Do not use this register to replace the Decision, Risk, Assumption, or Artifact Registers. Link to them where relevant.

## 3. Governance Fields

Every project update must include:

| Field | Requirement |
| --- | --- |
| Date | Date the register row or update changed |
| Owner | Person accountable for the next action |
| Status | Active, Blocked, Deferred, or Completed |
| Evidence | Link or reference supporting the current state |
| Approval | Gate decision, approver, or pending approval |
| Next Action | The immediate action required to move or close the project |

## 4. Project Register

| Project ID | Project Name | Client | Project Type | Current Phase | Status | Owner | Current Gate | Risk Level | Evidence | Approval | Next Action | Last Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FIPF-001 | `<project name>` | Internal / External: `<client>` | SaaS / Agent / FIS / Automation / Internal Tool | Opportunity / Founder / Product / Architecture / Build / Operations / Growth | Active / Blocked / Deferred / Completed | `<owner>` | `<gate>` | Low / Medium / High | `<evidence link>` | `<approval state>` | `<next action>` | `<YYYY-MM-DD HH:MM>` |

## 5. Approval Requirements

| Change | Required Approval |
| --- | --- |
| New project added | Founder / operator or portfolio owner |
| Phase change | Current gate approver |
| Status changed to Blocked | Owner plus founder / operator if decision is required |
| Status changed to Completed | Owner plus gate approver for final phase |
| Risk level changed to High | Founder / operator and risk owner |
| Project deferred or retired | Founder / operator |

## 6. Example Entry

| Project ID | Project Name | Client | Project Type | Current Phase | Status | Owner | Current Gate | Risk Level | Evidence | Approval | Next Action | Last Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FIPF-001 | Revenue Leak Diagnostic Install | AJ Digital Internal | FIS | Founder | Active | Audio | Founder Diagnostic Gate | Medium | Founder Intelligence Diagnostic draft | Pending operator review | Complete Revenue Leak Assessment | 2026-06-08 15:00 |

## 7. Cross-Register Rules

### Relationship To Other Registers

- Decision Register records why project-level decisions were made.
- Risk Register records active risks referenced by project risk level.
- Assumption Register records unresolved assumptions affecting gate progression.
- Artifact Register records required artifact status for the project.

### Source-Of-Truth Requirements

- Project state lives here.
- Decision rationale lives in the Decision Register.
- Risk details live in the Risk Register.
- Assumptions live in the Assumption Register.
- Artifact status lives in the Artifact Register.

### Update Cadence

- Update at every phase change.
- Update at every gate review.
- Update whenever project status, owner, risk level, or next action changes.
- Review at least weekly for active projects.

### Approval Requirements

- Gate progression requires the approval owner defined in the doctrine, playbook, or artifact index.
- Serious or irreversible build movement requires explicit `proceed`.

### Audit Requirements

- Every active project must have evidence for current phase and gate state.
- Every blocked project must name the blocker and next action.
- Every completed project must reference final artifact package and readiness or growth decision.

