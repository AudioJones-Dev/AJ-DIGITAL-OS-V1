# Dashboard Shell Screen Spec

## Purpose

Define the canonical dashboard shell for AJ Digital OS.

## Audience / Role

- Platform admin
- Tenant admin
- Tenant staff with dashboard access

## Tenant Context

The dashboard shell MUST show the active tenant when any tenant-scoped data is visible.

If the shell supports multiple tenants, tenant context MUST remain persistent across navigation.

## Primary Outcome

Give the user a fast operational read on status, priority, and next action.

## Layout

- shell header with tenant context
- top-level outcome summary
- prioritized KPI or status cards
- approval or escalation entry points
- recent activity or operational feed
- contextual detail region

## Data Requirements

- current tenant
- current role
- top outcome metrics
- pending approvals or blockers
- recent activity
- agent activity status when present

## Actions

- inspect a metric
- open a detail view
- jump to approval inbox
- switch tenant where permitted
- acknowledge or drill into alerts

## States

- loading
- empty
- error
- permission denied
- partial success
- agent active

Agent active state SHOULD show what the agent is doing, what it is waiting on, and whether approval is pending.

## Accessibility

- shell landmarks MUST be semantic
- key status changes MUST be announced
- dashboard cards MUST remain navigable by keyboard
- color MUST not be the only state signal

## Audit / Approval Behavior

- dashboard actions that trigger client-impacting workflows MUST preserve approval behavior
- the shell SHOULD surface approval status and audit entry points

## Non-Compliant Patterns

- metric soup with no hierarchy
- dashboard without tenant visibility
- generic "working" loading copy
- client-impacting controls without audit or approval linkage

## Acceptance Criteria

- The dashboard answers the main operational question quickly.
- Tenant and role context are visible.
- The screen covers loading, empty, error, permission, partial success, and agent-active states.
- The shell does not expose internal orchestration complexity to client users.

## Open Questions

- Which KPI hierarchy is canonical for the first production dashboard?
- Should the shell default to a tenant summary or a role-specific task queue?

## Source References

- [`../../ui/local-web-shell.md`](../../ui/local-web-shell.md)
- [`../../ui/design-token-system.md`](../../ui/design-token-system.md)
- [`../../architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`](../../architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md)
