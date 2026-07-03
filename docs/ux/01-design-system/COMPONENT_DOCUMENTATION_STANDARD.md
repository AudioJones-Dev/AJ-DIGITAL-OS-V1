# Component Documentation Standard

## Purpose

Define the minimum documentation required for reusable UI components.

## Standard

Each component spec SHALL include:

- component purpose
- intended context
- required props or inputs
- supported states
- disabled and error behavior
- accessibility notes
- content rules
- non-compliant usage

Each component spec SHOULD identify:

- whether the component is tenant-aware
- whether the component is role-aware
- whether the component can trigger approvals

## Acceptance Criteria

- A developer can use the component without guessing its state model.
- The component's user impact is clear.
- The spec states when the component must not be used.
