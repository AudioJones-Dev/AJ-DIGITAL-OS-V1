# Phase 2 — D2 Divergence Reconciliation Plan

**AJ Digital OS — Sprint -1 Stabilization**
Author: Claude (Cowork), read-only analysis · 2026-06-06
Scope: reconcile local `main` (15 ahead) with `origin/main` (6 behind). **No fetch/merge/push performed — this is the approved-before-execution plan.**

## Finding: the divergence is clean and complementary

- **Merge-base:** `155fd2a` — *feat: command center dashboard v1 + stabilize persistence tests*.
- **Local since base (15 commits, 84 files):** governance, connectors, normalization, apps (offer/diagnostic/content engines), hermes, telegram, dashboard, lead-to-offer workflow.
- **Remote since base (6 commits, 17 files):** a self-contained **qualification engine** — `src/intelligence-layer/qualification-engine/{index,rules,scoring,tiering,disqualifiers}.ts`, `src/intelligence-layer/shared-types/index.ts`, `src/intelligence-layer/index.ts`, `tests/intelligence-layer/qualification-engine.test.ts` + fixtures, and 2 review docs.
- **True conflict set (changed on BOTH sides since base): `0` files.**

The two shared paths (`intelligence-layer/index.ts`, `shared-types/index.ts`) are unmodified locally since the base, so they merge fast-forward with no conflict.

## Charter correction (supersedes Sprint -1 C2)

> **C2 — `src/intelligence-layer`: was "Delete Candidate (0 importers)" → now "Experimental / Keep".**
> The remote qualification engine is real, tested feature work living in this module, and local `src/workflows/lead-to-offer.workflow.ts` already references the qualification concept. Do **not** delete `intelligence-layer`. After merge, wire the qualification engine into the lead-to-offer flow and confirm importers; then promote to Ready. (`intelligence` vs `intelligence-layer` duplicate question from C2 still stands — resolve which owns what *after* the merge, with the engine in view.)

## Recommended strategy: **merge** (not rebase, not cherry-pick)

- **Merge** — 0 conflicts expected; preserves both histories; brings all 6 remote commits including the qualification engine in one clean step.
- **Rebase** — rejected: would rewrite your 15 local commits for no benefit, and the remote history contains bot-fork merge commits that rebase handles poorly.
- **Cherry-pick** — rejected: unnecessary when the merge is conflict-free and you want the entire remote line.

## Preconditions (must hold before merging)

1. Phase 1b complete and **committed** on `codex/stabilization-phase-1` (clean working tree — merge refuses a dirty tree).
2. `npm run typecheck` green on host (D1 snapshot re-confirmed).
3. Fresh `git fetch` — our cached `origin/main` may be stale; re-verify the conflict set after fetch (commands below).

## Execution (host-side — PowerShell at C:\dev\AJ-DIGITAL-OS)

```powershell
# 0. Be on the stabilized branch with a CLEAN tree (Phase 1b committed)
git switch codex/stabilization-phase-1
git status   # must show "nothing to commit, working tree clean"

# 1. Refresh remote refs and RE-VERIFY the divergence is still clean
git fetch origin
$mb = git merge-base HEAD origin/main
"merge-base: $mb"
"remote deltas:";  git diff --name-only $mb origin/main
"LOCAL deltas:";   git diff --name-only $mb HEAD | Measure-Object | % Count
"CONFLICT set (expect empty):"
$r = git diff --name-only $mb origin/main
$l = git diff --name-only $mb HEAD
Compare-Object $r $l -ExcludeDifferent -IncludeEqual | % InputObject

# 2. Dry-run the merge (no commit, no ff) to SEE conflicts before they happen
git merge --no-commit --no-ff origin/main
#    -> if it reports conflicts, ABORT and reassess:  git merge --abort
#    -> if "Automatic merge went well", inspect, then continue

# 3. Validate BEFORE finalizing
npm run typecheck
npm run test          # qualification-engine.test.ts will now run

# 4. If green, finalize the merge commit; if not, abort
git commit --no-edit   # completes the merge
#    or:  git merge --abort   # to back out entirely

# 5. DO NOT push yet — hold for review of the merged tree
```

## Rollback

- Before commit: `git merge --abort` restores pre-merge state.
- After commit (still on safety branch, unpushed): `git reset --hard ORIG_HEAD`, or simply `git switch main; git branch -D codex/stabilization-phase-1`.
- Nothing is pushed in this plan, so `origin/main` is never at risk.

## After a clean merge

- Re-run the Sprint -1 exit gate: D1 ✅ (compiles), D2 ✅ (reconciled), D3/D4 ✅ (Phase 1b). Then `main` is safe to fast-forward to the stabilized branch and the feature sprints can start.
- Open the C2-revised follow-up: wire qualification-engine → lead-to-offer; resolve `intelligence` vs `intelligence-layer` ownership.
- Only after all gates pass and review: `git switch main; git merge --ff-only codex/stabilization-phase-1; git push origin main`.
