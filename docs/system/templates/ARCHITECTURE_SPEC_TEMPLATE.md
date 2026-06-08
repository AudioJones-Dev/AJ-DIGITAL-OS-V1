# Architecture Specification Template

**Artifact:** Architecture Specification
**Framework layer:** Architecture Intelligence
**Companion doctrine:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Companion playbook:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Status:** Draft
**Owner:** `<owner>`
**Client / internal system:** `<client or AJ Digital internal>`
**Date:** `<YYYY-MM-DD>`

---

## 1. Architecture Summary

```txt
<summary of the proposed system architecture>
```

## 2. Approved PRD Reference

- PRD path: `<path>`
- PRD approval date: `<date>`
- Scope version: `<version>`
- Open constraints: `<constraints>`

## 3. Existing System Context

- Repo / workspace: `<path>`
- Branch / version: `<branch or version>`
- Existing architecture docs reviewed: `<docs>`
- Existing patterns to preserve: `<patterns>`
- Source-of-truth files: `<files>`

## 4. System Boundaries

| Component | Responsibility | Owns Data? | External Dependencies |
| --- | --- | --- | --- |
| `<component>` | `<responsibility>` | Yes / No | `<dependencies>` |

## 5. Frontend Architecture

- Framework / platform: `<framework>`
- Routes / screens: `<routes>`
- State management: `<state>`
- UI system / components: `<components>`
- Accessibility requirements: `<requirements>`

## 6. Backend Architecture

- Runtime / framework: `<runtime>`
- Services / modules: `<services>`
- Background jobs / queues: `<jobs>`
- File or object storage: `<storage>`
- Error handling: `<handling>`

## 7. API Design

| Endpoint / Interface | Method | Purpose | Auth Required | Notes |
| --- | --- | --- | --- | --- |
| `<endpoint>` | GET / POST / PUT / PATCH / DELETE | `<purpose>` | Yes / No | `<notes>` |

## 8. Data Architecture

- Database choice: `<database>`
- Data ownership: `<ownership>`
- Data retention: `<retention>`
- Migration approach: `<approach>`
- Backup approach: `<approach>`

## 9. Authentication And Authorization

| Role | Access | Restrictions | Notes |
| --- | --- | --- | --- |
| `<role>` | `<access>` | `<restrictions>` | `<notes>` |

## 10. Integrations

| Integration | Direction | Data Exchanged | Owner | Failure Behavior |
| --- | --- | --- | --- | --- |
| `<integration>` | Inbound / Outbound / Bidirectional | `<data>` | `<owner>` | `<behavior>` |

## 11. Observability

- Logs: `<logs>`
- Metrics: `<metrics>`
- Events: `<events>`
- Alerts: `<alerts>`
- Dashboards: `<dashboards>`
- Traceability requirements: `<requirements>`

## 12. Security And Privacy

- Secrets handling: `<handling>`
- Client data handling: `<handling>`
- Tenant isolation: `<model>`
- Permissions model: `<model>`
- Threat considerations: `<considerations>`
- Audit requirements: `<requirements>`

## 13. Scalability And Performance

- Expected load: `<load>`
- Bottlenecks: `<bottlenecks>`
- Caching: `<caching>`
- Load balancing: `<load balancing>`
- Rate limits: `<limits>`
- Performance targets: `<targets>`

## 14. Deployment And Rollback

- Deployment target: `<target>`
- Deployment command / process: `<process>`
- Required env vars: `<names only, no values>`
- Rollback command / process: `<process>`
- Verification command / dashboard: `<verification>`

## 15. Architecture Risks

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| `<risk>` | Low / Medium / High | `<mitigation>` | `<owner>` |

## 16. Approval Gate

Architecture Approval Gate decision:

- Approved.
- Approved with constraints.
- Needs revision.
- Rejected.

Approval:

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Technical owner | `<name>` | Approved / Rejected / Needs revision | `<date>` |
| Founder / operator | `<name>` | Approved / Rejected / Needs revision | `<date>` |

