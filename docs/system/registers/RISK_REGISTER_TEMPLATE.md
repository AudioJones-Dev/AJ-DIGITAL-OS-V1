# Risk Register Template

```yaml
title: Risk Register
status: Draft
owner: <owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
project: <project or portfolio name>
artifact_type: register
source_of_truth: docs/system/registers/RISK_REGISTER_TEMPLATE.md
```

**Register purpose:** Track known project risks across the Founder Intelligence Product Factory lifecycle.
**Framework source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Execution source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Artifact source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_ARTIFACT_INDEX.md`

---

## 1. Purpose

The Risk Register is the authoritative control plane for known risks affecting an FIPF project.

It tracks risk category, probability, impact, severity, mitigation, owner, review date, evidence, approval state, and next action so risks are managed before they become failures.

## 2. Risk Categories

| Category | Definition |
| --- | --- |
| Technical | Architecture, implementation, reliability, scalability, or maintainability risk |
| Operational | Workflow, ownership, adoption, support, process, or handoff risk |
| Security | Secrets, permissions, data exposure, tenant isolation, abuse, or access-control risk |
| Financial | Cost, revenue, margin, payment, budget, or ROI risk |
| Compliance | Legal, regulatory, privacy, contractual, or policy risk |
| Market | Demand, positioning, competition, distribution, or adoption risk |
| Dependency | Vendor, integration, data source, approval, staffing, or external-system risk |

## 3. Risk Scoring Methodology

Use Low, Medium, High for Probability and Impact.

| Probability | Definition |
| --- | --- |
| Low | Unlikely based on current evidence |
| Medium | Plausible or partially evidenced |
| High | Likely, recurring, or already observed |

| Impact | Definition |
| --- | --- |
| Low | Minor rework or limited project effect |
| Medium | Meaningful delay, cost, quality, trust, or scope effect |
| High | Production, client, financial, security, compliance, or strategic impact |

Severity:

| Probability | Impact | Severity |
| --- | --- | --- |
| Low | Low | Low |
| Low | Medium | Medium |
| Low | High | Medium |
| Medium | Low | Medium |
| Medium | Medium | Medium |
| Medium | High | High |
| High | Low | Medium |
| High | Medium | High |
| High | High | High |

## 4. Governance Fields

Every risk update must include:

| Field | Requirement |
| --- | --- |
| Date | Date the risk was logged or reviewed |
| Owner | Person accountable for mitigation or acceptance |
| Status | Open, Monitoring, Mitigated, Accepted, Escalated, or Closed |
| Evidence | Source material supporting the risk rating |
| Approval | Approver for acceptance, escalation, or closure |
| Next Action | Immediate mitigation, review, or escalation step |

## 5. Risk Register

| Risk ID | Date | Description | Category | Probability | Impact | Severity | Mitigation | Owner | Evidence | Approval | Next Action | Review Date | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RISK-001 | `<YYYY-MM-DD>` | `<description>` | Technical / Operational / Security / Financial / Compliance / Market / Dependency | Low / Medium / High | Low / Medium / High | Low / Medium / High | `<mitigation>` | `<owner>` | `<evidence link>` | `<approval state>` | `<next action>` | `<YYYY-MM-DD>` | Open / Monitoring / Mitigated / Accepted / Escalated / Closed |

## 6. Escalation Thresholds

| Condition | Required Escalation |
| --- | --- |
| Severity is High | Founder / operator and responsible owner |
| Category is Security with Medium or High impact | Technical owner and founder / operator |
| Category is Compliance with Medium or High impact | Founder / operator and compliance owner |
| Risk blocks a decision gate | Gate owner |
| Risk requires scope, budget, timeline, or architecture change | Founder / operator |
| Risk is accepted rather than mitigated | Founder / operator or authorized owner |

## 7. Risk Review Process

1. Log risks when discovered, not after failure.
2. Assign an owner and review date.
3. Link evidence, affected artifacts, assumptions, and decisions.
4. Escalate when thresholds are met.
5. Review open risks before every gate.
6. Close risks only when mitigation evidence exists or acceptance is approved.

## 8. Cross-Register Rules

### Relationship To Other Registers

- Project Register risk level should reflect active High or Medium risks.
- Decision Register records accepted risks and mitigation decisions.
- Assumption Register tracks assumptions that create or reduce risks.
- Artifact Register tracks which artifacts contain risk evidence.

### Source-Of-Truth Requirements

- Risk details live here.
- Risk mentions inside PRDs, architecture specs, or reviews must link back to this register.
- Accepted risks must have an approval reference.

### Update Cadence

- Review at every gate.
- Review weekly for active projects.
- Review immediately when evidence changes probability, impact, or severity.

### Approval Requirements

- High-severity risk acceptance requires founder / operator approval.
- Security, compliance, production, financial, or client-impacting risks require explicit owner review.

### Audit Requirements

- Every open risk must have an owner, evidence, next action, and review date.
- Closed risks must preserve mitigation or acceptance evidence.
- Do not delete historical risks; mark Closed or Archived.

