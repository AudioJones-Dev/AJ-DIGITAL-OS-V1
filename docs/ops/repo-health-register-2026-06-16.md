# AJ Digital OS Repo Health Register - 2026-06-16

## Purpose

This register documents local branch and worktree health for `C:\dev\AJ-DIGITAL-OS`.
It is an inventory and handoff artifact, not approval to merge, rebase, push, delete,
stash, clean, or otherwise reconcile branch state.

## Source Of Truth And Limits

Facts in this report come from local Git inspection on June 16, 2026.

Commands used:

- `git status --short --branch`
- `git worktree list --porcelain`
- `git for-each-ref refs/heads --format="%(refname:short)|%(objectname:short)|%(upstream:short)|%(upstream:track)|%(worktreepath)|%(subject)"`
- `git branch --no-merged origin/main`
- `git branch --merged origin/main`
- `git diff --name-status`
- `git ls-files --others --exclude-standard`

Not run:

- `git fetch`, `git fetch --prune`, or sync scripts.
- Any merge, rebase, push, stash, delete, clean, reset, or deploy command.

Because no fetch/prune was run for this report, remote-tracking data reflects the
local copy of `origin/*` at inspection time and may be stale.

## Summary

| Area | Observed state |
|---|---|
| Primary checkout | `C:\dev\AJ-DIGITAL-OS` |
| Current branch | `codex/docs-knowledge-layer-scaffold` |
| Current upstream | `origin/main` |
| Current branch divergence | Ahead 1, behind 0 |
| Local branches | 47 |
| Local branches not merged into `origin/main` | 37 |
| Linked worktrees | 7 |
| Dirty worktrees | 4 |
| Clean linked worktrees | 3 |

## Risk Model

| Risk level | Meaning |
|---|---|
| High | Uncommitted source, policy, runtime, or generated files exist and must be preserved or reviewed before cleanup. |
| Medium | Branch has committed work not merged into `origin/main`, no upstream, a gone upstream, or divergence. |
| Low | Branch/worktree is clean and tracks a remote branch without ahead/behind drift. |

## Dirty Worktree Register

These are the only linked worktrees with uncommitted changes observed during this
inspection.

| Worktree | Branch | State | Risk | Recommended next action |
|---|---|---|---|---|
| `C:\dev\AJ-DIGITAL-OS` | `codex/docs-knowledge-layer-scaffold` | Ahead 1 of `origin/main`; tracked DOX edits plus untracked CRM module/spec/tests. | High | Review CRM feature scope, then decide whether to commit, split, or move into a dedicated worktree. Do not clean. |
| `C:\dev\AJ-DIGITAL-OS\.claude\worktrees\modest-banach-1a7159` | `claude/coverage-index-rebaseline` | In sync with `origin/claude/coverage-index-rebaseline`; untracked runtime files. | High | Classify as runtime/generated artifacts. Do not delete without explicit cleanup approval. |
| `C:\dev\AJ-DIGITAL-OS-grafana-coverage-index-symmetry` | `docs/grafana-coverage-index-symmetry` | No upstream; modified root `AGENTS.md`. | High | Review the 88-line DOX framework injection before commit or discard. Policy-surface change. |
| `C:\dev\AJ-DIGITAL-OS-open-webui-workbench-layer` | `docs/open-webui-ai-workbench-layer` | No upstream; modified root `AGENTS.md`. | High | Review the duplicate 88-line DOX framework injection before commit or discard. Policy-surface change. |

### Current Checkout Open Files

Branch: `codex/docs-knowledge-layer-scaffold`

Tracked changes:

- `docs/AGENTS.md`
- `src/AGENTS.md`
- `tests/AGENTS.md`

Untracked candidate source/docs/tests:

- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md`
- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`
- `src/crm/crm-approval-policy.ts`
- `src/crm/crm-attribution.ts`
- `src/crm/crm-audit.ts`
- `src/crm/crm-schemas.ts`
- `src/crm/crm-seed.ts`
- `src/crm/crm-service.ts`
- `src/crm/crm-types.ts`
- `src/crm/index.ts`
- `src/crm/persistent-crm-store.ts`
- `src/crm/tenant-context.ts`
- `src/crm/tenant-scoped-store.ts`
- `tests/crm/crm-service.test.ts`
- `tests/crm/persistent-crm-store.test.ts`
- `tests/crm/tenant-context.test.ts`

Inference: this appears to be real multi-tenant CRM feature work with matching specs
and tests, not disposable generated output.

### Coverage Rebaseline Runtime Files

Worktree: `C:\dev\AJ-DIGITAL-OS\.claude\worktrees\modest-banach-1a7159`

Untracked runtime/generated files:

- `runtime/connectors/audit.jsonl`
- `runtime/connectors/registry.json`
- `runtime/cost/cost-events.jsonl`
- `runtime/evaluation/eval-audit.jsonl`
- `runtime/evaluation/verdicts.json`
- `runtime/normalization/asset.json`
- `runtime/retrieval/retrieval-traces.jsonl`

Inference: these paths match protected runtime/generated artifact categories from
repo policy. Preserve until explicitly reviewed.

### Duplicate Root AGENTS.md Injection

Observed in:

- `C:\dev\AJ-DIGITAL-OS-grafana-coverage-index-symmetry`
- `C:\dev\AJ-DIGITAL-OS-open-webui-workbench-layer`

Both worktrees add the same 88-line `# DOX framework` block at the top of root
`AGENTS.md`. The inserted block includes a broad requirement to install and verify
`graphifyy v0.8.36+` before working on any repo and a placeholder stating the
project is not indexed.

Inference: this is a policy-surface change that overlaps the existing AJ Digital OS
root `AGENTS.md` contract. It should be reviewed as a deliberate policy decision,
not auto-merged or deleted during branch hygiene.

## Clean Linked Worktrees

| Worktree | Branch | State | Recommended next action |
|---|---|---|---|
| `C:\dev\AJ-DIGITAL-OS\.claude\worktrees\charming-gauss-93e4fa` | `claude/charming-gauss-93e4fa` | Clean; ahead 2 of `origin/main`. | Review commits and decide whether to PR/merge, archive, or keep open. |
| `C:\dev\AJ-DIGITAL-OS\.claude\worktrees\jolly-hopper-8c04e8` | `claude/jolly-hopper-8c04e8` | Clean; ahead 3 of `origin/main`. | Review commits and decide whether to PR/merge, archive, or keep open. |
| `C:\dev\AJ-DIGITAL-OS-knowledge-substrate-phase1` | `codex/knowledge-substrate-phase1` | Clean; in sync with `origin/codex/knowledge-substrate-phase1`. | Confirm whether remote branch has an open PR or should be merged/archived. |

## Committed Branch Debt

These local branches are not merged into the local `origin/main` reference. This
does not mean they are good merge candidates; it means they still carry branch debt
relative to `origin/main` and need a decision.

| Branch | Upstream | Tracking state | Checked out | Head subject | Recommended action |
|---|---|---|---|---|---|
| `claude/charming-gauss-93e4fa` | `origin/main` | Ahead 2 | Yes | `docs: record operator decisions DEC-004/005 (all recommended) across proposals` | Review for docs merge or archive. |
| `claude/coverage-index-rebaseline` | `origin/claude/coverage-index-rebaseline` | In sync | Yes | `docs(coverage-index): correct stale "Missing" claims (governance + token-governance)` | Resolve untracked runtime files before branch closeout. |
| `claude/g2-cost-metering` | `origin/claude/g2-cost-metering` | In sync | No | `feat(cost): meter real model spend + per-run/per-tenant cost ceiling (G2)` | Review PR/merge status. |
| `claude/g3-memory-integrity` | `origin/claude/g3-memory-integrity` | In sync | No | `feat(memory): freshness/decay + conflict detection in retrieval (G3)` | Review PR/merge status. |
| `claude/g4-governance-wire` | `origin/claude/g4-governance-wire` | In sync | No | `feat(governance): wire claims/legal gate into the deliverable publish path (G4)` | Review PR/merge status. |
| `claude/g4-offer-approval` | `origin/claude/g4-offer-approval` | In sync | No | `feat(governance): route offer money-approval through the real approval gate (G4 4.3)` | Review PR/merge status. |
| `claude/jolly-hopper-8c04e8` | `origin/main` | Ahead 3 | Yes | `docs(sprint-1): reconcile review with vault context` | Review commits; includes prior hygiene commit. |
| `claude/modest-banach-1a7159` | `origin/claude/modest-banach-1a7159` | In sync | No | `feat(evaluation): add L15 run-verdict evaluation (G1)` | Review PR/merge status. |
| `codex/agent-role-matrix` | None | Local only | No | `docs: add AJ Digital OS policy validation foundation` | Compare with related policy branches; likely duplicate candidate. |
| `codex/build-status-report-2026-06-04` | `origin/codex/build-status-report-2026-06-04` | In sync | No | `docs: add AJ Digital OS build status report` | Review PR/merge status. |
| `codex/dashboard-remote-launch-trigger` | None | Local only | No | `docs: add AJ Digital OS policy validation foundation` | Compare with related policy branches; likely duplicate candidate. |
| `codex/docs-knowledge-layer-scaffold` | `origin/main` | Ahead 1 | Yes | `docs: add knowledge-layer scaffold` | Resolve dirty CRM work before branch closeout. |
| `codex/docs/dox-agent-context-pilot` | None | Local only | No | `docs: add founder intelligence product factory registers` | Compare with sibling DOX branches. |
| `codex/docs/graphify-context-layer` | None | Local only | No | `docs: add founder intelligence product factory registers` | Compare with sibling DOX branches. |
| `codex/docs/obsidian-mcp-dox-access-standard` | None | Local only | No | `docs: add founder intelligence product factory registers` | Compare with sibling DOX branches. |
| `codex/dox-agent-instruction-tree` | `origin/codex/dox-agent-instruction-tree` | In sync | No | `ci: use docs validation for policy-only changes` | Review PR/merge status. |
| `codex/dox-standard-clean` | `origin/codex/dox-standard-clean` | Gone upstream | No | `docs: add canonical DOX repo context standard` | Review before deleting local branch. |
| `codex/doxframework` | None | Local only | No | `Refine agentic context engine and workflow docs` | Needs manual diff review. |
| `codex/doxfulladoption` | `origin/codex/doxfulladoption` | In sync | No | `docs: add canonical DOX repo context standard` | Review PR/merge status. |
| `codex/knowledge-substrate-phase1` | `origin/codex/knowledge-substrate-phase1` | In sync | Yes | `docs: instantiate knowledge substrate phase 1` | Confirm PR/merge/archive state. |
| `codex/loop-adoption` | None | Local only | No | `docs: add knowledge-layer scaffold` | Compare with current branch and remote `origin/codex/loop-adoption`. |
| `codex/loop-adoption-580ef42-base` | None | Local only | No | `chore: remove stale Claude worktree gitlinks` | Preserve until linked task outcome is known. |
| `codex/nextjs-dashboard-app` | `origin/codex/nextjs-dashboard-app` | In sync | No | `chore: untrack third-party AI-tool config dirs (already gitignored)` | Review PR/merge status. |
| `codex/pr-stabilization-gates` | `origin/main` | Ahead 1, behind 20 | No | `test: backfill webhook coverage gates` | Diverged/stale. Manual reconciliation required. |
| `codex/readiness-docs-consolidation` | `origin/main` | Ahead 1, behind 39 | No | `docs: consolidate launch readiness into single source of truth` | Diverged/stale. Manual reconciliation required. |
| `codex/stabilization-phase-1` | None | Local only | No | `docs: add founder intelligence product factory registers` | Compare with sibling stabilization branches. |
| `codex/stabilization-phase-2-merge` | None | Local only | No | `merge(stabilization): reconcile origin/main (D2) qualification-engine` | Needs manual history review. |
| `docs/aj-digital-os-policy-validation-foundation` | None | Local only | No | `docs: add AJ Digital OS policy validation foundation` | Compare with related policy branches. |
| `docs/dox-agent-context-pilot` | None | Local only | No | `docs(ops): add Ollama container reachability follow-up` | Needs manual diff review. |
| `docs/grafana-coverage-index-symmetry` | None | Local only | Yes | `docs: link Grafana observability pointer from coverage index (Phase 0)` | Resolve dirty root `AGENTS.md` first. |
| `docs/graphify-context-layer` | `origin/docs/graphify-context-layer` | Gone upstream | No | `docs: add graphify discovery layer governance` | Review before deleting local branch. |
| `docs/open-webui-ai-workbench-layer` | None | Local only | Yes | `docs: register Open WebUI workbench layer in coverage index` | Resolve dirty root `AGENTS.md` first. |
| `docs/repo-os-standard` | None | Local only | No | `docs(ops): add Ollama container reachability follow-up` | Compare with `docs/dox-agent-context-pilot`. |
| `docs/routing-canonicalization` | `origin/docs/routing-canonicalization` | In sync | No | `docs(architecture): record approved routing canonicalization decisions` | Review PR/merge status. |
| `docs/worktree-doctrine` | `origin/docs/worktree-doctrine` | In sync | No | `docs: tighten worktree cleanup doctrine` | Review PR/merge status. |
| `preserve/local-main-before-sync-2026-05-24` | None | Local only | No | `fix: repair local runtime readiness defaults` | Preserve until confirmed no longer needed. |
| `test/coverage-webhook-runmanager` | `origin/test/coverage-webhook-runmanager` | Gone upstream | No | `test: cover webhook error paths and run-manager approval branches` | Review before deleting local branch. |

## Branches Merged Into origin/main

These branches are merged into the local `origin/main` reference. They may be cleanup
candidates after review, but this report does not authorize deletion.

| Branch | Upstream | Tracking state | Head subject | Recommended action |
|---|---|---|---|---|
| `chore/ci-audit-deadlock-fix` | `origin/chore/ci-audit-deadlock-fix` | Gone upstream | `chore(ci): break the Dependabot audit deadlock + fix axios + remove broken gitlinks` | Cleanup candidate after confirmation. |
| `chore/dashboard-postcss-bump` | `origin/chore/dashboard-postcss-bump` | Gone upstream | `chore(dashboard): bump postcss to ^8.5.10 (clears last Dependabot alert)` | Cleanup candidate after confirmation. |
| `chore/dashboard-postcss-override` | `origin/chore/dashboard-postcss-override` | Gone upstream | `chore(dashboard): override postcss to ^8.5.10 to patch Next-bundled copy` | Cleanup candidate after confirmation. |
| `claude/xenodochial-elion-07c3ac` | None | Local only | `feat: enforce mutation entrypoints across runtime` | Confirm already integrated before cleanup. |
| `codex/decisionmakingmatrix` | None | Local only | `docs: add Grafana observability layer pointer (Phase 0 doctrine) (#67)` | Likely duplicate of `main`; confirm before cleanup. |
| `codex/harden-webhook-security-implementation-local` | `origin/codex/harden-webhook-security-implementation` | Ahead 2 | `fix: clear replay store between webhook tests` | Despite merged status, local ahead commits require review before cleanup. |
| `codex/hookindex` | None | Local only | `docs: add Grafana observability layer pointer (Phase 0 doctrine) (#67)` | Likely duplicate of `main`; confirm before cleanup. |
| `docs/memory-agent-behavior-spec` | `origin/main` | Behind 20 | `Merge pull request #44 from AudioJones-Dev/chore/dashboard-postcss-override` | Stale branch; cleanup candidate after confirmation. |
| `fix/next15-dashboard-build` | `origin/fix/next15-dashboard-build` | Gone upstream | `fix(dashboard): repair corrupted api.ts + migrate to Next 15 async params` | Cleanup candidate after confirmation. |
| `main` | `origin/main` | In sync | `docs: add Grafana observability layer pointer (Phase 0 doctrine) (#67)` | Keep. |

## Recommended Triage Sequence

1. Preserve all dirty worktrees. Do not run `git clean`, `git reset --hard`, or
   delete worktree folders.
2. Decide the fate of the uncommitted CRM work on `codex/docs-knowledge-layer-scaffold`.
   It is the largest open source/test surface.
3. Review the duplicated root `AGENTS.md` DOX injection in the two standalone docs
   worktrees. Treat it as a policy decision, not a formatting cleanup.
4. Classify the untracked `runtime/` files in `claude/coverage-index-rebaseline`.
   They look generated/protected and should not be committed or deleted by default.
5. Review clean ahead branches that track `origin/main`: `claude/charming-gauss-93e4fa`
   and `claude/jolly-hopper-8c04e8`.
6. Review stale/diverged branches before any rebase or merge:
   `codex/pr-stabilization-gates` and `codex/readiness-docs-consolidation`.
7. Only after the above, review merged/gone-upstream branches as cleanup candidates.
   Cleanup still requires explicit human approval.

## Approval Gates

Require explicit operator approval before:

- Committing the dirty worktrees.
- Stashing dirty work.
- Deleting runtime/generated files.
- Deleting branches or worktrees.
- Merging, rebasing, pushing, opening/merging PRs, or deploying.
- Changing root `AGENTS.md` policy content.

Recommended approval word remains `proceed`, with the exact action named.
