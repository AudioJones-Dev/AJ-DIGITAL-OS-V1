# AJ Digital OS Working Context

## Current Objective

Clear the Sprint -1 stabilization gate before resuming feature sprints. (Supersedes the prior memory-layer-foundation objective, which is built and now part of the uncommitted, compiling `src/` work — see [[2026-06-05-agent-os-memory-layer-architecture]].)

## Active Repo / Workspace

`C:\dev\AJ-DIGITAL-OS` — working on safety branch `codex/stabilization-phase-1` (= `main` @ `c843eb9`).

## Active Client / Tenant

AJ Digital LLC / Audio Jones internal system.

## Current Task

Execute the two host-side stabilization phases, in order:
1. `.codex/stabilization/phase-1b-cleanup.ps1` — unwedge HEAD, anchor `.gitignore`, scoped `git rm --cached` (1,326 files), fix corrupt multi-pack-index, then `typecheck` + `test` + commit.
2. `.codex/stabilization/phase-2-merge-plan.md` — fetch, verify 0 conflicts, dry-run `merge origin/main`, validate, commit.
Neither pushes to `origin`.

## Decisions Already Made

- Sprint -1 gate must pass before feature work resumes (see [[2026-06-06-sprint-minus-1-stabilization]]).
- D1 (compile) resolved; D2 (divergence) is a clean merge — strategy: merge, not rebase/cherry-pick.
- `intelligence-layer` is KEPT (home of remote qualification engine) — reverses the initial delete call.
- Canonical owners set for the 9 duplicate clusters; `control-plane/telegram` and `core/commands` are delete candidates; `integrations` deprecated in favor of `connectors`.
- Git mutations run host-side only (Cowork sandbox can read but cannot mutate `.git`).

## Constraints

- No push to `origin` until the full exit gate passes and the merged tree is reviewed.
- Keep work additive/reversible; everything stays on the safety branch.
- No hardcoded secrets; Firebase must not be reintroduced.
- Re-measure each step's result; do not trust a prior step's self-reported success.

## Open Questions

- Does a fresh `git fetch` reveal more than the 6 cached remote commits? (Re-verify the conflict set after fetch.)
- After merge: how does the qualification engine wire into `lead-to-offer.workflow.ts`, and which of `intelligence` vs `intelligence-layer` owns what?
- Do `npm run typecheck` + `npm run test` pass on the Windows host (tests were unverifiable in-sandbox)?

## Next Action

On the Windows host: run `phase-1b-cleanup.ps1`, re-run `npm run typecheck` + `npm run test`, then commit per the script's printed line.

## Do Not Do

- Do not push to `origin/main` or fast-forward `main` until all gates are green and reviewed.
- Do not delete `intelligence-layer`.
- Do not run a blanket `git rm --cached` — use the reviewed scoped list only.
- Do not rely on the stale `BUILD-PROGRESS.md` / `STARTUP_PROTOCOL_STATUS.md` for current state.
