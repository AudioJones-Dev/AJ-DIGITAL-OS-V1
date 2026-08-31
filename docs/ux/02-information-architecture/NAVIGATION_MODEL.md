# Navigation Model

## Purpose

Define the canonical navigation model for AJ Digital OS UX.

## Model

The navigation model SHOULD expose:

- global shell
- tenant context area
- primary work areas
- contextual action area
- approval/audit entry points
- help and recovery paths

## Rules

- The current tenant MUST be visible where state-changing actions are available.
- Navigation MUST not collapse admin and client spaces into one ambiguous surface.
- The approval inbox and audit trail SHOULD be reachable from primary operational surfaces.

## Acceptance Criteria

- A user can find the current tenant and current role without searching.
- The primary navigation does not hide safety-critical actions.
