# .codex Agent Instructions

## Purpose

This folder owns repo-local Codex guidance, validation declarations, stop-hook proposals, and agent workflow controls for AJ Digital OS.

## Ownership

- Keep `.codex/validation.json` as the source of truth for repo-local validation command sets.
- Keep `.codex/STOP_HOOK_PROPOSAL.md` as a proposal until a separate approval explicitly enables hook implementation.
- Do not treat global Codex configuration as owned by this repo.

## Local Contracts

- Root `AGENTS.md` safety and approval gates apply here.
- Do not modify global Codex, Claude, MCP, skill, or hook settings from this folder unless the operator explicitly approves that global change.
- Do not add secret values, tokens, or local credentials to repo-local Codex files.
- Keep validation declarations descriptive and reviewable; they must not auto-run commands by themselves.

## Work Guidance

- Prefer small, auditable changes to validation metadata and policy proposals.
- When adding validation commands, state when they should run and whether they are required.
- Do not enable enforcement hooks as part of a proposal update.

## Verification

- For JSON changes, parse the changed JSON file.
- For docs/config-only changes, run `git status --short`, `git diff --name-only`, and `git diff --check`.

## Child DOX Index

This folder is not yet subdivided by child `AGENTS.md` files.
