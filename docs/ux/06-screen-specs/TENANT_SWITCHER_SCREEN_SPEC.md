# Tenant Switcher Screen Spec

## Purpose

Define the canonical tenant switcher for AJ Digital OS.

## Audience / Role

- Platform admin
- Support or operations users with cross-tenant access
- Tenant admins when the product allows multiple tenant memberships

## Tenant Context

The current tenant MUST always be visible before the user can switch.

The switcher MUST only show tenants the current actor is authorized to access.

## Primary Outcome

Allow the user to verify and change tenant context safely.

## Layout

- current tenant summary
- searchable authorized tenant list
- tenant metadata or labels when needed
- confirmation state for context changes

## Data Requirements

- tenant name
- tenant id or safe display identifier
- tenant type
- current context indicator
- recent or pinned tenants when available

## Actions

- search tenants
- inspect tenant metadata
- switch tenant
- cancel switch

## States

- loading
- empty
- error
- permission denied
- partial success
- agent active

Agent active state SHOULD show that an assistant is resolving or validating tenant context and MUST require human confirmation before context changes.

## Accessibility

- keyboard accessible search and selection
- visible focus states
- status updates announced to assistive technology
- no color-only tenant indicators

## Audit / Approval Behavior

- tenant switches SHOULD be audited
- any switch that changes client-scoped context SHOULD be traceable
- switching MUST not bypass approval rules for later actions

## Non-Compliant Patterns

- hidden current-tenant state
- unauthorized tenant leakage in search results
- silent tenant switching
- switcher that does not preserve auditability

## Acceptance Criteria

- The current tenant is visible at all times in the switcher.
- Only authorized tenants appear in the list.
- Switching tenants is explicit and auditable.
- The screen covers loading, empty, error, permission, partial success, and agent-active states.

## Open Questions

- Should the switcher be global shell chrome or a dedicated page?
- Should recently used tenants be ordered by recency or by operator preference?

## Source References

- [`../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`](../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`](../../system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md)
- [`../../ui/local-web-shell.md`](../../ui/local-web-shell.md)
