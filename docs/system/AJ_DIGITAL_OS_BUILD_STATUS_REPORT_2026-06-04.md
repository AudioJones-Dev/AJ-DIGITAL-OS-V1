# AJ Digital OS Build Status Report - 2026-06-04

## 1. Current Git and GitHub State

### Local checkout inspected

- Repository: `AudioJones-Dev/AJ-DIGITAL-OS-V1`
- Local path inspected: `C:\dev\AJ-DIGITAL-OS`
- Local branch inspected: `main`
- Remote default branch: `origin/main`
- Divergence after `git fetch --prune origin`: `main` is ahead 15 commits and behind 6 commits.
- Current local `main` commit at inspection: `c843eb9`
- Current `origin/main` commit at clean report-branch creation: `c1d3d07`
- GitHub authentication: usable through `gh auth status` as active account `AudioJones-Dev`.
- Working tree state: dirty, with 21 modified tracked paths and 13 untracked paths.

The report PR must not be cut from local dirty `main`. This report was prepared on a separate branch created from `origin/main`: `codex/build-status-report-2026-06-04`.

### Dirty local paths requiring triage before launch

Tracked modified paths observed on local `main`:

```txt
.env.example
data/memory/shared/failures.jsonl
docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md
runtime/dag/dag-audit.jsonl
runtime/dag/dag-node-outputs.json
runtime/dag/dag-runs.json
runtime/events/system-events.jsonl
runtime/observability/metrics.json
src/agent-roles/agent-role-types.ts
src/agent-roles/handlers/planner-handler.ts
src/agent-roles/role-types.ts
src/browser-agent/openai.ts
src/connectors/adapters/github.connector.ts
src/connectors/connector-types.ts
src/control-plane/auth/telegram-auth.ts
src/control-plane/index.ts
src/hermes/hermes-notifications.ts
src/model-routing/model-router.ts
src/model-routing/result-shape.ts
src/model-routing/route-policy.ts
tests/connectors/connector.test.ts
```

Untracked paths observed on local `main`:

```txt
.codex/
STARTUP_PROTOCOL_STATUS.md
docs/architecture/auth-and-model-cost-policy.md
runtime/connectors/
runtime/normalization/
runtime/retrieval/
scripts/Start-WithLogging.ps1
scripts/docker-deep-repair.ps1
scripts/fix-all.ps1
scripts/register-startup-orchestrator.ps1
scripts/setup-openclaude.ps1
tests/control-plane/telegram-auth.test.ts
tests/model-routing/
```

### Open pull requests against `main`

Open PRs observed through GitHub CLI on 2026-06-04:

| PR | State | Branch | Title | Launch relevance |
| --- | --- | --- | --- | --- |
| #29 | Open | `claude/sad-noether-09e12b` | `chore(doppler): set up Doppler secrets management` | Secrets-management setup; requires careful review before any credential workflow changes. |
| #28 | Draft | `claude/strategic-pivot-directive-f9ktm` | `docs: adopt Founder Intelligence Systems strategic pivot` | Strategic documentation shift; may affect naming and launch messaging. |
| #27 | Draft | `test/backfill-webhook-coverage-gates` | `test: backfill webhook coverage gates` | Test coverage gate; useful before connector/webhook launch. |
| #26 | Open | `claude/rerun-failed-checks-nTIfE` | `fix(deps): bump axios to ^1.16.1 to clear high-severity advisories` | Security/dependency fix; should be resolved before launch. |
| #25 | Open | `dependabot/npm_and_yarn/dashboard/next-15.5.18` | `chore(deps): bump next from 14.2.35 to 15.5.18 in /dashboard` | Dashboard framework upgrade; can affect UI build/runtime behavior. |
| #22 | Draft | `claude/governance-docs-install-7UBVI` | `docs: install repository governance and operating contract layer` | Governance docs; likely overlaps launch operating rules. |
| #21 | Draft | `claude/audit-repo-readiness-GphcB` | `docs: install repo readiness and agent operating docs` | Readiness docs; should be reconciled with this report. |
| #20 | Draft | `claude/repo-hygiene-audit-PctBU` | `chore(repo): hygiene cleanup - remove tracked runtime state, dedupe AI-skill packs, consolidate stacks` | Directly related to tracked runtime-state cleanup. |
| #19 | Draft | `copilot/build-lead-pipeline-crm-layer` | `feat: add production lead pipeline and lightweight CRM layer` | Product surface addition; should not be merged blindly into dirty runtime state. |
| #17 | Open | `codex/implement-phase-1-of-telegram-control-plane` | `Phase 1: Add private Telegram local control plane (ingress, auth, ops commands, audit)` | Control-plane capability; overlaps local modified Telegram auth files. |
| #15 | Open | `codex/review-code-and-summarize-build-progress` | `docs: Add Release Captain Checklist (pre-deploy)` | Existing launch checklist; should be consolidated. |
| #9 | Open | `codex/find-deployment-status-for-production` | `Add go-live production plan, demo data seeder, and CLI smoke suite` | Go-live planning; must be compared before launch tasks are finalized. |

## 2. Current Build Context by Subsystem

### Control plane

The control-plane surface exists under `src/control-plane/`, including CLI and Ollama adapters, Telegram listener/parser/auth, run registry, control actions, audit logging, and type definitions. The dashboard also exposes control-related pages/components under `dashboard/app/control`, `dashboard/app/runs`, and run detail components.

Current risk: local `main` has tracked modifications in `src/control-plane/auth/telegram-auth.ts` and `src/control-plane/index.ts`, plus untracked `tests/control-plane/telegram-auth.test.ts`. PR #17 also touches Telegram control-plane scope, so launch-readiness work must reconcile branch history, local edits, and test intent before merging or deploying.

### BEL and DAG

BEL runtime modules exist under `src/bel/`, including controller, execution planner/runtime, state store, retry/escalation/result normalization, session manager, task runner, and capabilities. DAG execution exists under `src/bel/dag/` with runtime, store, validator, attribution, and type modules.

Current risk: tracked runtime DAG state is dirty in `runtime/dag/dag-audit.jsonl`, `runtime/dag/dag-node-outputs.json`, and `runtime/dag/dag-runs.json`. These files should be classified as runtime/test output before launch and removed from source-controlled operational state if they are not intentional fixtures.

### Model routing

Model routing exists under `src/model-routing/`, including the router, route policy, result shape, deterministic provider, local provider, OpenAI provider, Perplexity provider, and local provider state.

Current risk: tracked local modifications exist in `src/model-routing/model-router.ts`, `src/model-routing/result-shape.ts`, and `src/model-routing/route-policy.ts`, plus untracked `tests/model-routing/`. The no-emit TypeScript check passes, but the behavioral intent of these changes has not been reviewed or merged into a clean branch.

### Connectors

Connector infrastructure exists under `src/connectors/`, including the registry, executor, attribution, shared types, and adapters for Airtable, GitHub, Gmail, Google Calendar, Google Drive, and webhooks.

Current risk: tracked local modifications exist in `src/connectors/adapters/github.connector.ts`, `src/connectors/connector-types.ts`, and `tests/connectors/connector.test.ts`. Untracked `runtime/connectors/` indicates generated connector state or test output pollution. Connector launch work should isolate runtime output paths before running the full test suite.

### Dashboard

The dashboard exists as a Next.js app under `dashboard/`, with pages for agents, apps, cache, command, connectors, control, DAG runs, decisioning, entities, events, governance, Hermes, opportunities, retrieval, and runs. Shared components include audit trail, connector rows, enforcement status, MAP attribution, mission cards, run controls, run details, runs table, sidebar, and status badges.

Current risk: dashboard dependency PR #25 upgrades Next from 14.2.35 to 15.5.18. That upgrade should be validated separately before launch because it can change routing, build behavior, and runtime compatibility.

### Retrieval

Operational retrieval modules exist under `src/retrieval/`, including context, ingestor, policy, search, store, attribution, types, and index exports. The dashboard exposes `dashboard/app/retrieval`.

Current risk: untracked `runtime/retrieval/` exists on local `main`. This should be treated as runtime state unless explicitly promoted to fixtures or seed data.

### Governance

Governance modules exist under `src/governance/`, including agent behavior, brand voice, client rules, legal policy, offer policy, SOP policy, governance engine, attribution, and shared types. Runtime policies are tracked under `runtime/policies/`.

Current risk: multiple open governance/readiness documentation PRs (#22, #21, #15, #9) may overlap. The current report should become a consolidation reference, not another stale launch artifact.

### Runtime and ops

Runtime and ops surfaces include Hermes modules under `src/hermes/`, observability metrics under `src/observability/`, runtime event/metrics files under `runtime/`, memory failure state under `data/memory/shared/failures.jsonl`, deployment/runbook docs under `docs/`, and local scripts under `scripts/`.

Current risk: runtime state is currently mixed with source-control state. Tracked dirty files include runtime DAG outputs, system events, observability metrics, and memory failures. Untracked ops scripts exist locally and need source/intent review before any commit.

## 3. Validation Evidence

Validation run on local dirty `main` from `C:\dev\AJ-DIGITAL-OS`:

```powershell
node scripts/run-tsc.cjs --noEmit
```

Result: passed with exit code 0.

Full `npm test` was intentionally not run for this status report because the current tree already contains tracked runtime/test output and untracked generated runtime directories. Running the full suite before isolating those output paths could add more noisy state and make launch cleanup harder to audit.

## 4. Risks and Blockers

### Blockers before launch

1. Dirty tracked runtime files are present and must be cleaned or formally classified.
2. Generated connector/retrieval/normalization runtime directories are untracked and need ignore/path isolation decisions.
3. Local `main` is ahead 15 and behind 6, so it is not a clean launch base.
4. Open dependency/security PRs (#26 and #25) are unresolved.
5. Open repo-hygiene PR #20 directly overlaps the tracked runtime-state problem.
6. Open control-plane PR #17 overlaps current local Telegram/control-plane files.

### Material risks

- Stale reports can create false readiness. `BUILD-PROGRESS.md` is dated 2026-04-11 and describes an older branch/context. `docs/system/AJ_DIGITAL_OS_REPO_VALIDATION_REPORT.md` is also older than the current subsystem expansion.
- Runtime JSON/JSONL files are currently easy to mutate during validation. That makes it unsafe to interpret a dirty worktree as intentional source changes without per-file review.
- Multiple draft PRs contain docs, governance, readiness, and launch-planning changes. Merging them without consolidation can reintroduce contradictory operating rules.
- The TypeScript no-emit pass proves compile-level health, not launch readiness, clean state, secret hygiene, dashboard build health, or production safety.

## 5. Recommended Next Phase

The next phase should be launch-readiness cleanup and PR consolidation, not new feature implementation.

Recommended sequence:

1. Freeze new subsystem work until the launch base is reconciled.
2. Create a clean integration branch from updated `origin/main`.
3. Review local `main` ahead commits against open PRs and identify what is already represented remotely.
4. Classify every dirty tracked local file as one of: intentional source change, runtime/test output, stale generated data, or docs artifact.
5. Move runtime/test outputs out of tracked launch state by policy, ignore rules, fixtures, or explicit seed-data promotion.
6. Resolve dependency/security PRs before production launch decisions.
7. Consolidate overlapping docs/readiness PRs into one launch source of truth.
8. Re-run validation in a clean tree: TypeScript no-emit, focused connector/control/model-routing tests, dashboard build, then full test suite only after runtime output isolation is fixed.

## 6. Task-Ready Launch Queue

| Task | Owner | Acceptance criteria |
| --- | --- | --- |
| Runtime-state classification | Codex | A table of all tracked dirty `runtime/**` and `data/memory/shared/failures.jsonl` files is produced with keep/remove/ignore/fixture decisions; no file is deleted without operator approval. |
| Dirty source diff review | Codex | Each modified source/test path on local `main` is mapped to an open PR, local-only change, or discard candidate; no source edit is silently overwritten. |
| Branch divergence reconciliation | Codex + operator | Local ahead commits and remote behind commits are compared; launch base branch is selected; conflicts and duplicate work are documented before merge. |
| Dependency/security PR resolution | Codex | PR #26 and PR #25 are reviewed, validated, and either merged, superseded, or closed with rationale. |
| Connector runtime-output isolation | Codex | Connector tests no longer dirty tracked runtime files; generated connector state is written to an ignored temp/test path or explicit fixture path. |
| Control-plane PR consolidation | Codex | PR #17 and local Telegram/control-plane changes are compared; one canonical implementation/test set is selected. |
| Readiness docs consolidation | ChatGPT + Codex | PRs #9, #15, #21, #22, #28, and this report are reconciled into a single current launch-readiness source of truth. |
| Clean validation pass | Codex | On a clean launch branch, `node scripts/run-tsc.cjs --noEmit` passes, focused affected tests pass, dashboard validation passes, and `git status --short` is clean afterward. |
| Launch gate review | Operator | Operator approves or blocks launch using the consolidated checklist and explicit risk register. |

## 7. Report PR Scope

This report PR is documentation-only. It intentionally does not:

- delete runtime files,
- modify `.gitignore`,
- fix TypeScript/source changes,
- reconcile branch divergence,
- merge open PRs,
- change secrets or credential handling,
- run production deploys,
- rerun the full test suite,
- or modify `BUILD-PROGRESS.md`.

The only intended PR diff is:

```txt
docs/system/AJ_DIGITAL_OS_BUILD_STATUS_REPORT_2026-06-04.md
```
