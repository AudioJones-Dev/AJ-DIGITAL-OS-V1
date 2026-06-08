# System Design Document Template

**Artifact:** System Design Document
**Framework layer:** Architecture Intelligence
**Companion doctrine:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Companion playbook:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Status:** Draft
**Owner:** `<owner>`
**Client / internal system:** `<client or AJ Digital internal>`
**Date:** `<YYYY-MM-DD>`

---

## 1. Design Objective

```txt
<what this system must do and why>
```

## 2. Design Inputs

- Approved PRD: `<path>`
- Architecture Specification: `<path>`
- Diagnostic artifacts: `<paths>`
- Constraints: `<constraints>`
- Existing systems: `<systems>`

## 3. User / Operator Flows

```txt
Actor
-> Action
-> System response
-> Data stored or emitted
-> Next action
```

## 4. Component Diagram

Use a text diagram if no visual diagram exists.

```txt
<client / operator>
  -> <frontend>
  -> <api / service>
  -> <database / storage>
  -> <external integration>
  -> <dashboard / reporting>
```

## 5. Data Model

| Entity | Purpose | Key Fields | Owner | Notes |
| --- | --- | --- | --- | --- |
| `<entity>` | `<purpose>` | `<fields>` | `<owner>` | `<notes>` |

## 6. State Transitions

| State | Trigger | Next State | Side Effects |
| --- | --- | --- | --- |
| `<state>` | `<trigger>` | `<next>` | `<effects>` |

## 7. Integration Map

| System | Integration Type | Data In | Data Out | Failure Mode |
| --- | --- | --- | --- | --- |
| `<system>` | API / Webhook / File / Manual / Other | `<data>` | `<data>` | `<failure>` |

## 8. Event / Reporting Model

| Event / Metric | Trigger | Payload / Fields | Used By |
| --- | --- | --- | --- |
| `<event>` | `<trigger>` | `<fields>` | `<consumer>` |

## 9. Permissions Design

| Role | Can View | Can Create | Can Update | Can Delete | Notes |
| --- | --- | --- | --- | --- | --- |
| `<role>` | `<items>` | `<items>` | `<items>` | `<items>` | `<notes>` |

## 10. Failure Handling

| Failure | Detection Method | User / Operator Impact | Recovery Path |
| --- | --- | --- | --- |
| `<failure>` | `<method>` | `<impact>` | `<path>` |

## 11. Operational Handoff

- Owner: `<owner>`
- Support path: `<path>`
- Documentation location: `<location>`
- Monitoring location: `<location>`
- Manual fallback: `<fallback>`

## 12. Design Decisions

| Decision | Options Considered | Chosen Path | Reason | Tradeoff |
| --- | --- | --- | --- | --- |
| `<decision>` | `<options>` | `<path>` | `<reason>` | `<tradeoff>` |

## 13. Open Questions

- `<question>`

## 14. Approval

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Technical owner | `<name>` | Approved / Rejected / Needs revision | `<date>` |
| Founder / operator | `<name>` | Approved / Rejected / Needs revision | `<date>` |

