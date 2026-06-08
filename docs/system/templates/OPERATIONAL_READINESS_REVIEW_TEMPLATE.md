# Operational Readiness Review Template

**Artifact:** Operational Readiness Review
**Framework layer:** Operational Intelligence
**Companion doctrine:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Companion playbook:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Status:** Draft
**Owner:** `<owner>`
**Client / internal system:** `<client or AJ Digital internal>`
**Date:** `<YYYY-MM-DD>`

---

## 1. Readiness Decision

Choose one:

- Ready for launch.
- Ready with constraints.
- Not ready.
- Inconclusive.

Decision rationale:

```txt
<rationale>
```

## 2. System Summary

- System / product: `<name>`
- Version / commit / release: `<version>`
- Deployment target: `<target>`
- Operator: `<operator>`
- Technical owner: `<owner>`
- Support owner: `<owner>`

## 3. Validation Evidence

| Check | Command / Method | Result | Notes |
| --- | --- | --- | --- |
| Typecheck | `<command>` | Pass / Fail / Skipped | `<notes>` |
| Tests | `<command>` | Pass / Fail / Skipped | `<notes>` |
| Build | `<command>` | Pass / Fail / Skipped | `<notes>` |
| Manual QA | `<method>` | Pass / Fail / Skipped | `<notes>` |
| Security review | `<method>` | Pass / Fail / Skipped | `<notes>` |

## 4. Operating Ownership

| Area | Owner | Backup | Notes |
| --- | --- | --- | --- |
| Business process | `<owner>` | `<backup>` | `<notes>` |
| Technical maintenance | `<owner>` | `<backup>` | `<notes>` |
| Support / escalation | `<owner>` | `<backup>` | `<notes>` |
| Reporting decisions | `<owner>` | `<backup>` | `<notes>` |

## 5. Monitoring And Alerts

| Signal | Tool / Location | Threshold | Owner | Response |
| --- | --- | --- | --- | --- |
| `<signal>` | `<location>` | `<threshold>` | `<owner>` | `<response>` |

## 6. Documentation

| Document | Location | Owner | Status |
| --- | --- | --- | --- |
| Operating Playbook | `<path>` | `<owner>` | Ready / Missing / Needs update |
| Support Map | `<path>` | `<owner>` | Ready / Missing / Needs update |
| Rollback Plan | `<path>` | `<owner>` | Ready / Missing / Needs update |
| User / client docs | `<path>` | `<owner>` | Ready / Missing / Needs update |

## 7. Business Memory

- Decisions to capture: `<decisions>`
- Exceptions to capture: `<exceptions>`
- Reusable patterns to capture: `<patterns>`
- Memory location: `<location>`
- Update cadence: `<cadence>`

## 8. Rollback Plan

- Rollback owner: `<owner>`
- Rollback trigger: `<trigger>`
- Rollback process: `<process>`
- Data impact: `<impact>`
- Verification after rollback: `<verification>`

## 9. Launch Risks

| Risk | Impact | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| `<risk>` | Low / Medium / High | Low / Medium / High | `<mitigation>` | `<owner>` |

## 10. Open Gaps

| Gap | Severity | Owner | Required Before Launch? |
| --- | --- | --- | --- |
| `<gap>` | Low / Medium / High | `<owner>` | Yes / No |

## 11. Operational Readiness Gate

Gate result:

- Pass.
- Pass with constraints.
- Fail.

Approval:

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Technical owner | `<name>` | Approved / Rejected / Needs revision | `<date>` |
| Operator | `<name>` | Approved / Rejected / Needs revision | `<date>` |

