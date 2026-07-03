# Audit Trail Screen Spec

## Purpose

Define the audit trail view for AJ Digital OS.

## Audience / Role

- Platform admin
- Tenant admin
- Support or compliance users with read access

## Tenant Context

The audit trail MUST default to the current tenant where tenant-scoped records are involved.

Cross-tenant views MUST be explicit and permissioned.

## Primary Outcome

Let the user reconstruct what happened, who did it, when it happened, and what approval or risk context applied.

## Layout

- audit list
- filters
- detail drawer or detail panel
- approval linkage
- before/after evidence when available

## Data Requirements

- actor
- tenant
- role or actor type
- action
- object target
- risk level
- approval status
- timestamp
- outcome
- diff or event detail when available

## Actions

- filter by tenant, actor, action, risk, and date
- open record detail
- inspect linked approval
- export only when policy allows

## States

- loading
- empty
- error
- permission denied
- partial success
- agent active

Agent active state MAY show a live agent summary or an in-progress summarization of events, but it MUST not obscure the raw audit record state.

## Accessibility

- table or list structure MUST be semantic
- filters MUST be keyboard accessible
- record details MUST be reachable without pointer-only interaction

## Audit / Approval Behavior

- the audit trail is itself the source of truth for traceability
- approval records SHOULD link directly from audit entries
- exports or sharing MUST remain policy governed

## Non-Compliant Patterns

- raw technical logs as the primary user surface
- tenant mixing without explicit markers
- audit rows without actor or timestamp
- diff data hidden behind ambiguous icons only

## Acceptance Criteria

- A user can reconstruct the action chain from the screen.
- Audit and approval linkage is visible where relevant.
- The screen covers loading, empty, error, permission, partial success, and agent-active states.

## Open Questions

- Should exports be a first-class action or a separately governed workflow?
- Should agent summaries be shown inline or in a side panel?

## Source References

- [`../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`](../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`](../../system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md)
- [`../../architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`](../../architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md)
