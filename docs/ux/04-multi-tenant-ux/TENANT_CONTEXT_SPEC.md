# Tenant Context Spec

## Purpose

Define how tenant context must appear in AJ Digital OS interfaces.

## Standard

Tenant context SHALL be explicit before any client-impacting action.

Tenant context SHOULD be visible in:

- shell header
- action panels
- approval workflows
- agent execution views
- audit trails
- dashboards

Tenant context SHALL NOT be assumed from history alone.

## Acceptance Criteria

- A user can identify the active tenant before acting.
- A screen cannot trigger client-impacting work without a tenant context.
