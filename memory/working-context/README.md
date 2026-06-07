# Working Context Memory

## Purpose

Stores the current operating context for active AJ Digital OS work. This is the short-lived context that helps agents and operators resume the next action without rereading the full vault.

## What Belongs Here

- Current objective and active repo
- Active tenant, client, project, or brand context
- Decisions already made in the current workstream
- Constraints, blockers, and immediate next action

## What Does Not Belong Here

- Permanent architectural decisions
- Client profiles
- Secrets, credentials, tokens, or private contact data
- Full transcripts or unbounded agent logs

## Write Access

Human operators can write directly. Agents can propose updates and may write only when an active task explicitly permits working-context updates.

## Agent Read Access

Agents may read this folder through the Memory Router when the request matches the active repo, client, project, or task scope.

## Promotion Path

Stable decisions move to `memory/decisions/`. Reusable operating steps move to `memory/sops/`. Client-specific facts move to `memory/clients/`. Runtime logs move to `memory/logs/`.
