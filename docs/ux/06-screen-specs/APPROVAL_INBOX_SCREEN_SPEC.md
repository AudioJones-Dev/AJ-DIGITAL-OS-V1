# Approval Inbox Screen Spec

## Purpose

Define the approval inbox for AJ Digital OS.

## Audience / Role

- Platform admin
- Tenant admin
- Delegated approver when the role model supports it

## Tenant Context

The approval inbox MUST show the active tenant for every item.

If a request spans multiple tenants, the inbox MUST fail closed until the tenant scope is resolved.

## Primary Outcome

Let a human review and decide on agent-generated or system-generated approval requests.

## Layout

- queue summary
- request list
- selected request details
- risk and impact panel
- rationale and audit links
- decision actions

## Data Requirements

- approval id
- tenant id
- requester or agent id
- action category
- risk level
- reason
- target
- requested at
- expiry
- approval status
- prior audit linkage

## Actions

- approve
- deny
- request clarification
- inspect audit trail
- filter by tenant, risk, and status

## States

- loading
- empty
- error
- permission denied
- partial success
- agent active

Agent active state SHOULD show that the request is still being prepared, enriched, or summarized by an agent and MUST distinguish this from a ready-for-decision request.

## Accessibility

- request rows MUST be keyboard navigable
- decision controls MUST have clear labels
- status and risk changes MUST be announced
- confirmation dialogs MUST remain accessible

## Audit / Approval Behavior

- every decision MUST be auditable
- approve and deny actions MUST preserve the request record
- risk level SHOULD be visible at the point of decision

## Non-Compliant Patterns

- approval without tenant scope
- approval without impact explanation
- hidden agent-originated requests
- ambiguous approve/deny controls

## Acceptance Criteria

- A reviewer can decide from the inbox without guessing tenant scope or impact.
- The request remains auditable after the decision.
- The screen covers loading, empty, error, permission, partial success, and agent-active states.

## Open Questions

- Should clarification requests create a separate state or stay within the approval record?
- Should the inbox be grouped by tenant first or by risk first?

## Source References

- [`../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`](../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`](../../system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md)
- [`../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`](../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md)
