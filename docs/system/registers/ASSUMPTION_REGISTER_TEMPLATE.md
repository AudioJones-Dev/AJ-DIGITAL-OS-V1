# Assumption Register Template

```yaml
title: Assumption Register
status: Draft
owner: <owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
project: <project or portfolio name>
artifact_type: register
source_of_truth: docs/system/registers/ASSUMPTION_REGISTER_TEMPLATE.md
```

**Register purpose:** Track assumptions accepted by a Founder Intelligence Product Factory project.
**Framework source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Execution source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Artifact source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_ARTIFACT_INDEX.md`

---

## 1. Purpose

The Assumption Register is the authoritative control plane for assumptions accepted during an FIPF project.

It prevents assumptions from being treated as facts by tracking evidence level, validation method, owner, status, review date, approval state, and next action.

## 2. Evidence Levels

| Evidence Level | Definition | Governance Requirement |
| --- | --- | --- |
| Verified | Confirmed by direct evidence, source data, completed test, customer confirmation, or approved artifact | Can support gate progression if still current |
| Supported | Backed by credible but incomplete evidence | May support planning, but validation path should remain visible |
| Weakly Supported | Based on limited, indirect, or low-confidence evidence | Must be validated before serious downstream dependency |
| Unverified | Not yet supported by evidence | Must not be presented as fact or used for serious irreversible action |

## 3. Governance Fields

Every assumption update must include:

| Field | Requirement |
| --- | --- |
| Date | Date the assumption was logged or reviewed |
| Owner | Person accountable for validation |
| Status | Open, Validating, Verified, Retired, Rejected, or Superseded |
| Evidence | Current evidence level and source |
| Approval | Approval state if the project proceeds with the assumption unresolved |
| Next Action | Validation, retirement, replacement, or escalation step |

## 4. Assumption Register

| Assumption ID | Date | Assumption | Evidence Level | Validation Method | Owner | Evidence | Approval | Next Action | Status | Review Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ASM-001 | `<YYYY-MM-DD>` | `<assumption>` | Verified / Supported / Weakly Supported / Unverified | `<validation method>` | `<owner>` | `<evidence link>` | `<approval state>` | `<next action>` | Open / Validating / Verified / Retired / Rejected / Superseded | `<YYYY-MM-DD>` |

## 5. Rules For Retiring Assumptions

An assumption may be retired when:

- it has been verified and converted into a fact in the relevant artifact;
- it has been rejected and no longer supports the project path;
- it has been superseded by a new assumption or decision;
- it is no longer relevant because scope changed;
- the project was deferred, completed, or retired.

Retirement requirements:

1. Record the retirement date.
2. Preserve the original assumption row.
3. Link the validating evidence, rejecting evidence, or superseding decision.
4. Update affected artifacts, decisions, risks, and project state.

## 6. Assumption Review Process

1. Log assumptions as soon as they appear.
2. Assign an owner and validation method.
3. Classify evidence level.
4. Review before every decision gate.
5. Escalate Unverified or Weakly Supported assumptions that affect serious, client-facing, production, or irreversible work.
6. Convert verified assumptions into artifact facts only after evidence is recorded.

## 7. Cross-Register Rules

### Relationship To Other Registers

- Project Register references unresolved assumptions that block or constrain phase movement.
- Decision Register references assumptions used to make or defer decisions.
- Risk Register references assumptions that create or reduce risk.
- Artifact Register references artifacts containing assumption evidence or validation output.

### Source-Of-Truth Requirements

- Assumption state lives here.
- Artifacts may summarize assumptions, but unresolved assumption tracking must point back to this register.
- Do not treat assumption text in a PRD, architecture spec, or chat transcript as the authoritative register.

### Update Cadence

- Review at every gate.
- Review whenever new evidence arrives.
- Review before implementation, launch, or growth expansion.

### Approval Requirements

- Proceeding with Unverified or Weakly Supported assumptions requires explicit approval when downstream work is serious or irreversible.
- Any assumption affecting security, compliance, production, client data, revenue, or public claims requires owner review.

### Audit Requirements

- Every active assumption must have an owner, evidence level, validation method, next action, and review date.
- Verified assumptions must link evidence.
- Rejected or superseded assumptions must preserve history and explain the change.

