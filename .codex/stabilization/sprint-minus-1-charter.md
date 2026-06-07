# Build Charter — Sprint -1 Stabilization Triage: AJ Digital OS

- **Scope:** Portfolio / Sprint -1 (stabilization triage) → now also driving execution
- **Repo:** `C:\dev\AJ-DIGITAL-OS` — safety branch `codex/stabilization-phase-1` (= `main` @ `c843eb9`)
- **Owner:** Audio (AJ Digital LLC)
- **Updated:** 2026-06-06 — supersedes the initial scratchpad draft. Single source of truth for Sprint -1.
- **Method:** DMAIC-lite per component; gates are hard (fail → stop & report).
- **Execution constraint:** the Cowork sandbox can read the repo but **cannot mutate git** (Windows mount blocks file deletes → git lock files fail). All mutating steps run **host-side** via the scripts referenced below.

---

## Status at a glance

| Gate | Item | Status | Run via |
|---|---|---|---|
| D1 | Working tree compiles | ✅ **RESOLVED** (re-measured `tsc --noEmit` exit 0) | re-confirm on host before commit |
| D3 | Git object corruption (corrupt multi-pack-index) | ⏳ ready | `phase-1b-cleanup.ps1` |
| D4 | 1,326 tracked-but-ignored files untracked | ⏳ ready | `phase-1b-cleanup.ps1` |
| D2 | Divergence 15-ahead / 6-behind | ✅ **analyzed: clean merge, 0 conflicts** | `phase-2-merge-plan.md` |
| C2 | `intelligence-layer` | 🔁 **corrected: KEEP** (was Delete) | post-merge wiring |
| — | Tests | ⚠️ **unverified in sandbox** (rollup native dep) | `npm run test` on host |
| HEAD | Wedged on unborn `codex` branch | ⏳ unwedged by `phase-1b-cleanup.ps1` step 1 | host |

**Gate verdict:** NOT yet clear to start feature sprints. Remaining executable work: run Phase 1b, commit, run Phase 2 merge. After both pass host-side validation, the gate clears.

---

## Measure — objective signals (evidence)

| Signal | Result |
|---|---|
| `tsc --noEmit` | ✅ exit 0, 0 errors (working tree, incl. 521 uncommitted `src/` changes). *Initial pass showed 2 syntax errors in `memory-types.ts`/`server.ts`; those edits were completed mid-session and now compile.* |
| `vitest run` | ⚠️ cannot run in sandbox — `Cannot find module @rollup/rollup-linux-x64-gnu` (node_modules installed on Windows; Linux native binary absent). **Not a repo defect.** Must run on host. |
| Divergence | 15 ahead / 6 behind `origin/main`; merge-base `155fd2a`. True conflict set = **0 files**. |
| Git integrity | `git fsck`: `improper chunk offset(s)` + `multi-pack-index file exists, but failed to parse`. Stale `legacy/HEAD` already removed by Codex Phase 1. Real defect = corrupt MPI (Phase 1b fixes). |
| Working-tree hygiene | 2,063 uncommitted non-`.adal` files; ~1,326 are tracked-but-ignored (AI-tool dirs + runtime artifacts). `.gitignore` rules `data/` and `skills/` are unanchored → also matched `src/data/`, `src/skills/`. |
| Canonical-owner import counts | memory 12 / memory-runtime 14 · intelligence 6 / intelligence-layer 0(local) · connectors 3 / integrations 6 · agents 22 / agent-roles 7 / hermes 11 · schemas 18 / core-schemas 2 · telegram 3 / control-plane-telegram 0 · providers 8 / model-routing 9 · observability 24 / services-observability 13 / core-observability 4 · commands barrel-wired / core-commands 0 |

---

## Analyze + Inventory — decisions

### Repo-level defects

| ID | Defect | Risk | Decision | Status |
|---|---|---|---|---|
| D1 | Working tree didn't compile (interrupted edits) — now complete | was HIGH | none — keep the now-compiling memory-layer + server hardening; commit it | ✅ Resolved |
| D2 | Diverged from parallel Codex fork (qualification engine) | was HIGH | **merge** `origin/main` (0 conflicts) after Phase 1b commit | ✅ Plan ready |
| D3 | Corrupt multi-pack-index | MEDIUM | delete MPI, repack, re-fsck | Needs Refactor → 1b |
| D4 | Tracked-but-ignored noise (1,326 files) | MEDIUM | anchor gitignore, scoped `git rm --cached` | Needs Refactor → 1b |
| D5 | Stale status docs (`BUILD-PROGRESS.md`, `STARTUP_PROTOCOL_STATUS.md`) | LOW | rewrite after code stabilizes | Deprecated (content) |
| H1 | HEAD wedged on unborn `codex` branch | MEDIUM | `git switch codex/stabilization-phase-1` | 1b step 1 |

### Duplicate-responsibility clusters → canonical owner

| # | Responsibility | Canonical | Others → decision | Status |
|---|---|---|---|---|
| C1 | Memory store/types vs runtime hooks | `memory` (types/store) | `memory-runtime` = hooks; document the boundary | Needs Refactor |
| **C2** | Intelligence | **TBD post-merge** | `intelligence-layer` **KEEP** — home of remote qualification engine + referenced by `lead-to-offer`. Resolve `intelligence` vs `intelligence-layer` ownership after merge. | 🔁 Corrected: Experimental/Keep |
| C3 | External connectors | `connectors` (driver layer) | `integrations` → Deprecated, migrate 6 importers then remove | Deprecated |
| C4 | Agent model | TBD (likely `hermes` runtime + `agents` impls + `agent-roles` pipeline) | define ONE canonical agent contract — own charter | Needs Refactor (HIGH) |
| C5 | Schemas | `schemas` (18 imports) | `core/schemas` (2) → fold in | Needs Refactor |
| C6 | Telegram | `telegram` | `control-plane/telegram` (0 refs) → Delete Candidate | Delete Candidate |
| C7 | Model/provider routing | `model-routing` | `providers` → clarify dep vs dead | Needs Refactor |
| C8 | Observability | `observability` (24) | `services/observability` (13) + `core/observability` (4) → merge | Needs Refactor |
| C9 | Commands | `commands` (barrel-wired) | `core/commands` (0 refs) → Delete Candidate | Delete Candidate |

---

## Execution sequence (host-side, in order)

1. **Phase 1b** — run `.codex/stabilization/phase-1b-cleanup.ps1`
   unwedge HEAD · anchor `.gitignore` (`/data/`, `/skills/`, `supabase/.temp/`, re-add `src/data/runs|reports/runs`) · scoped `git rm --cached` of the 1,326-file reviewed list (`rm-cached-scoped-2026-06-06.txt`) · delete corrupt MPI + repack · verify.
   Then re-run `npm run typecheck` (+ `npm run test`); if green, run the commit line the script prints (commits gitignore + index cleanup + the now-compiling `src/` work on the safety branch). **No push.**
2. **Phase 2** — follow `.codex/stabilization/phase-2-merge-plan.md`
   `git fetch` → re-verify conflict set = 0 → `git merge --no-commit --no-ff origin/main` (dry-run) → `npm run typecheck` + `npm run test` (qualification-engine tests now run) → `git commit --no-edit` or `git merge --abort`. **No push.**
3. **Re-run Sprint -1 exit gate** (below). If all ✅: `git switch main; git merge --ff-only codex/stabilization-phase-1; git push origin main`.

### Post-merge follow-ups (new component-scope charters, later sprints)
- **C2 wiring:** connect qualification-engine → `lead-to-offer.workflow.ts`; decide `intelligence` vs `intelligence-layer` ownership.
- **Cheap deletes:** confirm-no-dependents then remove `control-plane/telegram` (C6), `core/commands` (C9).
- **C3:** migrate `integrations` → `connectors`, remove legacy.
- **C8/C5/C7/C1:** consolidate observability, schemas, routing; document memory boundary.
- **C4:** the agent-model unification — largest; own DMAIC charter.
- **D5:** rewrite the stale status docs.

---

## Control — so it can't regress

- **CI gate:** `tsc --noEmit` + `vitest run` must pass on host before any merge to `main`.
- **Anti-reintroduction guard:** after C6/C9 deletes and C3 migration, a CI check that fails if the removed paths reappear (makes the standard's "no duplicate source-of-truth" rule executable).
- **Ignore hygiene:** pre-commit check that the AI-tool dirs stay untracked post-1b.
- **Ownership:** every component above carries exactly one status; no feature work on a `Needs Refactor` component until its charter clears.

---

## Sprint -1 exit gate (re-check after Phase 1b + Phase 2)

- [x] Every mid-build component inventoried with status + decision.
- [x] Duplicate responsibilities resolved to a single canonical owner (C1–C9; C2 corrected).
- [x] No `Blocked` item without named owner (D2 owned by Audio; now resolved-pending-execution).
- [ ] Working tree compiles **and tests pass on host** (D1 compiles; tests pending host run).
- [ ] Index cleanup + corruption fix committed (Phase 1b).
- [ ] Divergence merged (Phase 2).
- [ ] **Then:** clear to fast-forward `main` and start feature sprints.

> Artifacts: `phase-1b-cleanup.ps1`, `rm-cached-scoped-2026-06-06.txt`, `phase-2-merge-plan.md`, `tracked-ignored-manifest-2026-06-06.txt` — all in `.codex/stabilization/`.
