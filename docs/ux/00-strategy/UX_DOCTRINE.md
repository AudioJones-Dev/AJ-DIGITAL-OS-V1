# UX Doctrine

## Purpose

Define the canonical AJ Digital OS UX doctrine.

## Doctrine

UI/UX is the human control surface for AJ Digital OS.

Interfaces SHALL expose:

- control
- context
- risk
- approval state
- auditability
- business outcome

Interfaces SHALL hide:

- unnecessary orchestration complexity
- internal implementation details that do not help the user act

AI agents SHALL NOT invent UX from assumptions.

Every important action path SHOULD be bound to:

- a role definition
- a tenant context
- an approval model if the action is risky
- an audit trail
- a state model

## Non-Compliant Patterns

- action buttons with no tenant context
- AI results with no rationale or provenance
- dashboards with unprioritized metrics
- hidden destructive actions
- client-facing screens that expose internal plumbing

## Acceptance Criteria

- The doctrine can be used as a review checklist.
- The doctrine aligns with existing tenant isolation and approval specs.
- The doctrine is specific enough for AI coding agents to follow.

## Source References

- [`../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`](../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`](../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`](../../system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md)
- [`../../ui/local-web-shell.md`](../../ui/local-web-shell.md)
