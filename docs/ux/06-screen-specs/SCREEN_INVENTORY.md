# Screen Inventory

## Purpose

Track implementation coverage for major AJ Digital OS screens.

## Inventory Fields

| Screen | Role | Tenant Scope | State Coverage | Approval Impact | Status |
|---|---|---|---|---|---|
| Tenant switcher | Platform admin, support, tenant admin | Required | Loading, empty, error, permission, partial success, agent active | Context-sensitive switching | Documented |
| Approval inbox | Platform admin, tenant admin | Required | Loading, empty, error, permission, partial success, agent active | Approval-gated actions | Documented |
| Audit trail | Platform admin, tenant admin, support | Required | Loading, empty, error, permission, partial success, agent active | Evidence and traceability | Documented |
| Dashboard shell | Platform admin, tenant admin, staff | Required | Loading, empty, error, permission, partial success, agent active | May surface approval entry points | Documented |

## Acceptance Criteria

- The inventory can be used to measure documentation coverage.
- Every major screen maps to a spec and an owner.
