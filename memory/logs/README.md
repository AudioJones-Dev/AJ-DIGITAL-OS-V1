# Log Memory

## Purpose

Stores durable summaries of agent runs, operator workflows, and memory-relevant execution history.

## What Belongs Here

- Run summaries
- Audit-oriented workflow notes
- Execution outcomes
- Links or references to source run artifacts

## What Does Not Belong Here

- Raw unbounded terminal output
- Secrets or environment values
- Temporary runtime JSON produced by tests
- Decisions that should live in `memory/decisions/`

## Write Access

Agents may append bounded, source-aware log summaries when the task authorizes memory capture. Human operators can write corrections.

## Agent Read Access

Agents may read logs through the Memory Router when logs are relevant, recent enough, and within retrieval budget.

## Promotion Path

Lessons learned move to `memory/mistakes/`. Stable procedures move to `memory/sops/`. Architecture choices move to `memory/decisions/`.
