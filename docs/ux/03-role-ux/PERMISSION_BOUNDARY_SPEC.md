# Permission Boundary Spec

## Purpose

Define how permission boundaries should appear in AJ Digital OS UX.

## Standard

Permission boundaries SHALL be treated as UX, not just backend policy.

When access is denied, the interface SHOULD state:

- what was requested
- that the action is unavailable
- why it is unavailable when safe to disclose
- what the user can do next

The UI SHALL NOT reveal forbidden data as a side effect of denial handling.

## Acceptance Criteria

- Permission denial is understandable and non-leaky.
- The UI does not create cross-tenant or cross-role confusion.
