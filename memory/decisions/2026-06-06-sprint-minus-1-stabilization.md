# Decision: Sprint -1 Stabilization Triage Outcome

Date: 2026-06-06
Status: Accepted (execution pending on host)
System: AJ Digital OS
Layer: Repo / portfolio stabilization

## Decision

Before any feature sprint resumes, `main` must pass a Sprint -1 stabilization gate. A DMAIC portfolio triage inventoried every mid-build component and assigned each a status + decision. Two blockers must be cleared host-side first: a working-tree compile break (D1) and a 15-ahead/6-behind divergence from a parallel Codex fork (D2). Artifacts and runnable scripts live in `.codex/stabilization/`.

## What was found (evidence)

- **D1 — compile:** working tree initially failed `tsc` (interrupted edits in `memory-types.ts`, `server.ts`); those edits were completed mid-session and the tree now compiles clean (`tsc --noEmit` exit 0). Keep the work; do not revert.
- **D2 — divergence:** merge-base `155fd2a`. Remote's 6 commits add a self-contained **qualification engine** (17 files under `src/intelligence-layer/`). Local's 15 commits touch a disjoint 84 files (governance, connectors, normalization, apps, hermes, telegram, dashboard). **True conflict set = 0** → a plain `git merge origin/main` is clean. Strategy: **merge**, not rebase/cherry-pick.
- **D3 — corruption:** real defect is a corrupt `multi-pack-index` (not the legacy ref Codex removed). Codex's "fsck exit 0" was a false pass. Fix: delete MPI + repack.
- **D4 — hygiene:** ~1,326 tracked-but-ignored files (AI-tool dirs + runtime artifacts). Root cause: unanchored `.gitignore` rules `data/` and `skills/` matched `src/data/` and `src/skills/`. Scoped `git rm --cached` excludes real source (`src/skills/*.ts`), fixtures (`src/data/clients/_template/*`), `supabase/config.toml`, `memory/*`, and all `.gitkeep`.
- **H1:** HEAD was left wedged on an unborn `codex` branch by Codex Phase 1.

## Corrected prior decision

**`src/intelligence-layer` is KEPT, not deleted.** The initial triage (C2) tagged it Delete Candidate on 0 local importers. The remote qualification engine is real, tested work living there, and `src/workflows/lead-to-offer.workflow.ts` references the qualification concept. After merge, wire the engine into the lead-to-offer flow and resolve `intelligence` vs `intelligence-layer` ownership.

## Canonical owners (duplicate clusters)

`commands`, `connectors`, `model-routing`, `observability`, `schemas`, `telegram` are canonical. Delete candidates: `control-plane/telegram`, `core/commands`. Deprecate-and-migrate: `integrations` → `connectors`. Needs-refactor consolidations: memory/memory-runtime boundary (C1), agent model agents/agent-roles/hermes (C4, highest), core/schemas→schemas (C5), providers/model-routing (C7), observability triplicate (C8).

## Execution order (host-side; sandbox cannot mutate git)

1. `.codex/stabilization/phase-1b-cleanup.ps1` → re-`typecheck`+`test` → commit (no push).
2. `.codex/stabilization/phase-2-merge-plan.md` → fetch, verify 0 conflicts, dry-run merge, validate, commit (no push).
3. Re-run exit gate; if green, ff `main` and push.

## Process note

Codex's Phase 1 report was inaccurate on three points (false fsck pass, wedged HEAD, an unsafe blanket `rm --cached`). Each was caught by re-measuring rather than trusting the prior step. Carry that habit into host execution.

## Related

- Charter: `.codex/stabilization/sprint-minus-1-charter.md`
- [[2026-06-05-agent-os-memory-layer-architecture]] (memory-types.ts expansion that completed D1 belongs to this layer)
