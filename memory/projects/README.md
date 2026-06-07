# Project Memory

## Purpose

Stores project-scoped context, active deliverables, constraints, and build status.

## What Belongs Here

- Project objectives
- Scope, milestones, and deliverables
- Repo and deployment context
- Open questions and blockers
- Project-specific decisions that are not global architecture decisions

## What Does Not Belong Here

- General SOPs
- Raw runtime output
- Secrets or environment values
- Client facts unrelated to the project

## Write Access

Human operators and authorized agents may update project memory when source-backed and scoped to a known project.

## Agent Read Access

Agents may read project memory through the Memory Router when the project id or active repo matches.

## Promotion Path

Reusable procedures move to `memory/sops/`. Global architecture decisions move to `memory/decisions/`. Approved project facts move to canonical Postgres project records.
