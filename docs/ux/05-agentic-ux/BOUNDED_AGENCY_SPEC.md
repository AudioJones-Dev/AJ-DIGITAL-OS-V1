# Bounded Agency Spec

## Purpose

Define the limits of AI agency inside AJ Digital OS.

## Standard

Agent behavior SHALL be bounded by:

- tenant context
- role permissions
- approval requirements
- risk policy
- audit requirements

Agent behavior SHALL NOT:

- act outside the selected tenant
- perform irreversible changes without approval
- fabricate missing context

## Acceptance Criteria

- Agent actions are constrained by explicit policy.
- The interface communicates those constraints clearly.
