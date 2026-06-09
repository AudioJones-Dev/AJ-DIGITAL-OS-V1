# AJ Digital OS Agent Instructions

AJ Digital OS is the operating-system and governance repository for AJ Digital LLC's agentic operations, workflow orchestration, diagnostics, approvals, attribution, dashboard, and local-first execution surfaces.

These instructions apply to AI agents working inside this repository. Repo-local policy overrides generic assistant behavior only within this repo.

## Canonical Policy Docs

Read these docs before implementation work:

- `docs/OPERATING_POLICY.md`
- `docs/REPO_SAFETY_POLICY.md`
- `docs/IMPLEMENTATION_GATES.md`
- `docs/AGENT_HANDOFF_PROTOCOL.md`
- `.codex/validation.json`
- `.codex/STOP_HOOK_PROPOSAL.md`

Existing operational docs remain source material for human workflows, including `docs/operator-playbook.md`, `docs/operational-baseline-runbook.md`, and `docs/system-architecture.md`.

## Required Operating Mode

Start in diagnosis mode. Before editing files, report:

- Current repo and branch state.
- Relevant existing docs, code, scripts, and conventions inspected.
- Facts, inferences, assumptions, risks, and blockers.
- Proposed file scope.
- Validation plan.

Do not implement until the task is defined and scoped. If the request is vague, contradictory, or risks existing architecture, stop and clarify the blocking issue.

## File Scope Declaration

Before edits, declare the files you intend to create or update. Keep changes inside that declared scope unless a new finding requires an explicit scope update.

Never silently modify:

- Secrets or `.env` files.
- Runtime state, generated logs, snapshots, cache files, or JSONL artifacts.
- Hermes core logic, model-router logic, BEL/runtime execution logic, or existing API routes.
- Global Codex, Claude, MCP, or skill settings.
- Dependency manifests or lockfiles unless the task explicitly requires it and approval is granted.

## Approval Gates

Require explicit human approval before:

- Merge, rebase, push, deploy, or release.
- Destructive filesystem or Git operations.
- Secret, credential, token, or client-data work.
- Production, financial, or external communication actions.
- Global tool, hook, MCP, Claude, Codex, or skill configuration changes.
- Runtime/core modifications to Hermes, model-router, BEL, MCP policy, approval enforcement, or attribution behavior.
- Mass edits, repo-wide refactors, or public copy changes.

Use the operator approval word: `proceed`.

## Validation Reporting

Every final response after file changes must include:

- Files changed.
- Validation commands run.
- Validation results.
- Commands intentionally not run and why.
- Remaining risks or limitations.

Do not claim production readiness from local checks alone.

## Completion Standard

Work is not done until the repo state, changed files, validation outcome, and next operator decision are clear enough for another agent or human to continue safely.
