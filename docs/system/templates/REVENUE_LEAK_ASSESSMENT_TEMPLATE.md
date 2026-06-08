# Revenue Leak Assessment Template

**Artifact:** Revenue Leak Assessment
**Framework layer:** Founder Intelligence
**Companion doctrine:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Companion playbook:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Status:** Draft
**Owner:** `<owner>`
**Client / internal system:** `<client or AJ Digital internal>`
**Date:** `<YYYY-MM-DD>`

---

## 1. Assessment Summary

```txt
<summary of the revenue leak pattern and why it matters>
```

## 2. Revenue Flow

Map the revenue path.

```txt
Traffic / referral / lead source
-> Lead capture
-> Qualification
-> Follow-up
-> Sales conversation
-> Proposal / quote
-> Close
-> Onboarding
-> Delivery
-> Retention / expansion
```

## 3. Leak Register

| Leak ID | Leak Point | Description | Evidence | Estimated Impact | Confidence |
| --- | --- | --- | --- | --- | --- |
| RL-001 | `<point>` | `<description>` | `<evidence>` | `<impact>` | Low / Medium / High |

## 4. Lead Flow Analysis

| Stage | Expected Behavior | Actual Behavior | Drop-Off / Delay | Notes |
| --- | --- | --- | --- | --- |
| Capture | `<expected>` | `<actual>` | `<drop-off>` | `<notes>` |
| Qualification | `<expected>` | `<actual>` | `<drop-off>` | `<notes>` |
| Follow-up | `<expected>` | `<actual>` | `<drop-off>` | `<notes>` |
| Close | `<expected>` | `<actual>` | `<drop-off>` | `<notes>` |

## 5. Follow-Up Analysis

| Trigger | Required Response | Current Response | Failure Mode | Impact |
| --- | --- | --- | --- | --- |
| `<trigger>` | `<required>` | `<current>` | `<failure>` | `<impact>` |

## 6. Attribution Analysis

| Decision | Required Attribution Signal | Current Signal | Gap | Business Impact |
| --- | --- | --- | --- | --- |
| `<decision>` | `<required>` | `<current>` | `<gap>` | `<impact>` |

## 7. Communication Analysis

| Channel | Failure Pattern | Affected Stage | Impact | Proposed Control |
| --- | --- | --- | --- | --- |
| `<channel>` | `<pattern>` | `<stage>` | `<impact>` | `<control>` |

## 8. Root Cause Hypotheses

| Hypothesis | Supporting Evidence | Evidence Needed | Confidence |
| --- | --- | --- | --- |
| `<hypothesis>` | `<evidence>` | `<needed>` | Low / Medium / High |

## 9. Prioritized Fixes

| Priority | Fix | Leak Addressed | Effort | Expected Impact | Owner |
| --- | --- | --- | --- | --- | --- |
| 1 | `<fix>` | `<leak>` | Low / Medium / High | `<impact>` | `<owner>` |

## 10. System Implications

- CRM implication: `<implication>`
- Automation implication: `<implication>`
- Reporting implication: `<implication>`
- Business Memory implication: `<implication>`
- AgentOS / ResponseOS implication: `<implication>`

## 11. Gate Recommendation

Choose one:

- Pass Founder Diagnostic Gate.
- Pass with constraints.
- Return for more data.
- Stop.

Approval:

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Founder / operator | `<name>` | Approved / Rejected / Needs revision | `<date>` |

