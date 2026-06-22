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

## DOX Documentation Tree

AJ Digital OS uses a repo-local DOX-style `AGENTS.md` hierarchy adapted from `agent0ai/dox`. DOX is not a package, MCP server, or runtime dependency in this repo; it is a Markdown contract for keeping agent instructions close to the files they govern.

Before editing:

1. Read this root `AGENTS.md`.
2. Identify the files or folders expected to change.
3. Walk from the repository root to each target path.
4. Read every `AGENTS.md` found along that route.
5. Treat the nearest `AGENTS.md` as the local contract and every parent `AGENTS.md` as the inherited contract.

If instructions conflict, the closer `AGENTS.md` controls local workflow details, but no child file may weaken root safety, approval, secret, validation, or protected-path rules.

After meaningful changes, run a DOX pass before final response:

- Update the nearest owning `AGENTS.md` if the change alters durable purpose, scope, ownership, local contracts, workflows, required inputs or outputs, permissions, side effects, artifacts, or verification.
- Update parent indexes when child ownership or folder boundaries change.
- Remove stale or contradictory guidance instead of layering new text over old text.
- Leave `AGENTS.md` unchanged for small edits that do not alter durable behavior, but report that the DOX pass found no docs update needed.

### Child DOX Index

- `.codex/AGENTS.md` - repo-local Codex policy, validation registry, and hook proposals.
- `config/AGENTS.md` - static non-secret configuration, seed lists, and module config contracts.
- `docs/AGENTS.md` - canonical policy docs, specs, runbooks, release notes, and operational documentation.
- `runtime/AGENTS.md` - runtime state surfaces, local execution artifacts, connector state, and generated operational data.
- `src/AGENTS.md` - TypeScript source, CLI, Hermes, BEL, MCP, security, services, and application modules.
- `tests/AGENTS.md` - test suites, fixtures, and validation coverage.

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
