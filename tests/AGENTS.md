# tests Agent Instructions

## Purpose

This folder owns AJ Digital OS automated tests, fixtures, and validation coverage for runtime, policy, security, connectors, dashboards, and workflows.

## Ownership

- Tests should document expected behavior, policy enforcement, and regression coverage.
- Fixtures must avoid real secrets, client data, or production credentials.

## Local Contracts

- Root safety and approval gates apply to tests.
- Do not weaken or delete tests to make validation pass unless the user explicitly approves the behavioral change.
- Do not add brittle tests that depend on local machine state unless the test is clearly marked and scoped.

## Work Guidance

- Add focused tests near the changed behavior.
- Prefer deterministic fixtures and explicit assertions.
- Keep test names descriptive enough for handoff.
- If a test exposes an existing bug, report the bug rather than hiding the failure.

## Verification

- Run targeted tests when available.
- For broad source changes, run `npm test` plus any required typecheck/build commands from `.codex/validation.json`.

## Child DOX Index

This folder is not yet subdivided by child `AGENTS.md` files.
