# Decisions

## Purpose

This folder records durable AJ Digital OS repository decisions that affect future documentation, implementation, source-of-truth hierarchy, governance, or agent work.

Decision records explain why a path was chosen so future humans and agents do not repeat old debates or silently undo intentional constraints.

## Current Decision Log

- `DECISION_LOG.md`

## Architecture Decision Records

- `ADR-001-XSTATE-LIFECYCLE-SYNTHESIS-BOUNDARY.md` - accepts XState for later test and modeling dependency evaluation while deferring dependency changes, runtime, persistence, and BEL integration.

## Rules

- Keep decisions concise and auditable.
- Record alternatives considered.
- Preserve superseded decisions for history.
- Do not store secrets, credentials, client-private data, or runtime artifacts here.
- Do not use the decision log as a changelog.
