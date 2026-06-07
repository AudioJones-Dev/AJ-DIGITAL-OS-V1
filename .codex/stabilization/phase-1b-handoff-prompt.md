# Phase 1b Handoff Prompt (corrected) — paste into a new Claude Code chat

> Corrections vs. the draft brief: (1) script lives in `.codex\stabilization\`, not repo root;
> (2) the script self-edits `.gitignore` (5 changes) in addition to the 1 memory-allowlist line you add — expect 6;
> (3) the 521 dirty `src/` files are handled as an explicit **Phase 1c** commit (they block the Phase 2 merge if left dirty);
> (4) PowerShell env-var syntax, not bash.

---

You are working inside the canonical repo:

    C:\dev\AJ-DIGITAL-OS

(NOT `C:\AJ-DIGITAL-OS` — verify with `git rev-parse --show-toplevel` before doing anything.)

## Task
Execute **Phase 1b** (scoped index cleanup + git-corruption fix + `.gitignore` anchoring) plus the Sprint -1 memory-allowlist fix, as a controlled host-side operation. Then, as **Phase 1c**, commit the already-compiling `src/` work so the tree is clean for a later Phase 2 merge. Do **not** run Phase 2.

## Artifacts (all under `.codex\stabilization\`)
- `phase-1b-cleanup.ps1` — the approved cleanup script (anchors `.gitignore`, scoped `git rm --cached`, fixes multi-pack-index).
- `rm-cached-scoped-2026-06-06.txt` — the reviewed 1,326-file removal list the script consumes.
- `sprint-minus-1-charter.md` — full context and decisions.
- `phase-2-merge-plan.md` — do NOT execute yet.

## Hard rules
1. Operate only in `C:\dev\AJ-DIGITAL-OS`. Never `C:\AJ-DIGITAL-OS`.
2. Do not push to `origin`. Do not deploy.
3. Do not delete, rename, or remove `src/intelligence-layer` (it holds the qualification engine).
4. Use only the scoped removals from `phase-1b-cleanup.ps1` / `rm-cached-scoped-2026-06-06.txt`. Never `git rm` or `git add` broadly.
5. Do not run Phase 2.
6. Do not install packages. Do not touch secrets, `.env`, credentials, DB configs, or production settings.
7. Do not change architecture doctrine.
8. Stage explicitly — never `git add .`.

## Preflight (show output for each)
```powershell
git rev-parse --show-toplevel          # must be C:\dev\AJ-DIGITAL-OS
git branch --show-current              # expect codex/stabilization-phase-1 (script will switch if not)
git status --short                     # snapshot the dirty tree (expect ~521 src/ + the ignored noise)
Test-Path .\.codex\stabilization\phase-1b-cleanup.ps1            # must be True
Test-Path .\.codex\stabilization\rm-cached-scoped-2026-06-06.txt # must be True
Get-Content .\.codex\stabilization\phase-1b-cleanup.ps1          # review before running
```
Confirm the script contains NO delete/rename of `intelligence-layer` (it doesn't — it only `git rm --cached`es the reviewed list and deletes `.git/objects/pack/multi-pack-index`).

## Phase 1b execution
1. Add the memory-allowlist line to `.gitignore`, near the other `!memory/...` entries:
   ```
   !memory/decisions/2026-06-06-sprint-minus-1-stabilization.md
   ```
2. Run the approved script (it will: clear the stale lock, switch to `codex/stabilization-phase-1`, anchor `/data/`+`/skills/`+`supabase/.temp/` and append `src/data/runs/`+`src/data/reports/runs/`, run the scoped `git rm --cached`, delete+rebuild the multi-pack-index, then print verification):
   ```powershell
   .\.codex\stabilization\phase-1b-cleanup.ps1
   ```
3. Do NOT run Phase 2.

## Validation (PowerShell syntax — note the `$env:` prefix, not bash)
```powershell
$env:NODE_DISABLE_COMPILE_CACHE = "1"; npm run typecheck
npm test                # package.json maps test -> vitest run
```

## Tracking verification
```powershell
git status --short
git diff -- .gitignore   # EXPECT 6 changes: data/->/data/, skills/->/skills/, supabase/->supabase/.temp/, +src/data/runs/, +src/data/reports/runs/, +!memory/decisions/2026-06-06-...
git status --short -- memory/decisions/2026-06-06-sprint-minus-1-stabilization.md   # must now be trackable (was ignored)
git status --short -- memory/working-context/working-context.md                     # already tracked
git ls-files src/intelligence-layer | Measure-Object | % Count                      # must be > 0 (preserved)
git ls-files src/skills | ? { $_ -match '\.ts$' }                                    # 4 files must remain tracked
```

## Review checklist
- New decision record no longer ignored; working-context still tracked.
- `.gitignore` shows the 6 expected changes and nothing else.
- `src/intelligence-layer` and `src/skills/*.ts` still tracked.
- Only Phase 1b items proposed for staging (gitignore + index `--cached` deletions + the 2 memory files).
- The ~521 `src/` files remain UNstaged at this point (they are Phase 1c, below).
- typecheck passed; tests passed.

## Commit — Phase 1b (scoped; do NOT use `git add .`)
```powershell
git add .gitignore `
        memory/working-context/working-context.md `
        memory/decisions/2026-06-06-sprint-minus-1-stabilization.md
# the git rm --cached deletions are already staged by the script
git commit -m "chore(stabilization): anchor .gitignore, untrack 1326 ignored files, fix multi-pack-index, track Sprint -1 closeout"
```
Do not commit until the operator approves after seeing the scoped diff and green validation.

## Phase 1c — commit the compiling src/ work (REQUIRED before Phase 2)
The ~521 `src/` changes are the completed, type-checking layer work (memory-layer types, server hardening, etc.). `git merge` in Phase 2 refuses a dirty tree, so these must be committed (or the operator explicitly chooses to stash). Recommended: review then commit as their own logical commit(s).
```powershell
git status --short src/        # review the set
npm run typecheck              # confirm still green
git add src/                   # scoped to src/ only — still NOT git add .
git commit -m "feat(layers): commit compiling memory-layer + server hardening + uncommitted layer work"
```
Stop after this. Do not run Phase 2.

## Return this report
```
# Phase 1b + 1c Cleanup Report
## 1. Repo / Branch        (root, branch)
## 2. Preflight Findings   (script exists+reviewed, intelligence-layer preservation confirmed)
## 3. Files Changed        (Phase 1b in-scope | memory closeout | Phase 1c src/ | anything excluded)
## 4. .gitignore Diff      (confirm the 6 changes incl. the exact allowlist line)
## 5. Validation Results   (typecheck, tests)
## 6. Safety Checks        (no push/deploy/installs/secrets/DB/prod; intelligence-layer preserved; Phase 2 not run)
## 7. Commit Readiness     (READY TO COMMIT | READY WITH MINOR FIX | NOT READY) — for both 1b and 1c
## 8. Exact Staging Commands  (scoped only — no `git add .`)
## 9. Exact Commit Commands   (proposed messages; commit only if instructed)
```

## After Phase 1b + 1c are committed locally (clean tree)
Then — and only then — move to a **review gate**, not an auto-merge:
```
Run Phase 2 merge plan review  (.codex/stabilization/phase-2-merge-plan.md)
```
Phase 2 stays a plan/dry-run gate first because the repo has known branch/path/canonical-source drift.
