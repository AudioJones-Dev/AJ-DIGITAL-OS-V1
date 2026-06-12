# Sprint -1 Stabilization Inventory — AJ Digital OS

- **Owner:** Audio (Tyrone Alexander Nelms) / AJ Digital LLC
- **Date:** 2026-06-09
- **Scope:** Portfolio triage (DMAIC Stabilization / Sprint -1), improvement mode
- **Method:** Per-component DMAIC-lite (Define → Measure → Analyze → decision). Evidence gathered read-only via structural mapping, import-graph tracing, and doc review across `src/` (~50 modules) and root surfaces.
- **Status:** Diagnostic only. No code, git, or config was modified to produce this document.

---

## 0. Measure-gate limitation (read this first)

The stabilization **Measure** stage could only be *partially* satisfied in the current environment:

- **Runtime test signal is unavailable here.** `vitest` fails at startup with `Cannot find module @rollup/rollup-linux-x64-gnu`. The `node_modules` tree was installed on Windows and lacks the Linux-native rollup binary, so the sandbox cannot execute the suite. Fixing it requires `npm i` (or removing `node_modules` + `package-lock.json` and reinstalling), which mutates the lockfile/`node_modules` in the mounted folder — gated under `AGENTS.md`, so it was **not** run.
- **Consequence:** Every "Required tests" and "passing/failing" judgement below is derived from **structure, wiring, and `BUILD-PROGRESS.md` claims**, not from a live green/red run. Treat all test-state claims as *asserted by source*, not *verified by execution*, until the harness runs on Linux or on your Windows machine.

This is an honest gate report, per DMAIC: a measured signal that cannot be re-run is flagged, not faked.

---

## 1. Blockers (resolve before any feature sprint)

### BLOCKER-1 — Broken git HEAD (RESOLVED diagnosis, repair gated on approval)

**Symptom:** `git status`, `git log`, `git branch`, `git reflog` all fail with *"Failed to resolve HEAD as a valid ref / your current branch appears to be broken."* Entire tree shows staged-but-uncommitted.

**Root cause (confirmed):** `.git/HEAD` is **64 bytes**: the correct 36-byte payload `ref: refs/heads/codex/loop-adoption\n` followed by **28 trailing NUL (`0x00`) bytes**. Git reads the NUL padding and rejects HEAD as invalid. This is a partial-write / truncation artifact — typical of an interrupted write or a folder sync on Windows.

**What is NOT broken:** The branch ref `.git/refs/heads/codex/loop-adoption` is intact and points to `5a47fd401771884fd82ce6ecbb74abadffef56ca` (a valid commit). `git fsck` confirms **234 commits reachable**, `ORIG_HEAD` (`b8792a5`) valid, `refs/heads/main` (`c843eb9`) valid. No object loss. Dangling trees/blobs are normal orphaned work, not corruption.

**Repair plan (reversibility format) — requires `proceed`:**

| Field | Detail |
|---|---|
| **What will change** | Overwrite `.git/HEAD` with exactly `ref: refs/heads/codex/loop-adoption\n` (36 bytes). |
| **What could break** | Nothing structural — only the HEAD pointer file is rewritten to its correct value. |
| **Reversible** | Yes. Back up `.git/HEAD` → `.git/HEAD.bak` first; restore to revert. |
| **Not reversible** | N/A. |
| **Backup / rollback** | `cp .git/HEAD .git/HEAD.bak-2026-06-09` before edit; rollback = `mv` it back. |
| **Exact actions requested** | (1) `printf 'ref: refs/heads/codex/loop-adoption\n' > .git/HEAD` &nbsp; (2) `git fsck` to confirm HEAD now valid &nbsp; (3) `git status` to confirm the tree reads normally &nbsp; (4) if `.git/logs/HEAD` still reports "bad ref", truncate/repair the reflog (non-destructive to commits). |
| **Verification** | After step 1, `git rev-parse HEAD` should return `5a47fd40…`; `git log --oneline -1` should print the tip commit. |

> No git action will be taken without the operator approval word `proceed`.

### BLOCKER-2 — Test harness cannot run (Linux sandbox)

See §0. Not a code defect — an environment/native-binary mismatch. **Required action (operator or approved):** on the machine where tests will run, `npm ci` (clean install for that OS) and confirm `npm test` executes. Until then, "tests green" cannot be independently verified for any component.

---

## 2. Repo-wide structural findings (the sprawl, quantified)

Confirms the standing "architectural sprawl / abstraction bloat" pain point:

- `src/` ≈ **50 modules / ~60K LOC**. Heaviest: `commands` 10.5K, `services` 6.5K, `scripts` 5.7K, `hermes` 5.4K.
- **Zero unit-test coverage on most data/infra modules**; several critical paths (`prompt`, `conversation`, `memory`, `services`) have no dedicated tests. Validation today leans on standalone scripts, not the vitest suite.
- **Committed bloat:** root `ui/` carries ~3,223 vendored `node_modules` files + compiled `dist`; `dist/` build output is tracked; `runtime/` mixes live JSON state with governance policy.
- **Duplicate/overlap clusters** (resolved in §4): `routing`↔`model-routing`, `types`↔`schemas`, `connectors`↔`integrations`, `data`↔`db`↔`storage`, `missions`↔`workflows`, `secrets`↔`security`, root `ui/`↔`dashboard/`.

---

## 3. Status summary (every component carries one status + a decision)

Status taxonomy: **Canonical · Ready for Sprint · Experimental · Needs Refactor · Blocked · Deprecated · Delete Candidate.**

### Runtime spine
| Component | Status | Decision |
|---|---|---|
| `src/agents` | Canonical | proceed |
| `src/index.ts` (barrel) | Canonical | proceed |
| `src/cli.ts` | Ready for Sprint | proceed |
| `src/commands` | Ready for Sprint | proceed (add smoke tests) |
| `src/core` | Needs Refactor | refactor (dedupe state-machine) |
| `src/services` | Needs Refactor | refactor (zero tests) |
| `src/control-plane` | Needs Refactor | refactor (tighten integration) |
| `src/api` | Experimental | keep flagged |
| `src/server.ts` | Experimental | verify wiring, then proceed |
| `src/decision` | Needs Refactor | refactor (merge policy layers) |

### Memory / routing / intelligence
| Component | Status | Decision |
|---|---|---|
| `src/model-routing` | Canonical | proceed |
| `src/routing` | Delete Candidate | delete after migrating 5 importers |
| `src/memory-runtime` | Ready for Sprint | proceed |
| `src/retrieval` | Ready for Sprint | proceed |
| `src/memory` | Needs Refactor | refactor (add tests; clarify vs memory-runtime) |
| `src/intelligence` | Canonical | proceed |
| `src/intelligence-layer` | Experimental | keep flagged (no prod wiring) |
| `src/prompt` | Needs Refactor | refactor (add tests) |
| `src/conversation` | Needs Refactor | refactor (add tests) |
| `src/normalization` | Ready for Sprint | proceed |

### Agent frameworks / execution
| Component | Status | Decision |
|---|---|---|
| `src/hermes` | Canonical (protected) | proceed (migrate tests to vitest) |
| `src/bel` | Canonical (protected) | proceed |
| `src/agent-roles` | Canonical | proceed |
| `src/browser-agent` | Ready for Sprint | proceed |
| `src/local-agent` | Ready for Sprint | proceed |
| `src/tools` | Ready for Sprint | proceed |
| `src/mcp` | Ready for Sprint | proceed |
| `src/missions` | Needs Refactor | refactor (resolve vs workflows) |
| `src/workflows` | Needs Refactor | refactor (resolve vs missions) |

### Data / infra / support
| Component | Status | Decision |
|---|---|---|
| `src/security` | Canonical | proceed |
| `src/governance` | Needs Refactor | refactor (policy fragmentation) |
| `src/observability` | Ready for Sprint | proceed |
| `src/bootstrap` | Ready for Sprint | proceed |
| `src/ui` (terminal render) | Ready for Sprint | proceed |
| `src/attribution` | Ready for Sprint | proceed (add tests — business-critical) |
| `src/data` | Needs Refactor | refactor (data/db/storage boundary) |
| `src/storage` | Needs Refactor | refactor (data/db/storage boundary) |
| `src/db` | Blocked | pause (Phase D Postgres incomplete) |
| `src/cache` | Needs Refactor | refactor (file-cache race conditions) |
| `src/connectors` | Needs Refactor | refactor (merge boundary with integrations) |
| `src/integrations` | Needs Refactor | refactor (merge boundary with connectors) |
| `src/schemas` | Needs Refactor | refactor (overlap with types) |
| `src/types` | Needs Refactor | refactor (overlap with schemas) |
| `src/providers` | Needs Refactor | refactor (only Ollama live; cloud = dead) |
| `src/secrets` | Blocked (CRITICAL) | pause (unencrypted secrets on disk) |
| `src/telegram` | Experimental | keep flagged (optional surface) |
| `src/brands` | Experimental | verify usage, then proceed |
| `src/apps` | Experimental | verify usage, then proceed |
| `src/scripts` | Needs Refactor | refactor (5.7K LOC; audit/prune) |

### Root surfaces
| Component | Status | Decision |
|---|---|---|
| `dashboard/` (Next.js 14) | Canonical | proceed |
| `ui/` (root, legacy Vite) | Deprecated / Delete Candidate | delete (superseded; ~100MB vendored bloat) |
| `dist/` | Delete Candidate (from git) | gitignore + untrack build output |
| `runtime/` | Needs Refactor | split live state (gitignore) from policy (commit) |
| `sites/` | Delete Candidate | delete (empty placeholder) |
| `tests/` | Ready for Sprint | proceed (cannot execute here — see §0) |
| `sql/` + `supabase/` | Experimental | keep flagged (tied to blocked Phase D) |
| `n8n/`, `monitoring/`, `compose/`, `ops/`, `env/` | Ready for Sprint | proceed (config/infra) |

---

## 4. Duplicate-logic resolution (one Canonical owner per responsibility)

| Responsibility | Canonical owner | Subordinate(s) | Action |
|---|---|---|---|
| Model routing | `src/model-routing` (full impl: `routeModelTask`, providers, escalation) | `src/routing` (6-line dead wrapper; 5 importers) | Migrate the 5 importers to `model-routing`, then delete `src/routing`. Add a lint/CI guard against re-adding a second router. |
| Retrieval | **No collapse needed** — three *distinct* roles confirmed | `src/retrieval` (system-wide docs), `src/memory-runtime/retrieval.ts` (run memory assembly), `src/memory/memory-retriever.ts` (semantic summaries) | Keep all three; rename for clarity so the naming stops implying duplication. |
| Intelligence | `src/intelligence` (live opportunity scoring, 5 consumers, tested) | `src/intelligence-layer` (framework, zero prod wiring, test-only) | Keep `intelligence-layer` behind an Experimental flag; do not build on it until wired. |
| Orchestration | **Decision required** — two live paths | `src/missions` (Hermes-driven, scheduled) vs `src/workflows` (on-demand) | Pick one as canonical orchestration entry, or formally document the split so they stop drifting. Flagged for a component-scope charter. |
| Type contracts | TBD (`src/schemas` vs `src/types`) | overlapping definitions | Consolidate to one contracts home; refactor charter. |
| External I/O | TBD (`src/connectors` vs `src/integrations`) | overlapping boundary | Define one boundary; refactor charter. |
| Persistence | TBD (`src/data` vs `src/db` vs `src/storage`) | overlapping persistence concerns | Define one persistence layer; `db` blocked on Phase D. |
| Dashboard UI | `dashboard/` (Next.js 14) | root `ui/` (legacy Vite, vendored deps) | Delete root `ui/` after confirming no deploy references it. |
| Secret handling | `src/security` (canonical) | `src/secrets` (unencrypted on disk — CRITICAL) | Do not proceed; route through a vault/encrypted store before any secret-dependent work. |

---

## 5. Detailed per-component records (10-item, substantive modules)

> Format per `references/stabilize.md`: Current · Intended · Gap · Risk · Broken deps · Duplicate · Required tests · Stabilization actions · Decision. Records below cover the components with structural work; healthy/config surfaces are captured by the §3 table.

### src/agents — **Canonical**
- **Current:** Runtime agents (`approval`, `context-loader`, `execution`, `orchestrator`, `publisher`); first exports in `src/index.ts`; reached via CLI → commands.
- **Intended:** The "Agents" layer of the documented CLI→Agents→Services→Core spine.
- **Gap:** Minimal. Test depth lighter than its centrality warrants.
- **Risk:** Low.
- **Broken deps:** None observed.
- **Duplicate:** None — distinct from `agent-roles` (missions/pipelines).
- **Required tests:** Agent-level unit tests for each of the 5 agents in vitest.
- **Stabilization actions:** Add vitest coverage; otherwise leave as source of truth.
- **Decision:** proceed.

### src/core — **Needs Refactor**
- **Current:** `run-manager`, `run-store`, `state-machine`, `validator`, `config`, `deliverable-store`.
- **Intended:** Persistence, validation, transition rules, runtime primitives.
- **Gap:** Duplicate state-machine logic reported across core and another layer.
- **Risk:** Medium — state transitions are correctness-critical.
- **Broken deps:** None.
- **Duplicate:** State-machine logic appears in more than one place.
- **Required tests:** State-machine transition tests; run-store round-trip tests.
- **Stabilization actions:** Consolidate state-machine to a single module; add transition tests as the regression guard.
- **Decision:** refactor (component charter).

### src/services — **Needs Refactor**
- **Current:** `ExecutionCoordinator`, `ApprovalResolver`, dashboard/tracker/resumer services (6.5K LOC).
- **Intended:** Coordinate policy, recovery, routing, aggregation, observability.
- **Gap:** Zero test coverage on a high-LOC coordination layer.
- **Risk:** Medium-High — untested coordination of execution/approval.
- **Broken deps:** None observed.
- **Duplicate:** Policy logic overlaps `governance` and `decision` (see below).
- **Required tests:** Coordinator/resolver unit tests with fixture runs.
- **Stabilization actions:** Add tests before extending; clarify the services↔agents responsibility line.
- **Decision:** refactor.

### src/decision + src/governance — **Needs Refactor (joint)**
- **Current:** Policy evaluation is fragmented across `governance`, `decision`, and an `execution-policy` path with no single orchestrator.
- **Intended:** One coherent approval/policy gate (approval is a first-class gate per architecture doc).
- **Gap:** Three policy surfaces, no orchestration → ambiguous enforcement.
- **Risk:** High — approval gating is a core safety guarantee.
- **Broken deps:** None, but unclear precedence between layers.
- **Duplicate:** Policy responsibility split 3 ways.
- **Required tests:** End-to-end approval-gate tests proving execution is blocked without approval.
- **Stabilization actions:** Define one canonical policy orchestrator; subordinate the others; add gate tests.
- **Decision:** refactor (single charter spanning both).

### src/routing — **Delete Candidate**
- **Current:** `model-router.ts` (≈6-line wrapper) + `routing-policy.ts`; superseded by `src/model-routing`.
- **Intended:** (Legacy) model routing — now owned by `model-routing`.
- **Gap:** Dead/redundant; 5 files still import the legacy wrapper.
- **Risk:** Low to delete *after* migration; Medium if left (two routers drift).
- **Broken deps:** 5 importers point here instead of canonical.
- **Duplicate:** Yes — `src/model-routing` is canonical.
- **Required tests:** None new; reuse model-routing tests post-migration.
- **Stabilization actions:** Repoint 5 importers → `model-routing`; delete `src/routing`; add guard against a second router.
- **Decision:** delete (after migration).

### src/intelligence-layer — **Experimental**
- **Current:** `ais-core`, `archetype-library`, `prediction-error`, `token-governance`, `shared-types`; **no production wiring** (test-only references).
- **Intended:** Foundational diagnostic/intelligence framework.
- **Gap:** Built but unconnected to live flows.
- **Risk:** Medium if built upon while unwired (the "build forward on ungoverned component" trap).
- **Broken deps:** Not reached by runtime.
- **Duplicate:** Not a duplicate of `src/intelligence` (which is live).
- **Required tests:** Already test-only; needs an integration path before promotion.
- **Stabilization actions:** Keep behind a flag; do **not** build features on it until wired and charter-approved.
- **Decision:** pause / keep flagged.

### src/missions ↔ src/workflows — **Needs Refactor (joint)**
- **Current:** Two orchestration paths — `missions` (Hermes-driven, scheduled adapter into `agent-roles`) and `workflows` (lightweight on-demand).
- **Intended:** Job orchestration.
- **Gap:** Two entry points for "run work" with no documented canonical split → drift risk.
- **Risk:** Medium.
- **Broken deps:** None, but ownership ambiguous.
- **Duplicate:** Overlapping orchestration responsibility.
- **Required tests:** Path-level tests for whichever becomes canonical.
- **Stabilization actions:** Decide canonical orchestration entry or document the split explicitly; align tests.
- **Decision:** refactor (charter; needs an operator decision on direction).

### src/db — **Blocked**
- **Current:** Postgres/Supabase data layer, mid-integration ("responseos Phase D").
- **Intended:** Optional DB persistence atop the local-first file model.
- **Gap:** Incomplete; not safe to build on.
- **Risk:** Medium — partial integration.
- **Broken deps / blocker:** Phase D not finished; tied to `sql/` + `supabase/` migrations and (separately) to the secrets blocker for connection strings.
- **Duplicate:** Overlaps `data`/`storage` persistence concerns.
- **Required tests:** Migration + round-trip tests once unblocked.
- **Stabilization actions:** Keep paused; finish Phase D in its own charter under the no-secrets constraint.
- **Decision:** pause; **blocker owned by Audio** (Phase D scope).

### src/secrets — **Blocked (CRITICAL)**
- **Current:** Secret handling writes **unencrypted secrets to disk**; flagged not production-ready.
- **Intended:** Safe secret storage/retrieval with no hardcoded/plaintext secrets (standing constraint).
- **Gap:** Violates the "no hardcoded secrets / graceful missing-env" doctrine.
- **Risk:** **High / CRITICAL** — credential exposure.
- **Broken deps:** Any secret-dependent integration inherits this risk.
- **Duplicate:** Overlaps `src/security`.
- **Required tests:** Vault/encrypted-store tests; secret-scan in CI.
- **Stabilization actions:** Do not proceed with any secret-dependent integration; route through an encrypted store/vault; add a CI secret-scan guard.
- **Decision:** pause; **blocker owned by Audio** (security decision).

### Root `ui/` — **Deprecated / Delete Candidate**
- **Current:** Legacy Vite dashboard with ~3,223 committed `node_modules` files + compiled `dist`; not referenced anywhere in the codebase.
- **Intended:** (Former) dashboard — superseded by `dashboard/` (Next.js 14).
- **Gap:** Dead surface inflating the repo (~100MB) and every diff.
- **Risk:** Low to delete (confirm no deploy/CI reference first).
- **Broken deps:** None inbound.
- **Duplicate:** Yes — `dashboard/` is canonical.
- **Required tests:** N/A.
- **Stabilization actions:** Confirm no deploy references → delete `ui/`; ensure `dashboard/` is the only UI target.
- **Decision:** delete (after reference check). **Destructive — requires `proceed`.**

### runtime/ + dist/ — **Hygiene (Needs Refactor / Delete Candidate)**
- **Current:** `runtime/` mixes live JSON state (`control-runs.json`, `events/`, `idempotency/`, `dag/`) with committed governance policy; `dist/` (build output, 46 subdirs) is tracked in git.
- **Intended:** State should be gitignored & regenerated; policy committed; `dist/` rebuilt on demand.
- **Gap:** State and build artifacts pollute version control.
- **Risk:** Low-Medium (noisy diffs, accidental state commits).
- **Stabilization actions:** Gitignore + untrack `dist/` and `runtime/` live-state subdirs; keep `runtime/` policy files tracked.
- **Decision:** refactor `runtime/`; untrack `dist/`. **Touches `.gitignore`/tracking — requires `proceed`.**

---

## 6. Sprint -1 exit gate

- [x] Every in-flight component appears in the inventory with a status + decision (§3) and substantive ones have 10-item records (§5).
- [x] Every component carries exactly one status from the taxonomy.
- [~] **No component left `Blocked` without a named owner:** `src/db` (Phase D) and `src/secrets` (security) are Blocked, blockers named, **owner = Audio**. Confirm acceptance.
- [~] **Duplicate logic resolved to one Canonical owner:** resolved for routing, intelligence, dashboard (§4). **Open operator decisions:** missions↔workflows, schemas↔types, connectors↔integrations, data↔db↔storage boundaries.

**Gate verdict:** Cannot be declared fully PASSED until (a) BLOCKER-1 git repair is approved/applied, (b) the test harness runs at least once to convert asserted test-state into verified, and (c) the four open duplicate-boundary decisions are made. Until then, per the operating rule, **no feature sprint starts and nothing is built forward on a `Blocked` or `Delete Candidate` component.**

---

## 7. Recommended sequencing (proposed — not yet executed)

1. **Repair git** (BLOCKER-1) — one-line, reversible, unblocks all version control.
2. **Restore test harness** (BLOCKER-2) — clean install on the target OS; get one green/red baseline.
3. **Hygiene pass** — untrack `dist/` + `runtime/` state; delete `ui/` and `sites/` (each gated). Immediate repo-bloat reduction.
4. **Safety charters** — `decision`/`governance` policy consolidation + approval-gate tests; `secrets` → vault. These protect core guarantees.
5. **Dedupe charter** — migrate `routing` importers → `model-routing`, delete `routing`, add router guard.
6. **Boundary decisions** — missions↔workflows, schemas↔types, connectors↔integrations, persistence layer. Each becomes a component-scope DMAIC charter in improvement mode.
7. Only then: resume feature work on Canonical / Ready-for-Sprint components.

Each refactor item above should be opened as a single-component DMAIC charter and executed via the `/goal` protocol under the standing constraints (no secrets, no Firebase, Cloudflare storage, placeholder contracts, graceful missing-env).
