# docs/ux Agent Instructions

## Purpose

This folder owns the AJ Digital OS UX doctrine draft surface.

It defines how agents and humans should specify interface behavior for:

- tenant-aware workflows
- role-based surfaces
- agentic interfaces
- approval and audit UI
- dashboards
- accessibility
- content and microcopy

## Local Contract

- Keep this tree documentation-only.
- Treat `docs/ux/` as the draft surface for UX doctrine, screen specs, and interface guardrails; vault-canonical ratification is pending.
- Align with parent policy in [`../AGENTS.md`](../AGENTS.md), [`../system/`](../system), and [`../specs/`](../specs).
- Prefer explicit standards over vague design advice.
- Separate facts, inferences, assumptions, risks, and open questions.

## Required Shape

Every standard in this tree SHOULD include:

- purpose
- doctrine or rules
- required states or fields
- acceptance criteria
- non-compliant patterns or anti-patterns
- open questions when decisions are unresolved
- source references when the standard depends on existing repo doctrine

## Validation

For docs-only work in this tree:

- run `git status --short`
- run `git diff --name-only`
- run `git diff --check`

If a doc introduces executable examples, validate them separately only if they are meant to be run.
