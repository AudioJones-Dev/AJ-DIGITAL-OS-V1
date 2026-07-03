# Audit Trail UX Spec

## Purpose

Define the audit trail interface.

## Standard

The audit trail SHALL show:

- actor
- tenant
- action
- target
- timestamp
- result
- approval linkage when relevant
- before/after or diff when available

The audit trail SHOULD support filtering by:

- tenant
- role
- risk
- object
- date range

## Acceptance Criteria

- A user can reconstruct what happened without guessing.
- Audit data is understandable to non-technical users.
