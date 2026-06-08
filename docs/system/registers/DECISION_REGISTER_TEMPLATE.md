# Decision Register Template

```yaml
title: Decision Register
status: Draft
owner: <owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
project: <project or portfolio name>
artifact_type: register
source_of_truth: docs/system/registers/DECISION_REGISTER_TEMPLATE.md
```

**Register purpose:** Track all decisions made during Founder Intelligence Product Factory execution.
**Framework source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Execution source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Artifact source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_ARTIFACT_INDEX.md`

---

## 1. Purpose

The Decision Register is the authoritative control plane for decisions made during an FIPF project.

It preserves decision context, alternatives, rationale, evidence, approver, impact, and reversibility so future operators can understand what was decided, why it was decided, and what it would take to change it.

## 2. Governance Fields

Every decision update must include:

| Field | Requirement |
| --- | --- |
| Date | Date the decision was made or revised |
| Owner | Person accountable for the decision record |
| Status | Proposed, Approved, Superseded, Reversed, or Archived |
| Evidence | Source material supporting the decision |
| Approval | Approver and approval state |
| Next Action | Follow-up required because of the decision |

## 3. Reversibility Scale

| Reversal Difficulty | Definition | Governance Requirement |
| --- | --- | --- |
| Easy | Can be changed with low cost and no material downstream breakage | Record decision and owner |
| Moderate | Requires coordination, artifact updates, or minor rework | Record affected artifacts and notify owners |
| Difficult | Requires major rework, client communication, data changes, or architecture change | Founder / operator approval required |
| Irreversible | Cannot be undone cleanly, or reversal would create legal, financial, production, or trust risk | Explicit approval required before action; rollback or mitigation plan must exist |

## 4. Decision Register

| Decision ID | Date | Decision | Context | Alternatives Considered | Rationale | Evidence | Approver | Approval | Impact | Reversal Difficulty | Owner | Status | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | `<YYYY-MM-DD>` | `<decision>` | `<context>` | `<alternatives>` | `<rationale>` | `<evidence link>` | `<approver>` | Pending / Approved / Rejected | `<impact>` | Easy / Moderate / Difficult / Irreversible | `<owner>` | Proposed / Approved / Superseded / Reversed / Archived | `<next action>` |

## 5. Decision Review Process

1. Capture the decision when it is proposed, not after the project has already moved.
2. Separate facts, inferences, assumptions, and operator preference.
3. Record at least one alternative unless no viable alternative exists.
4. Assign reversal difficulty before approval.
5. Link affected artifacts, risks, assumptions, and project phase.
6. Obtain required approval before downstream work depends on the decision.
7. Mark superseded or reversed decisions instead of deleting them.

## 6. Approval Requirements

| Decision Type | Required Approval |
| --- | --- |
| Opportunity selection | Founder / operator |
| Gate pass or fail | Gate owner |
| Product scope | Product owner and founder / operator |
| Architecture boundary | Technical owner and founder / operator |
| Vendor or platform selection | Technical owner and founder / operator |
| Public copy, production, secrets, or client-data action | Founder / operator using explicit approval |
| Irreversible decision | Founder / operator plus rollback or mitigation owner |

## 7. Cross-Register Rules

### Relationship To Other Registers

- Project Register references decision IDs for phase and gate movement.
- Risk Register references decision IDs that create, reduce, or accept risk.
- Assumption Register references decision IDs that depend on unverified assumptions.
- Artifact Register references decision IDs that approve, supersede, or archive artifacts.

### Source-Of-Truth Requirements

- Decision rationale lives here.
- Do not bury decisions only in chat, commit messages, meeting notes, or artifact prose.
- If a decision changes project state, update the Project Register.

### Update Cadence

- Update when a decision is proposed.
- Update when approval state changes.
- Review before every gate.
- Review before production-impacting or irreversible action.

### Approval Requirements

- No difficult or irreversible decision may be treated as active without an approver.
- Any decision requiring `proceed` must preserve the exact approval reference.

### Audit Requirements

- Decisions must include evidence or state that evidence is missing.
- Superseded decisions must retain the original row and point to the replacing decision.
- Reversed decisions must explain why the reversal occurred and what changed downstream.

