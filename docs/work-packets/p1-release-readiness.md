# Work Packet — P1 Release-Readiness Baseline

- **Packet ID:** P1-RELEASE-READINESS
- **Drafted by:** Claude (docs/control-room lane) — 2026-06-26
- **Implements:** Executor lane = Codex
- **Target branch:** `build/runtime-readiness-reconciliation` (off `main`, currently at `e252f8e`)
- **Lane rules:** no merge to `main`, no deploy, no secrets/credentials, no `npm publish`, no push race. Commit on the build branch; push only on operator approval. Surface prerequisites — do not improvise installs.
- **Source of truth:** `docs/build-state-prd-gap-review-2026-06-26.md` §12 (Priority 1), confirmed by a live gate run on 2026-06-26 (typecheck ✅, build ✅, test 504/505, pack ✅).

---

## Objective

Make the full `vitest run` suite **deterministically green (505/505)** and stand up a **release-readiness baseline** — a CI gate, core CLI smoke tests, and a package-payload check — so AJ Digital OS has a trustworthy build/test/package gate *before* the P2 Supabase CRM work begins.

---

## Context / why

A full gate run on 2026-06-26 produced:

- `npm run typecheck` → pass
- `npm run build` (tsc) → pass
- `npx vitest run` → **504 passed / 1 failed (505 total)**
- `npm pack --dry-run` → pass (454 KB, 550 files)

The single failure — `tests/db/neon-store.test.ts > neonSaveControlRun + neonGetControlRun (fallback mode) > round-trips a saved record` — is a **parallel-fork file race, not a product bug**. Proof: the file passes **10/10 in isolation, twice**. Root cause: the file-backed fallback stores do full-file read-modify-write against fixed shared paths under `runtime/` (e.g. `runtime/control-runs.json`); parallel vitest forks clobber each other's writes. Unique run/agent IDs prevent *logical* collision but not *file-level* overwrite (last writer wins, dropping another fork's just-created record).

Secondary finding observed during the run: executing the suite **mutates git-tracked `runtime/*` files** and creates untracked `runtime/normalization/`, `runtime/retrieval/` dirs. `runtime/` should not be tracked / should be gitignored (aligns with the repo runtime-separation standard). Include this in the packet (Task 5) but keep it low-risk.

---

## Tasks

### Task 1 — Eliminate the parallel-fork test race (priority)
Make the fallback file stores safe under parallel vitest forks. Choose the lowest-risk option that works:

- **Option A (preferred):** give the file-backed stores a configurable base dir (e.g. honor an `AJ_RUNTIME_DIR` / store-path env override) and point each db test fork at a unique temp dir in `beforeEach` (`tests/db/neon-store.test.ts` already imports `mkdtempSync`/`tmpdir`/`join` — wire them through). Apply to every store sharing `runtime/*`: run-control store, dag store, persistent approval store.
- **Option B (fallback):** constrain the affected tests to a single fork via vitest `poolOptions` / `fileParallelism: false` / `describe.sequential` for the `runtime/`-touching suites.

Prefer A — it fixes the real isolation gap and is the cleaner long-term answer. Fall back to B only if store paths are not cleanly injectable.

**Hard constraint:** do **not** change production store *behavior or semantics*. Fallback must remain file-backed and behavior-compatible; only the *path* becomes injectable.

### Task 2 — CI release-readiness workflow
Add `.github/workflows/release-readiness.yml`:
- Triggers: `push` / `pull_request` on `build/**` and `docs/**` (and `main` for status only). **No deploy, no publish, no secrets.**
- Steps: checkout → setup Node (match `engines`/local) → `npm ci` → `npm run typecheck` → `npm test` → `npm run build` → `npm pack --dry-run`.

### Task 3 — Core CLI smoke tests
Prove the highest-value CLI commands execute against built `dist/cli.js` without throwing, in **non-interactive / `--json` / help** mode only. Suggested coverage: `help`, `list-pending-approvals`, `list-approved-runs`, `run-summary`, `dashboard` (non-interactive). Put them in `tests/smoke/*.test.ts` or a `src/scripts/smoke-cli.ts` runner. Skip any command needing live credentials/interactive input.

### Task 4 — Release-readiness npm scripts
Add to `package.json`:
- `smoke` → runs the Task 3 smoke runner.
- `release:check` → chains `typecheck` + `test` + `build` + `pack --dry-run` (+ `smoke`), exit non-zero on any failure.

### Task 5 — Runtime hygiene (low-risk, include)
- Add `runtime/` (state files + generated subdirs) to `.gitignore` and stop tracking mutated state files, OR document why they are tracked. Goal: a clean `git status` after `npm test`.
- Keep this surgical; if untracking tracked files is contentious, surface as a finding and stop at `.gitignore` for newly generated paths.

---

## Files likely involved
- `src/control-plane/run-registry/run-control-store.ts` (+ sibling file stores: dag store, persistent approval store) — path injection.
- `tests/db/neon-store.test.ts` (+ any `control-plane*` tests sharing `runtime/*`) — per-fork temp dir.
- `vitest.config.ts` — only if Option B.
- `.github/workflows/release-readiness.yml` — new.
- `package.json` — new `smoke`, `release:check` scripts.
- `tests/smoke/*.test.ts` or `src/scripts/smoke-cli.ts` — new.
- `.gitignore` — runtime hygiene.

---

## Acceptance criteria
- `npx vitest run` passes **505/505** across **≥3 consecutive full runs** with **no flake**.
- `npm run typecheck`, `npm run build`, `npm pack --dry-run` all pass.
- `npm run release:check` runs the full gate and exits 0.
- `npm run smoke` exercises ≥4 core CLI commands against `dist/` and exits 0.
- `.github/workflows/release-readiness.yml` is valid YAML with **no deploy/publish/secret** steps.
- Production store semantics unchanged; fallback remains file-backed.
- `git status` is clean after `npm test` (Task 5), or the residual is documented.
- No CRM migration, deploy config, or secret work in this packet.

---

## Validation commands (Codex runs + reports output)
```bash
git status --short --branch
git diff --check
npm run typecheck
npx vitest run            # run 3x, paste pass/fail counts each
npm run build
npm pack --dry-run
npm run release:check
npm run smoke
```

---

## Risks
- **Store path refactor** touches shared code used widely → keep behavior identical; lean on existing tests as the guardrail.
- **Option B** (disable file parallelism) slightly slows the suite — acceptable.
- **CLI smoke** may hit commands needing interactive input or credentials → scope to non-interactive/JSON/help; skip credential-gated commands.
- **`npm ci` in CI** requires a committed lockfile — `package-lock.json` **is present** (verified 2026-06-26). If CI Node version differs from local, pin via `engines`/workflow `node-version`.
- **Task 5 untracking** tracked runtime files can surprise other tooling → prefer `.gitignore` + `git rm --cached` with a note; if risky, stop and surface.

---

## Out of scope (next packets)
- **P2 — Supabase CRM persistence + RLS** (DB target now decided = **Supabase Postgres**; Neon retained for run/DAG/log storage): executable migration from the RLS spec, ≥2-tenant isolation tests, DB-backed CRM store behind the `PersistentCrmStore` contract.
- **P3** deployment manifest + gate. **P4** interface consolidation. **P5** business-outcome layer.

---

## Governance
- Branch `build/runtime-readiness-reconciliation` only. No `main` merge, deploy, secrets, or `npm publish` without explicit operator approval.
- Coordinate so Claude is not editing this branch simultaneously (avoid push races).
- Treat any missing prerequisite as a finding to surface — do not improvise installs or credential setup.
