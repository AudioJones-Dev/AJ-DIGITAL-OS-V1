# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

- graphifyy v0.8.36+ must be installed before working on any repo: `uv tool install graphifyy` (preferred) or `pip install graphifyy`. Run `uv tool list | grep graphify` to verify. Used for /graphify codebase analysis and knowledge graph generation.

## Child DOX Index

This project is not yet indexed. Before continuing you must scan the project, build the DOX tree and replace this message with the actual index. Go deep and scan files recursively to properly evaluate complexity and create nested DOX files where needed.

---

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
