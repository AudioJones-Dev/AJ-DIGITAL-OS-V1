# AJ Digital OS — Reliability Hardening: Re-Baseline Against the Live Repo (DRAFT)

**Status:** 📝 DRAFT — re-baseline of `AJ_DIGITAL_OS_RELIABILITY_HARDENING_SPEC.md` v0.1. No code changed. Draft text for operator review; reversible (delete to revert).
**Date:** June 13, 2026
**Owner:** AJ Digital LLC (Audio / Tyrone Alexander Nelms)
**Branch:** `claude/modest-banach-1a7159` (worktree)

> **What this is.** The original spec (v0.1) was grounded in the Layer Coverage Index, which has drifted from `main`. A review plus a 10-agent verification workflow (draft → adversarial re-read against the live source) re-baselined all four gaps against the actual code. **Two of the four gaps were premised on capabilities being missing that already exist in the repo.** This document corrects the scope of each gap, converts them to charter-grade text, and proposes (does not apply) a Coverage Index correction.

> **Provenance.** Each gap was deep-read by a drafting agent, then independently re-verified by a second agent instructed to refute. The verify pass overturned material claims in **4 of 5 drafts** (e.g., a false `cli.ts` dispatch claim in G1; the precise orphaned-caller chain in G2; the unreachable discount-approval path in G4). The text below is the post-verification version. Every code claim cites a file + exported symbol read from this worktree.

---

## Spec-location hygiene (action item)

`docs/architecture/AJ_DIGITAL_OS_RELIABILITY_HARDENING_SPEC.md` is **not committed to this branch** — it lives only in the main working tree. The verification agents (running in the worktree) therefore couldn't read its §3 and anchored acceptance to the Coverage Index instead. The acceptance criteria below have been reconciled by hand against the spec's actual §3 measures (verdict ≥95%, ≥20 golden cases/engine, 0 silent budget breaches, cost-per-run 100%, freshness present 100%, claims evaluated per deliverable, money/comms gated) — they align. **Recommendation:** commit the spec to the branch so charters can cite stable section numbers.

---

## Executive summary — premise vs. verified reality

| Gap | Spec v0.1 premise | Verified repo reality | Verdict | Re-scoped to |
|---|---|---|---|---|
| **G1 Evaluation** | No eval capability; build `src/evaluation/` | Confirmed absent. Run-completion (`dag-runtime.ts`) and MAP compliance (`map-validator.ts`) exist but are **not** outcome verdicts. | ✅ **Accurate — greenfield** | **Build.** Verdict emit as a sibling at the DAG terminal-status sites + golden set + `eval-run`/`eval-stats` CLI. |
| **G2 Cost ceiling** | "No per-run or per-tenant budget"; build capture + policy | A soft+hard budget enforcer (`enforceTokenBudgetPolicy`) **already exists** but is orphaned in `ais-core` (stabilization inventory: "no production wiring"). Live providers (`openai-provider.ts`, `perplexity-provider.ts`) **discard** their `usage` payloads. No per-run cost persistence. | ⚠️ **Partially false premise** | **Wire + extend.** Capture real provider `usage`, persist per-run, wire the existing enforcer at a run-cumulative gate, add per-tenant + tool/API spend. |
| **G3 Memory integrity** | No freshness/decay/conflict on recall | Confirmed. `scoreChunk()` is pure word-overlap; the `staleDocumentIds` contract exists but is hardcoded `[]`. | ✅ **Accurate** | **Wire + extend.** Fill the existing `staleDocumentIds`, add decay to `scoreChunk`, conflict detection, source-precedence in the stitcher. |
| **G4 Governance** | Claims/legal policy files **missing**; author `claims.policy.json` + `legal.policy.json` | `legal-constraints.policy.json` + `offer-governance.policy.json` **and** an evaluator (`evaluateLegalCompliance()` / `evaluateGovernance()`) already exist and run. They're just **not wired into the deliverable publish path**. | ❌ **False premise** | **Wire (don't author).** Call the existing evaluator at the lifecycle gate; route money/comms to `approval-service`; unify into the enforcement audit ledger. Authoring new policy files would collide with `legal-v1`. |
| **Coverage Index** | (the spec's cited source of truth) | **Stale.** Line 195 lists shipped policy files as "Missing"; unaware of `token-governance`. | 🔧 **Root cause** | Proposed diff (operator-action-only) + a Gate 0 "verify against the live repo" step. |

## The unifying architecture principle (resolves the spec's "wire into `executeWithEnforcement()`" hand-wave)

The spec repeatedly says "wire X into `executeWithEnforcement()`." That function is **action-classification-shaped and pre-execution** — it carries neither deliverable content nor run-cumulative cost. The three new checks attach at **three different points**, but all report into **one** audit ledger (`logs/security/agent-action-audit.jsonl` + `defaultAuditStore` via `logAgentActionAudit`):

- **G1 verdict** — a *post-hoc observation* of a finished run. Takes no action → does **not** gate; reports into the ledger.
- **G2 cost ceiling** — *run-cumulative*. Extends `ExecuteWithEnforcementContext` with an optional cost accumulator; a breach routes through the existing `block`/`require_approval` decision path.
- **G4 claims-check** — *post-generation content inspection*. A discrete pre-publish step at the deliverable lifecycle gate that blocks the transition and writes into the same ledger.

`executeWithEnforcement()` stays the single **action-level** authority; these checks extend governance into new evaluation points and converge on its audit trail — none bypass it.

## Recommended build order (revised by the re-baseline)

The re-scope changes the economics. **G4 collapsed from "author + wire" to "wire only"** — near-zero build cost, and it covers the vertical's highest risk (ADA-adjacent claims, money boundaries). **G2's real gap moved** from "build a budget engine" to "capture real spend at the provider boundary + persist" (the orphaned engine is reusable). Recommended sequence:

1. **P1 — G1 (build) + G4 (wire), in parallel.** G1 is the only true greenfield and unblocks L15/L16 ROI reporting; G4 is cheap and retires the most legal/financial risk. They touch disjoint modules.
2. **P1.5 — G2 (wire + extend).** Stops spend-bleed and closes the genuinely-uncaptured DN42 mode (external tool/API spend). Depends on threading `runId`/`tenantId` into the model router.
3. **P2 — G3 (wire + extend).** Self-contained; no cross-dependencies.

*Build-order and per-phase approval remain the operator's call (spec §11 "Decision needs operator"). The above is the recommended sequence with full reasoning; nothing is gated without sign-off.*

---

> The four gap charters below are drop-in replacement text for the spec's §8 phases. Each is WIRE + EXTEND unless marked greenfield. The Coverage Index section is a **proposed diff only** — the spec marks the index as operator-action-only; do not apply without sign-off.

---
## G1 — Evaluation discipline (L15 'Evaluate' step)

### Corrected current-reality note

`src/evaluation/` does not exist (verified: Glob `src/evaluation/**` returns no files; no exported symbol named verdict/golden/eval-run/eval-stats anywhere in `src/`). No source file defines a per-run verdict, a golden set, or a CI-scored eval loop. **G1 is greenfield.**

What the repo has today, and why none of it is the Evaluate step:

- **Run completion != verdict.** `src/bel/dag/dag-runtime.ts` derives terminal status via `deriveRunStatusFromNodes()` (line 145) and fires `emitDagRunCompleted(state)` / `emitDagRunFailed(state)` (defined in `src/bel/dag/dag-attribution.ts`, lines 95-115). These run-level emitters fire from exactly three sites: `completeNode()` (lines 275-276), `executeReadyNodes()` (lines 514-515), and `failNode()` (line 291). They record *that* a run finished and with what status — never whether the output was *correct*. (Note: `runDagToCompletion()` itself does NOT emit a run-level event; it only re-derives status and persists at lines 553-560.)
- **MAP compliance != verdict.** `src/attribution/map-validator.ts` `evaluateMAP(event)` returns a `MAPScore` object `{ meaningful, actionable, profitable, mapCompliant }` (boolean fields) for an attribution *event*, keyed off event-type/channel membership sets; `getMAPStats(events)` returns a `complianceRate`. That is event-shape hygiene, not run-outcome correctness.
- **MAP/CERA decision scoring != verdict.** `src/decision/decision-engine.ts` (`evaluateMap`, `createCeraCycle`, `getCompoundScore`) scores a *candidate idea* (`DecisionInput` in `src/decision/decision-types.ts`: title/description/category + M/A/P scores) *before* execution to route execute/improve/reconsider and scale/pivot/kill. CERA is the pre-flight scorer / OPTIMIZE seed — the conceptual home of the surrounding L15 loop — but it does not judge a finished run.

The previously-stated Coverage Index framing (`docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`, Layer 15 row, lines 280-288; Notes/Gaps line 288: "CERA ... is the conceptual foundation for this layer. Full optimization pipeline ... is unbuilt") is correct for L15 broadly but **must not** be read as partial coverage of G1. The narrower G1 Evaluate step is greenfield, not "partially covered by CERA."

### Genuine remaining gap (G1 only)

Runs are judged "done" by terminal status, never by *outcome correctness against an expectation*. There is no golden set, no verdict store, no `eval-run`/`eval-stats` CLI, and no CI gate scoring engines against known cases.

---

### Phased charter

#### Phase 1 — Run-verdict emission + golden-set scoring (greenfield)

**New module:** `src/evaluation/` (mirrors the shipped `src/decision/` module shape — file-backed local-first, no cloud store).

**Changed / new files**
- NEW `src/evaluation/eval-types.ts` — `EvalVerdict`, `GoldenCase`, `EvalStats` (+ Zod schema `EvalVerdictSchema`), `EVAL_POLICY_VERSION`.
- NEW `src/evaluation/eval-engine.ts` — `scoreRun(runState, goldenCase?) -> EvalVerdict` (pure, no I/O).
- NEW `src/evaluation/eval-store.ts` — file-backed persistence mirroring `src/decision/decision-store.ts`: `saveVerdict`, `getVerdict`, `listVerdicts`, `appendEvalAuditEvent`, and an `EVAL_PATHS` const (mirror of `DECISION_PATHS`) writing under `runtime/evaluation/`.
- NEW `src/evaluation/eval-emit.ts` — `emitRunVerdict(state)`: fire-and-forget, never-throws (copy the `safeEmit` contract from `src/bel/dag/dag-attribution.ts`, lines 13-30); writes the verdict via `eval-store` and reports a ledger entry via `appendSystemEvent()` (`src/core/events/event-ledger.ts`).
- NEW `src/evaluation/golden-loader.ts` — loads `runtime/evaluation/golden/<engine>.json`, indexed by engine + caseId.
- NEW `src/commands/eval-run.command.ts` — class `EvalRunCommand` (mirrors `CeraCycleCommand` *class shape*: input -> store + emit + audit, `--json` branch): scores one run or replays an engine's golden set.
- NEW `src/commands/eval-stats.command.ts` — class `EvalStatsCommand` (mirrors `CeraListCommand` *class shape*: filtered list + `--json`): coverage + score rollups.
- EDIT `src/bel/dag/dag-runtime.ts` — add `void emitRunVerdict(state)` as a **sibling** immediately after each existing run-level terminal emit, in all three sites: `completeNode()` (after lines 275-276), `executeReadyNodes()` (after lines 514-515), and `failNode()` (after line 291). Never replace the existing emits. (Do NOT add an emit in `runDagToCompletion()`'s tail — no sibling emit exists there.)
- EDIT `src/commands/dag-execute.command.ts` — after `const next = await runDagToCompletion(...)` (line 35), when `next.status` is terminal (`completed` | `failed` | `cancelled`), call `void emitRunVerdict(next)` (CLI-side belt-and-suspenders for the explicit-driver path, since this runs in a fresh process).
- EDIT `src/commands/index.ts` — export `EvalRunCommand` and `EvalStatsCommand` (currently the `cera-*` command classes are NOT exported here; the new ones must be, or cli.ts cannot import them).
- EDIT `src/cli.ts` — add `eval-run` and `eval-stats` cases to the `switch` (lines 233-1246), modeled on the **dispatched** precedents `governance-evaluate` (line 827) and `dag-execute` (line 1103), using the existing `getStringFlag`/`hasFlag`/`--json` conventions. (NOTE: there is no `cera-*` dispatch in cli.ts to sit next to — `cera-cycle`/`cera-list` classes exist but are unwired.) Add the new command classes to the `./commands/index.js` import block (lines 5-99). Flags: `--runId`, `--engine`, `--golden`, `--tenantId`, `--json`, `--limit`.
- NEW `runtime/evaluation/golden/<engine>.json` — golden cases (>=20 per active engine).
- NEW tests under `tests/evaluation/` (engine scoring + golden loader count) + a CI step asserting the golden gate.

**Precise wiring point**
- Emission (runtime path): `src/bel/dag/dag-runtime.ts`, inside `completeNode()` (lines 275-276), `executeReadyNodes()` (lines 514-515), and `failNode()` (line 291) — the exact lines that today call `emitDagRunCompleted(state)` / `emitDagRunFailed(state)`. Add `void emitRunVerdict(state)` as a sibling. The DAG terminal-status transition IS the run-completion event.
- Emission (CLI path): `DagExecuteCommand.run()` in `src/commands/dag-execute.command.ts`, after `const next = await runDagToCompletion(...)` (line 35), gated on terminal `next.status`.
- Linkage to MAP (best-effort): the verdict carries `runId`; verdict-time enrichment MAY read the run's attribution events via `getEventsByRun(runId)` (`src/attribution/attribution-tracker.ts`) and `getMAPStats(events)` (`src/attribution/map-validator.ts`) to attach the run's MAP-compliance rate (reference, not re-derive). CAVEAT: `getEventsByRun` filters an in-memory `buffer` (attribution-tracker.ts lines 12, 49-51) that is empty in a fresh CLI process and capped at 1000 entries; therefore `mapComplianceRate` is OPTIONAL and best-effort — never gate the verdict on it.
- Ledger: `appendSystemEvent({ category: "decision", eventType: "run_verdict_emitted", runId, environment, payload })` (`src/core/events/event-ledger.ts`). Reuse the existing `decision` category — `SystemEventCategory` (`src/core/events/event-types.ts`, lines 5-17) has no `evaluation` member. Adding an `evaluation` category is a deliberate, reviewed one-line union extension; call it out separately rather than silently widening the union.

**Enforcement boundary:** `emitRunVerdict` does NOT call `executeWithEnforcement()`. That function (`src/security/permissions/enforced-execution.ts`, line 48) gates an ACTION before it runs (allow/require_approval/block); `src/core/run-store.ts` (lines 29-44) shows its correct use guarding a `write_file` action. A verdict is a read-only observation of an already-completed run that takes no action; it REPORTS into the same audit ledger via `appendSystemEvent`, never gating. Routing it through enforcement would invert the control model and risk a verdict 'requiring approval'.

**Data shapes (Zod-style)**
```ts
// src/evaluation/eval-types.ts
const EvalVerdictSchema = z.object({
  verdictId: z.string().uuid(),
  runId: z.string(),
  dagId: z.string().optional(),
  tenantId: z.string().optional(),
  engine: z.string(),                 // e.g. "bel-dag-runtime", "content-engine"
  outcome: z.enum(["pass", "partial", "fail"]),
  score: z.number().min(0).max(1),    // normalized correctness vs. expectation
  basis: z.enum(["golden_case", "heuristic", "run_only"]),
  goldenCaseId: z.string().optional(),
  runStatus: z.enum(["completed","failed","cancelled"]), // BelDagRunStatus terminal subset (dag-types.ts L31-37)
  mapComplianceRate: z.number().min(0).max(100).optional(), // best-effort from getMAPStats; may be absent in CLI runs
  reasons: z.array(z.string()),
  policyVersion: z.string(),          // EVAL_POLICY_VERSION
  environment: z.enum(["local","dev","staging","production"]),
  createdAt: z.string(),              // ISO
});

const GoldenCaseSchema = z.object({
  caseId: z.string(),
  engine: z.string(),
  description: z.string(),
  input: z.record(z.unknown()),       // run/DAG plan inputs
  expected: z.object({
    runStatus: z.enum(["completed","failed","cancelled"]).optional(),
    requiredNodes: z.array(z.string()).optional(),
    assertions: z.array(z.string()).optional(),  // declarative checks
  }),
  tenantId: z.string().optional(),
});

interface EvalStats {       // eval-stats output
  engine: string;
  totalRuns: number;        // runs observed in window
  verdictedRuns: number;    // runs with a verdict
  verdictCoverageRate: number;  // verdictedRuns / totalRuns
  goldenCaseCount: number;
  goldenPassRate: number;
  byOutcome: { pass: number; partial: number; fail: number };
}
```

**Golden-set location:** `runtime/evaluation/golden/<engine>.json` (one file per engine; loaded by `golden-loader.ts`). Local-first, file-backed — no cloud store, no Firebase, no vector DB.

**CLI (modeled on dispatched `governance-evaluate` / `dag-execute`)**
- `eval-run --runId <id> [--engine <e>] [--tenantId <id>] [--json]` — score one completed run, emit + persist a verdict.
- `eval-run --golden --engine <e> [--json]` — replay the engine's golden set, emit a verdict per case.
- `eval-stats [--engine <e>] [--tenantId <id>] [--limit <n>] [--json]` — coverage + golden pass-rate rollup.

**Acceptance criteria (mapped to spec Section 3 measures)**
- *Verdict on >=95% of runs.* In CI and locally, after a DAG reaches a terminal status (via the runtime or `dag-execute` path), a corresponding `EvalVerdict` is persisted and a `run_verdict_emitted` ledger entry exists; `eval-stats --json` reports `verdictCoverageRate >= 0.95` across the observed run window. Test: drive N DAGs to completion, assert verdict count >= 0.95*N and each verdict's `runId` resolves to a real run via `getEventsByRunId` (`src/core/events/event-ledger.ts`).
- *>=20 golden cases per active engine, scored in CI.* Each active engine has a `runtime/evaluation/golden/<engine>.json` with `goldenCaseCount >= 20`; a CI step runs `eval-run --golden --engine <e>` for every active engine and fails the build if any engine has <20 cases or if `goldenPassRate` drops below the engine's configured floor. Test under `tests/evaluation/` asserts the loader count and the CI gate's failure behavior.

#### Phase 2 (deferred, out of scope for this charter)
OPTIMIZE step: feed accumulated verdicts back into workflow/agent tuning (the rest of the L15 loop). Charter separately once Phase 1 verdicts are flowing.

---

### Rebuild-risk guardrails (unchanged; all verified clean)
- Do NOT add a new top-level evaluation LAYER — L15 already exists (`AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md` line 783; loop `Execute -> Observe -> Attribute -> Evaluate -> Optimize -> Redeploy` at line 815). G1 is the 'Evaluate' step INSIDE L15.
- Do NOT rebuild MAP/CERA — `src/decision/decision-engine.ts` already implements MAP scoring and CERA cycles for decision-time scoring; the verdict module REFERENCES MAP (via getMAPStats), it does not re-derive it.
- Do NOT replace or fork the DAG completion path — wire the verdict as a sibling emit alongside the existing run-level emits in `completeNode`/`executeReadyNodes`/`failNode`, same never-throws contract as `safeEmit`.
- Do NOT route the verdict through `executeWithEnforcement()` — it is a read-only post-hoc observation; it reports into the audit ledger, it does not gate.
- Do NOT introduce Firebase / cloud vector DB / new secret-backed integrations — golden set and verdict store are local-first JSON under `runtime/` (mirror `DECISION_PATHS`).
- Reuse `SystemEventCategory` `decision` for verdict ledger entries to avoid widening the union; treat adding an `evaluation` category as a deliberate, reviewed one-line change.


---

## G2 — Cost Metering + Ceiling (L13 Observability + L2 Control Plane) — REVISED CHARTER

> **Provenance caveat (read first):** The reliability-hardening spec this charter is meant to re-baseline — `docs/architecture/AJ_DIGITAL_OS_RELIABILITY_HARDENING_SPEC.md` — is **not present in the repository** (confirmed by Glob over `docs/architecture/` and repo-wide, and by Grep for "Reliability Hardening" / "cost-ceiling" / "Open-Question" / "Section 3", all zero hits). Consequently, references below to "Section 3 measures", "Section 7 (do NOT rebuild)", and "Open-Question-2" are reproduced from the drafting brief and **must be reconciled against the spec once it is committed**. Every CODE claim below, however, was independently re-read against the live source and is accurate. Acceptance items are written so they are testable from the code regardless of section numbering.

### Corrected Current-Reality Note (supersedes the stale Coverage-Index premise)

The original G2 inherited a stale claim from `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` (Layer 13 note, line 249: *"Missing: cost tracking per run, tool/API spend …"*) and treated cost metering + ceiling as unbuilt. **This is inaccurate.** A complete, tested budget enforcer already exists in `src/intelligence-layer/token-governance/index.ts`:

- `recordTokenUsage()` (lines 5-16) — derives `total_tokens` and `cost_estimate` (default cost-per-1k = `0.01`, `DEFAULT_COST_PER_1K`).
- `summarizeTokenUsageByCase()` (lines 18-39) — rolls usage up `by_stage` and `by_agent` and returns `total_tokens` + `total_cost_estimate`.
- `enforceTokenBudgetPolicy()` (lines 55-82) — **hard-stops** on `total > max_tokens_per_case` and on any stage `> max_tokens_per_stage`, and **soft-warns** at `total > max_tokens_per_case * soft_limit_ratio`. This already implements a soft-warn-then-hard-stop band. **Do not rebuild it.**
- Shapes `TokenBudgetPolicy { max_tokens_per_case, max_tokens_per_stage, soft_limit_ratio }` and `TokenTelemetry { case_id, stage, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_estimate }` are in `src/intelligence-layer/shared-types/index.ts` (lines 100-115).

G2 is therefore re-scoped from **BUILD** to **WIRE + EXTEND**.

### Genuine Remaining Gaps (only these)

1. **Not wired to any production gate.** `enforceTokenBudgetPolicy` is a hard-stop nobody calls in a live flow. Its only callers are `src/intelligence-layer/ais-core/index.ts` **`diagnoseSystem` (line 116 only)** and `tests/intelligence-layer/ais-foundation.test.ts`. *(Correction vs. prior draft: `updateOutcome` calls `recordTokenUsage` (L158) and `summarizeTokenUsageByCase` (L174) but does **not** call `enforceTokenBudgetPolicy`.)* `docs/SPRINT-MINUS-1-STABILIZATION-INVENTORY.md` (line 222, decision line 230) flags all of `src/intelligence-layer` as *"no production wiring (test-only references) … pause / keep flagged."* The enforcer is unreachable from `executeWithEnforcement` or any run loop.
2. **No per-tenant aggregation.** `summarizeTokenUsageByCase` keys cost `by_stage`/`by_agent` only (index.ts:28-29) — no `by_tenant` rollup. `evaluateTenantPolicy` (`src/security/tenancy/tenant-policy.ts`) and `TenantContext` (`tenant-types.ts:5-15`) carry no cost/budget field.
3. **Live spend unmetered.** `src/model-routing` captures zero usage. `openai-provider.ts:67-69` and `perplexity-provider.ts:93-96` type the response as `{ choices… }` and **discard the providers' `usage` block**; `ModelRoutingResult` (`result-shape.ts:5-15`) has no `usage`/`cost` field. `RoutingConstraints.maxCostTier` (result-shape.ts:33, consumed in `route-policy.ts:71-80`) is **advisory provider-downgrade routing, not spend metering**. The only code emitting `TokenTelemetry` is `ais-core` with **hardcoded** token counts on a `"deterministic-v1"` model (index.ts:107-110, 158). So real cloud spend and non-LLM tool/API spend are never captured.
4. **No per-run cost persistence.** `KNOWN_METRICS` (`metrics-store.ts:18-31`) has no cost metric; `event-ledger` emits no cost event; no `cost-ceiling.policy.json` exists (Grep of `runtime/policies/` for cost|budget|ceiling|spend → none; 11 policy files, none cost-related). Per-run cost coverage is effectively 0%.

### Corrected Asset Rows (EXISTING — reuse, do NOT rebuild)

| Asset | File + Symbol | Status | Action |
|---|---|---|---|
| Cost capture | `src/intelligence-layer/token-governance/index.ts` → `recordTokenUsage` | EXISTING | Call from the model-routing boundary with the real provider `usage` |
| Budget enforcer (soft+hard) | `…/token-governance/index.ts` → `enforceTokenBudgetPolicy` | EXISTING | Reuse verbatim; feed real telemetry; route breach into the gate |
| Cost rollups | `…/token-governance/index.ts` → `summarizeTokenUsageByCase` | EXISTING | Add a **separate, non-breaking** `summarizeTokenUsageByTenant` wrapper; do not change the existing signature |
| Cost/budget shapes | `src/intelligence-layer/shared-types/index.ts` → `TokenBudgetPolicy`, `TokenTelemetry` | EXISTING | Reuse; add per-tenant/tool-spend shape only for what is genuinely missing |
| Control authority | `src/security/permissions/enforced-execution.ts` → `executeWithEnforcement` (L48), `ExecuteWithEnforcementContext` (L5-10) | EXISTING | Extend context with an optional run cost accumulator; add cost-gate |
| Per-run persistence | `src/core/observability/metrics-store.ts` → `incrementMetric`/`recordMetric`; `src/core/events/event-ledger.ts` → `appendSystemEvent` | EXISTING | Add cost metric + `category:"tool"` cost/breach event |
| Audit-routing pattern to copy | `src/control-plane/run-registry/control-actions.ts` → `executeControlAction` (L178) + `recordControlDecision` (L316-357) | EXISTING | Reuse exact pattern: `EnforcementBlockedError` → `logAuditEvent` + `recordControlDecision` (event-ledger + metrics) |

### Architectural Reality + Wiring Decision

A cost ceiling is **run-cumulative**, but `executeWithEnforcement(request, context, executor)` is **pre-action and per-action** — `AgentActionRequest` (`permission-levels.ts:28-36`) and `ExecuteWithEnforcementContext` (`enforced-execution.ts:5-10`) carry no cost/token field. Resolve by **extending the enforcement context with a run cost accumulator** and **attaching a cost-gate at the model-call/run-tick**:

1. Extend `ExecuteWithEnforcementContext` (enforced-execution.ts:5) with optional `runCost?: { runId: string; tenantId?: string; accumulatedCostUsd: number; tokenEvents: TokenTelemetry[] }`. Keep it optional so every existing caller (e.g. `control-actions.ts:170-173`, which passes only `{ permissionLevel, environment }`) compiles unchanged.
2. At the model-call boundary (`routeModelTask`, model-router.ts:71) **first thread `runId`/`tenantId` into the router** (they do not exist on `ModelTaskRequest` today — grep of `src/model-routing` for `runId|tenantId` returns none), then after each provider call convert real `usage` → `recordTokenUsage()` and append to the run accumulator.
3. Before/around the executor, call `enforceTokenBudgetPolicy(accumulator.tokenEvents, policy)`. On `allowed:false`, the cost-gate returns a `block` (or `require_approval`) **through the existing enforcement decision path** — never a side channel — and writes a `category:"tool"` cost-breach event to `event-ledger` plus a cost metric to `metrics-store`, mirroring `recordControlDecision`. Soft warnings annotate the audit record without blocking.

### Phased Plan

**Phase 2a — Meter the live boundary (L13).**
- Add `usage?: { prompt_tokens: number; completion_tokens: number }` to `ModelRoutingResult` (`result-shape.ts:5-15`) and surface it in `createResult` (result-shape.ts:47-61).
- In `openai-provider.ts` widen the response type at L67-69 to read `usage` (currently discarded); same for `perplexity-provider.ts` at L93-96. Populate `result.usage`.
- Thread `runId`/`tenantId` into `routeModelTask` (add optional fields to `ModelTaskRequest`, result-shape.ts:36-45 — they do not exist today).
- In `routeModelTask`, convert `usage` → `recordTokenUsage()` (`TokenTelemetry`) tagged with `runId`/`tenantId`/`model`.
- Persist: `incrementMetric("cost_usd_total")` + per-run cost via `recordMetric`, and `appendSystemEvent({ category:"tool", eventType:"model_spend", environment, runId, tenantId, payload:{ provider, model, cost_estimate } })`. **Note `environment` is required** by `appendSystemEvent` (it is non-optional on `SystemEvent`).

**Phase 2b — Wire the ceiling into the gate (L2).**
- Extend `ExecuteWithEnforcementContext` with the optional `runCost` accumulator (above).
- Add the cost-gate that calls `enforceTokenBudgetPolicy`; on breach emit a `block`/`require_approval` decision plus a `model_spend_breach` event into the **same** audit ledger (`logAuditEvent` + `recordControlDecision`/`appendSystemEvent`), copying the `control-actions.ts` pattern.

**Phase 2c — Per-tenant + tool/API spend (the only genuinely new policy surface).**
- Add `runtime/policies/cost-ceiling.policy.json` (format below) covering **only** per-tenant cumulative ceilings and non-LLM tool/API spend caps. The per-case/per-stage **token** limits already in `TokenBudgetPolicy` are NOT re-declared.
- Add a non-breaking `summarizeTokenUsageByTenant` wrapper over `summarizeTokenUsageByCase` and evaluate the tenant ceiling in the cost-gate.

### New Policy File — `runtime/policies/cost-ceiling.policy.json` (per-tenant + tool/API only)

Follows the existing convention (`{ policy, version, description, rules }`) seen in `environment.policy.json` and validated by `PolicyDocument` (`src/core/policy/policy-types.ts:21-26`), loadable via `loadPolicy()` (`src/core/policy/policy-loader.ts:23`, which requires string `policy` + `version`):

```json
{
  "policy": "cost-ceiling",
  "version": "1.0.0",
  "description": "Per-tenant cumulative spend ceilings and non-LLM tool/API spend caps. Per-case/per-stage TOKEN limits are owned by TokenBudgetPolicy and are NOT redefined here.",
  "rules": {
    "perTenantCeilingUsd": { "default": 25.0, "soft_limit_ratio": 0.8 },
    "perRunCeilingUsd": { "default": 5.0, "soft_limit_ratio": 0.8 },
    "toolApiSpendUsd": {
      "default_per_call_cap": 1.0,
      "by_tool": { "perplexity": 0.5, "serp": 0.25 }
    },
    "onBreach": "block",
    "onSoftWarn": "annotate"
  }
}
```

### Changed Files

- `src/model-routing/result-shape.ts` — add `usage` to `ModelRoutingResult`; add optional `runId`/`tenantId` to `ModelTaskRequest`.
- `src/model-routing/providers/openai-provider.ts`, `perplexity-provider.ts` — read provider `usage` (currently discarded at L67-69 / L93-96).
- `src/model-routing/model-router.ts` — capture usage → `recordTokenUsage`; accumulate into run cost; invoke cost-gate; thread `runId`/`tenantId`.
- `src/security/permissions/enforced-execution.ts` — extend `ExecuteWithEnforcementContext` with optional `runCost`; add cost-gate.
- `src/core/observability/metrics-store.ts` — add cost metric(s) to `KNOWN_METRICS`.
- `src/core/events/event-ledger.ts` — no signature change; new `eventType` values only (`model_spend`, `model_spend_breach`).
- `src/intelligence-layer/token-governance/index.ts` — add `summarizeTokenUsageByTenant` (non-breaking wrapper).
- `runtime/policies/cost-ceiling.policy.json` — NEW (per-tenant + tool/API only).

### Acceptance Criteria (testable from code; reconcile section numbers once the spec lands)

- **0 silent breaches:** every `enforceTokenBudgetPolicy` `allowed:false` produces a `block`/`require_approval` through `executeWithEnforcement` **and** a `model_spend_breach` event in `event-ledger` plus a run-audit-log entry. (Brief's Section 3: "zero silent breaches" — verify against spec.)
- **Cost-per-run on 100% of runs:** every run issuing ≥1 cloud model call writes a per-run cost to `metrics-store` and a `model_spend` event to `event-ledger`; a run with no cost record fails CI. (Brief's Section 3: "cost-per-run on 100% of runs" — verify against spec.)
- **Tool/API spend coverage (new):** non-LLM tool/API calls are captured under `toolApiSpendUsd`; a call over its cap routes to the gate.
- **Per-tenant coverage (new):** cumulative tenant spend (via `summarizeTokenUsageByTenant`) is evaluated against `perTenantCeilingUsd`; crossing the soft band annotates, crossing the hard ceiling blocks via the gate.

*Constraints honored: WIRE+EXTEND only (no rebuild of the existing enforcer/capture); no new top-level layer; file-backed under `runtime/`; `executeWithEnforcement` remains the single authority; all breaches report into the existing audit ledger. **Open dependency:** the governing spec file must be committed and its Section 3 / Section 7 numbering reconciled with the acceptance items above.*


---

## Phase 3 — G3 Memory Integrity (L6): Freshness, Decay, Conflict & Source-Precedence

### 3.0 Corrected current-reality note

> Verification status: the target spec file `docs/architecture/AJ_DIGITAL_OS_RELIABILITY_HARDENING_SPEC.md` is NOT present on this branch (`claude/modest-banach-1a7159`) — confirmed via Glob — so this charter is drafted against live code and the canonical `AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`. Every code claim below was re-read against the named file + exported symbol.

G3 is **accurate as a gap** but must be scoped precisely. The repo has **three recall paths**, all relevance/similarity-only with NO freshness, decay, conflict, or precedence logic:

- **Operational Retrieval** (`src/retrieval/`): `searchRetrieval()` ranks via `scoreChunk()` — a pure word-overlap ratio `hits / queryWords.length` (`retrieval-search.ts:40-48`). It already loads the parent document per top result (`getDocument(chunk.documentId)`, `retrieval-search.ts:121`), so `RetrievalDocument.createdAt/updatedAt/version` (`retrieval-types.ts:32-43`) are in scope at result-build time. The **freshness contract already exists**: `RetrievalPolicyMeta.staleDocumentIds: string[]` (`retrieval-types.ts:143`), already threaded through `RetrievalSearchResponse` (`retrieval-types.ts:168`) and `RetrievalContextPack` (`retrieval-types.ts:151`) — but it is initialised to `[] as string[]` and never filled (`retrieval-search.ts:68`, `retrieval-ingestor.ts:123`). Grep over `src/` confirms these are the ONLY three references to the field.
- **Memory-runtime recall** (`src/memory-runtime/retrieval.ts`): `retrieve()` slots run-logs by `RETRIEVAL_PRIORITY` (working_context → last_run → last_failure → recent_logs) with per-slot char budgets and already prefers newest run-log first (`getLastRunLog`, filename sort+reverse). **Out of scope** for Phase 3 — this is run-log slotting, not a scored recall set; it has no decay/conflict but needs none here.
- **Semantic stitch path** (`src/conversation/context-stitcher.ts`): `ContextStitcher.stitch()` builds a `StitchedContextBundle` via the `tryInclude()` closure (`context-stitcher.ts:48-96`), final bundle assembled at `context-stitcher.ts:216-229`. Each source already carries `createdAt` into `ContextSourceMetadata` (`conversation-types.ts:60-74`); semantic sources pass `result.entry.updatedAt` (`context-stitcher.ts:155`). Recall ranking is `SemanticMemoryRetriever.search()` — cosine similarity plus small brandId/threadId boosts only (`semantic-memory-retriever.ts:39-47`). No freshness score, conflict detection, or precedence ordering exists; all source kinds are equal-weight.

**This phase WIRES + EXTENDS these existing contracts. It does NOT add a new layer, a new bundle type, or a parallel freshness field. It FILLS the existing `staleDocumentIds`.** All storage stays file-backed under `runtime/` and `data/` (per Coverage Index Layer 6: `runtime/retrieval/*.json`).

### 3.1 Genuine remaining gap (only this)

Memory recall today is **relevance-only**. Four sub-gaps, all real:
1. `scoreChunk()` ignores document age — no recency/decay weighting; a years-old doc and a fresh doc rank identically on text match.
2. `staleDocumentIds` is never populated — no freshness signal reaches callers; stale items are silently authoritative.
3. No conflict detection within a single recall set / stitched bundle (two items asserting different values for the same fact are returned flat).
4. No source-precedence (canonical specs > memory > generated) in search or stitcher; a generated turn can outrank an authoritative source on raw score.

### 3.2 Phased work

**3.2.a — Recency/decay weighting + fill `staleDocumentIds` (operational retrieval)**
- **Wiring point:** `src/retrieval/retrieval-search.ts`, inside `searchRetrieval()` — the candidate-scoring loop (`retrieval-search.ts:103-111`), the sort+slice (`113-117`), the result-build loop (`119-134`), and the `policyMeta.staleDocumentIds` initialiser (`68`).
- Extend `scoreChunk()` (`40-48`): keep word-overlap as `relevance`, then apply a **decay multiplier** derived from the parent document's `updatedAt`. Because `getDocument()` is called only per top result today (`121`), hoist a `documentId → updatedAt` lookup before the candidate loop — reuse `getDocument`, or batch via the existing `listDocuments()` (`retrieval-store.ts:79`) — so decay applies during candidate scoring, not just at display.
- **Data shape (config, file-backed default in `src/retrieval/retrieval-policy.ts` alongside `DEFAULT_RETRIEVAL_POLICY`):** `FreshnessPolicy { halfLifeDays: number; staleAfterDays: number; decayFloor: number }` with `DEFAULT_FRESHNESS_POLICY`. `finalScore = relevance × max(decayFloor, 0.5 ^ (ageDays / halfLifeDays))`.
- **Fill the existing contract:** any candidate whose parent doc `ageDays > staleAfterDays` → push `documentId` into `policyMeta.staleDocumentIds` (the EXISTING field — no new field) and demote (multiply by `decayFloor`), never silently drop. Leave `retrieval-ingestor.ts:123` as `[]` unless an explicit ingest-time staleness check is added in a later phase.
- **Surface per-result freshness** on the EXISTING `RetrievalResult.metadata` (`retrieval-types.ts:67-77` — `metadata: Record<string, unknown>`; no new top-level field): `metadata.freshness = { ageDays, decayFactor, stale }`. `RetrievalContextPack` already carries `policyMeta.staleDocumentIds` through unchanged.

**3.2.b — Conflict detection within a recall set**
- **Wiring point:** new pure helper `src/retrieval/retrieval-conflict.ts` exporting `detectConflicts(results: RetrievalResult[]): ConflictFlag[]`, called at the end of `searchRetrieval()` before return, and reused by the stitcher (3.2.c). This is a NEW additive helper, not a re-implementation of any existing module.
- **Data shape:** `ConflictFlag { kind: "value_conflict" | "version_conflict"; documentIds: string[]; chunkIds: string[]; detail: string }`. v1 is **deterministic, local-only** (no NLI/embeddings/cloud): detect (i) same `documentId`, differing `version` (`RetrievalDocument.version`, `retrieval-types.ts:39`); (ii) overlapping high-relevance chunks with negation/number-mismatch heuristics on shared key terms. Conservative — flag, never auto-resolve, never auto-drop.
- Surface via the existing `RetrievalResult.metadata.conflicts` and a response-level count; no enforcement block (flag-and-demote posture).

**3.2.c — Source-precedence + freshness/conflict flags in the stitcher**
- **Wiring point:** `src/conversation/context-stitcher.ts`, `ContextStitcher.stitch()` — the `tryInclude()` closure (`context-stitcher.ts:48-96`) and the final bundle assembly (`216-229`).
- Add a **precedence tier** to each `tryInclude` entry: `precedence: "canonical" | "memory" | "generated"`. Map ONLY off the existing `ContextSourceKind` members (`conversation-types.ts:8-14` — no canonical-spec kind exists today; do NOT introduce a phantom source kind): `brand_context` → `canonical`; `semantic_memory` + `session_metadata` + `deliverable_metadata` → `memory`; `conversation_turn` + `current_task` → `generated`. (A dedicated canonical-spec source kind, if ever added, would map to `canonical` — flagged as future, not built here.) When the char budget forces drops in `tryInclude`, drop **lowest precedence first**, then by age — so a generated turn can never evict a higher-precedence source.
- Compute a per-source **freshness score** from the already-present `ContextSourceMetadata.createdAt` (semantic sources already pass `result.entry.updatedAt`, `context-stitcher.ts:155`), reusing the 3.2.a `FreshnessPolicy`.
- Run `detectConflicts()` (3.2.b) over the included `sourceMaterials`.
- **Surface in bundle metadata (extend EXISTING types in place):** add to `ContextSourceMetadata` (`conversation-types.ts:60-74`): `precedence`, `freshness?: { ageDays; decayFactor; stale }`. Add to `StitchedContextBundle` (`conversation-types.ts:76-89`): `conflicts?: ConflictFlag[]`, `staleSourceCount?: number`. Then extend `AssistantRuntimeService.buildStitchedContextMetadata()` (`assistant-runtime.ts:1428`) and `toStitchedContextSummary()` (`assistant-runtime.ts:1219`) to emit `stitchedContextStaleSourceCount` and `stitchedContextConflictCount`, so flags reach the assistant result.

**3.2.d — Enforcement posture**
- Default is **flag-and-demote (non-blocking)** — no `executeWithEnforcement()` change required for the core charter. If a future hard gate (refuse recall when a canonical source is stale/conflicted) is desired, it MUST extend `executeWithEnforcement()` (`src/security/permissions/enforced-execution.ts:48`, exported async function) and report into the same audit ledger — never a side-channel. Marked as a fast-follow, not Phase 3 core.

### 3.3 Changed-files list

- `src/retrieval/retrieval-search.ts` — extend `scoreChunk()`, hoist doc-timestamp lookup (`getDocument`/`listDocuments`), populate `policyMeta.staleDocumentIds`, attach `metadata.freshness`/`metadata.conflicts`, call `detectConflicts()`.
- `src/retrieval/retrieval-conflict.ts` — **new**, pure `detectConflicts()` + `ConflictFlag`.
- `src/retrieval/retrieval-types.ts` — add `FreshnessPolicy`, `ConflictFlag`; keep `RetrievalPolicyMeta.staleDocumentIds` (fill, do not rename); extend `RetrievalResult.metadata` shape via docs only (field is already `Record<string, unknown>`).
- `src/retrieval/retrieval-policy.ts` — add `DEFAULT_FRESHNESS_POLICY` next to `DEFAULT_RETRIEVAL_POLICY` (file-backed default).
- `src/retrieval/retrieval-ingestor.ts` — unchanged unless an ingest-time staleness flag is added (then mirror the fill at line 123).
- `src/conversation/context-stitcher.ts` — precedence tiering + budget-aware drop order in `tryInclude`, per-source freshness, conflict pass.
- `src/conversation/conversation-types.ts` — extend `ContextSourceMetadata` (`precedence`, `freshness`) and `StitchedContextBundle` (`conflicts`, `staleSourceCount`).
- `src/services/runtime/assistant-runtime.ts` — extend `buildStitchedContextMetadata()` (`:1428`) and `toStitchedContextSummary()` (`:1219`) to surface stale/conflict counts.
- `tests/retrieval/retrieval.test.ts` (extend) + **new** `tests/conversation/context-stitcher.test.ts`.

### 3.4 Acceptance criteria (mapped to spec Section 3 measures)

> The literal spec is absent on this branch; criteria below are framed as measurable assertions over the verified surfaces and should be reconciled with Section 3's exact measure wording when the spec branch merges.

- **Freshness score present 100%:** every `RetrievalResult` from `searchRetrieval()` carries `metadata.freshness.{ageDays,decayFactor,stale}`, and every included `ContextSourceMetadata` carries `freshness` — asserted over a fixture set spanning fresh + aged docs.
- **Stale demoted, never silently authoritative:** for any doc older than `staleAfterDays`, its `documentId` appears in `policyMeta.staleDocumentIds` AND its `finalScore` is strictly below an equally-relevant fresh doc — test: a fresh doc outranks a higher-word-overlap stale doc.
- **Conflict surfaced, not resolved:** a fixture recall set with two contradicting items yields ≥1 `ConflictFlag` on the response and a non-zero `stitchedContextConflictCount`; no item is auto-dropped by the conflict pass alone.
- **Precedence honoured under pressure:** with a `maxCharacters` budget that forces eviction, a `generated` source is dropped before any `canonical`/`memory` source; a `canonical` source is never evicted while a `generated` source remains included.
- **Contract reused, not duplicated:** grep confirms `staleDocumentIds` is the only stale-doc carrier (no parallel freshness field at `RetrievalResult` top level); `StitchedContextBundle`/`ContextSourceMetadata` are extended in place.
- **No bypass:** if any hard gate is added it routes through `executeWithEnforcement()` with an audit entry per blocked recall; otherwise no enforcement path is touched (flag-and-demote default).


---

## G4 — Governance Completion (L10 + L2)

> Verification note (read first): the code claims in this charter were independently re-read and confirmed against the repo. Two corrections were applied vs. the original draft: (1) the money-approval acceptance now states an explicit prerequisite — `discountPercent` must be wired through `CreateOfferInput` and `buildGovernanceOffer`, because today the discount-tier approval path in `evaluateOffer` is structurally unreachable from `createOffer`; (2) acceptance is labelled "to be reconciled with the spec's Section 3" because `AJ_DIGITAL_OS_RELIABILITY_HARDENING_SPEC.md` is not present in this repo/worktree and its Section 3 measures could not be read.

### Corrected current-reality note (supersedes the stale Coverage Index)

The Coverage Index (`docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`, L10 Governance row, line 195) lists "brand voice governance, legal claims constraints, SOP policy files, offer governance, client-specific rule overrides" as *Missing*. This is stale. All of these exist and are evaluated:

- `runtime/policies/legal-constraints.policy.json` (`legal-v1`) — this **IS** the claims/legal policy the spec wanted to author. It defines `restrictedCategories`, `approvalRequiredCategories`, `prohibitedPatterns[]` (each `{pattern, severity: "block"|"warn"}`, e.g. `guaranteed (results|income|return|earnings|profit)` block, `100% (success|guaranteed|risk-free|no-risk)` block, the `(make|earn) $N per/a day/week/month` block pattern), and a `requiredDisclaimers` map.
- `runtime/policies/offer-governance.policy.json` (`offer-v1`) — this **IS** the money boundary. `priceFloor.default`(500)/`byType`, `currency`, `maxDeliverablesByType`, `allowedGuarantees`, `forbiddenGuarantees` (`specific_revenue`, `specific_roi`, `specific_ranking`, `specific_traffic`), `discountRules` (`maxAutoApprovedPercent: 15`, `maxApprovedPercent: 35`, `blockBeyondMaxApproved: true`), `requiredComponents`.
- `runtime/policies/brand-voice.policy.json` and `runtime/policies/sop-constraints.policy.json` — adjacent governance, also present, with `runtime/policies/client-overrides/` driving per-tenant overrides.
- An entire **evaluator module** loads and evaluates these: `src/governance/legal/legal-policy.ts` (`evaluateLegalCompliance(content, category)` regex-scans content against `prohibitedPatterns`, returning `{compliant, requiresReview, requiresApproval, violations, requiredDisclaimers}`), `src/governance/offer/offer-policy.ts` (`evaluateOffer(offer)`), and the aggregator `src/governance/governance-engine.ts` (`evaluateGovernance(request)`), which merges per-tenant overrides via `src/governance/client-rules/client-rule-engine.ts` (`loadClientOverrides`) **into the brand-voice and agent-behavior branches** and emits MAP attribution via `src/governance/governance-attribution.ts` (`emitGovernanceEvent`). CLI (`src/commands/governance.commands.ts`: `governance-legal-check`, `governance-offer-check`, `governance-evaluate`) and HTTP (`src/hermes/hermes-status-api.ts`: `POST /governance/evaluate`, `GET /governance/legal/policy`) surfaces exist; `tests/governance/governance.test.ts` imports and exercises all evaluators and copies the policy files into a sandbox.

**`legal-constraints.policy.json` is NOT an orphan** — it is loaded by `legal-policy.ts` (`POLICY_FILE = "legal-constraints.policy.json"`) via `src/core/policy/policy-loader.ts` (`loadPolicy`, file-backed under `runtime/policies/`, cached) and scanned on every `evaluateLegalCompliance` call.

### Naming resolution

REUSE `runtime/policies/legal-constraints.policy.json` as the claims/legal source of truth. Do **NOT** create `claims.policy.json` or `legal.policy.json` — that would duplicate `legal-v1` and create a second source of truth. No genuinely-new policy file is justified for G4; a deliverable-category→legal-category mapping, if needed, lives in code (Phase 4.1), not a new policy doc.

### The genuine remaining gap

The evaluators exist but are **not wired into the outbound deliverable path, and the offer engine never feeds the one input that produces a money-approval**:

1. `src/agents/publisher.agent.ts` (`PublisherAgent.publish`) writes deliverable content (`asset.value`) to disk via `executeWithEnforcement({actionType: "write_file"})` but never scans the content.
2. `src/services/runtime/deliverable-lifecycle.ts` (`DeliverableLifecycleService`) advances `draft → pending_approval → approved → published` with no governance content scan at any transition. Note `publishDeliverable` has **two** code paths: a `PublisherAgent.publish()` path (when `runId` is set and there is no `outputPath`/`outputFiles`) and a `this.transition()` path; a complete claims-check must cover both.
3. The only content caller, `src/apps/content-engine/content-engine.ts`, calls `evaluateGovernance` **without** `contentCategory`, so the legal branch in `governance-engine.ts` (gated on `request.content !== undefined && request.contentCategory`, line 55) is skipped — only brand-voice runs. `publishContent` governs only `merged.title`, not the body.
4. `src/apps/offer-engine/offer-engine.ts` enforces price-floor/forbidden-guarantee blocks but, on `governance.requiresApproval`, only stamps the entity `governanceStatus: "pending"` via `normalizeOffer`/`saveEntity` — it does not create a real `ApprovalRequest` (`src/security/approvals/approval-service.ts`) nor write to the enforcement audit ledger (`logs/security/agent-action-audit.jsonl`). **Critically, `CreateOfferInput` (`offer-engine-types.ts`) has no `discountPercent` field and `buildGovernanceOffer` does not pass one, so `evaluateOffer`'s discount-tier approval branch is currently unreachable from `createOffer` — the only offer rule that yields `requiresApproval`.**
5. Governance content-scan outcomes are not reported into the enforcement audit ledger. `emitGovernanceEvent` writes MAP attribution events only; a blocked claim and a blocked file-write live in two separate ledgers.

### Architectural note (why this is a separate step, not a tweak to `executeWithEnforcement`)

`executeWithEnforcement` (`src/security/permissions/enforced-execution.ts`) classifies **actions**, not content. `AgentActionRequest` (`src/security/permissions/permission-levels.ts`) has no content field; `classifyAgentAction` (`src/security/permissions/action-classifier.ts`) maps `write_file → WRITE/medium`; the audit record (`src/security/permissions/audit-logger.ts`) carries action metadata only. The content claims-check must therefore run as a discrete pre-publish step that (a) calls the existing `evaluateGovernance`/`evaluateLegalCompliance`, (b) blocks the lifecycle transition on `overall === "block"`, and (c) **reports its outcome into the same audit ledger** (`logs/security/agent-action-audit.jsonl` + `defaultAuditStore` via `logAgentActionAudit`). `executeWithEnforcement` remains the single action-level control authority; the claims-check extends governance into content and feeds the same ledger — it does not bypass or replace enforcement.

### Phased charter (WIRE, not author)

**Phase 4.1 — Pre-publish claims-check at the lifecycle gate**
- *Wiring point:* `src/services/runtime/deliverable-lifecycle.ts`, inside `submitForApproval()` (transition to `pending_approval`) and `publishDeliverable()` (covering **both** the `PublisherAgent.publish()` branch and the `this.transition()` branch), before the status advances.
- *Behavior:* load the deliverable's content (its `title` + `summary`, and read body text from `outputFiles`/`outputPath`), derive a `contentCategory` from `deliverableType`/`categoryId` (code map, not a new policy), then call existing `evaluateGovernance({ content, contentCategory, tenantId: clientId })`. On `overall === "block"`, return `{ ok: false, errors: [...blockedReasons] }` and do not transition. On `requiresApproval`, force `approvalRequired = true` and keep status at `pending_approval`.
- *Reuse:* `evaluateLegalCompliance` / `evaluateGovernance` (`src/governance/`), `legal-constraints.policy.json`. No new evaluator logic. Belt-and-braces: optionally call the same helper before `PublisherAgent.writeArtifacts` so a direct publish cannot bypass the gate.

**Phase 4.2 — Report claims-check into the enforcement audit ledger (L2)**
- *Wiring point:* a thin adapter (`src/governance/governance-audit-bridge.ts`, ~30 lines — the only genuinely-new file; justified because no existing module bridges governance outcomes into the action audit ledger) that, after the Phase 4.1 scan, constructs a synthetic `AgentActionRequest` (`{ agentId, actionType: "content_claims_check", target: deliverableId, clientId }`) and calls `logAgentActionAudit(request, auditId, permissionLevel, category, decision, approvalStatus, risk, reason)` (`src/security/permissions/audit-logger.ts`) so a blocked/approved claim lands in `logs/security/agent-action-audit.jsonl` and `defaultAuditStore` alongside action decisions. Map `decision` from governance `overall` (`pass→allow`, `block→block`, `approval_required→require_approval`), `reason` from `blockedReasons`.
- *Reuse:* existing audit logger + `defaultAuditStore`; `emitGovernanceEvent` stays as-is (dual emit acceptable — MAP attribution + control audit).

**Phase 4.3 — Money/comms approval default through the real gate**
- *Prerequisite (money input wiring):* add `discountPercent?: number` to `CreateOfferInput` (`src/apps/offer-engine/offer-engine-types.ts`) and pass it through `buildGovernanceOffer` (`offer-engine.ts`) into the `OfferInput`. Without this, `evaluateOffer`'s discount-tier `requiresApproval` branch never fires and the money-approval routing below is inert.
- *Wiring point (money):* `src/apps/offer-engine/offer-engine.ts` — when `governance.requiresApproval`, call `defaultApprovalService.createApprovalRequest(...)` (`src/security/approvals/approval-service.ts`) and surface the `approvalId`, instead of only stamping `governanceStatus: "pending"`. `CreateApprovalInput` requires `{ approvalType, requestedByAgentId, permissionLevel, actionCategory, risk, reason, expiresAt }`.
- *Wiring point (comms):* the deliverable lifecycle gate (Phase 4.1) for `publishDeliverable` on comms-category deliverables — require approval by default.
- *Policy default:* add the publish/comms and money actions to `runtime/policies/approval-gates.policy.json` `approvalRequired` (EXTEND the existing file; do not author a new one) and add a `content_claims` / `comms_send` value to `ApprovalType` (`src/security/approvals/approval-types.ts`) if a distinct approval label is required (current closest is `browser_send`).

### Changed-files list
- `src/services/runtime/deliverable-lifecycle.ts` (add pre-transition claims-check in `submitForApproval` and both branches of `publishDeliverable`)
- `src/agents/publisher.agent.ts` (optional belt-and-braces: claims-check before `writeArtifacts`, sharing the Phase 4.1 helper)
- `src/governance/governance-audit-bridge.ts` (NEW, ~30 lines: maps a `GovernanceResult` to a `logAgentActionAudit` call)
- `src/apps/offer-engine/offer-engine.ts` (route `requiresApproval` to `approval-service`; pass `discountPercent` into governance)
- `src/apps/offer-engine/offer-engine-types.ts` (add `discountPercent?: number` to `CreateOfferInput`)
- `runtime/policies/approval-gates.policy.json` (EXTEND `approvalRequired`)
- `src/security/approvals/approval-types.ts` (optional: add comms/claims `ApprovalType`)
- `tests/governance/` + `tests/services/runtime/` (lifecycle-gate and audit-bridge coverage)

### Acceptance measures (to be reconciled with the spec's Section 3 once the spec is committed)
- **Claims policy evaluated per deliverable:** every `submitForApproval` and `publishDeliverable` invokes `evaluateGovernance` with a non-empty `contentCategory`; a deliverable whose body contains a `block`-severity `prohibitedPattern` from `legal-constraints.policy.json` is refused the transition (test: a blog body containing "guaranteed results" cannot reach `published`).
- **Money gated (with prerequisite wired):** after `discountPercent` is wired through `CreateOfferInput`/`buildGovernanceOffer`, an offer with a discount above `discountRules.maxAutoApprovedPercent` (15%) and at or below `maxApprovedPercent` (35%) creates a real `ApprovalRequest` (status `pending`) via `approval-service`, not just an entity flagged `"pending"`; an offer below `priceFloor` or carrying a `forbiddenGuarantee` is blocked (`overall === "block"`).
- **Comms gated:** comms-category deliverables default to `approvalRequired = true` at the lifecycle gate.
- **Single ledger:** each claims-check decision (allow/block/require_approval) appends one record to `logs/security/agent-action-audit.jsonl` (and `defaultAuditStore`) via `logAgentActionAudit`, so governance content decisions and action decisions share one audit trail; `executeWithEnforcement` remains the action-level authority and is not bypassed.


# Coverage Index — Proposed Correction (operator-action-only)

## PROPOSED — DO NOT APPLY WITHOUT OPERATOR SIGN-OFF

> The Layer Coverage Index is marked operator-action-only. The blocks below are a **proposed diff** for `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`. They are draft text only; nothing here is to be committed by an agent. Every claim is grounded in a file + exported symbol read from the live repo (this worktree).
>
> **Scope note (verification finding):** The Reliability Hardening Spec file referenced by the re-baseline task (`docs/architecture/AJ_DIGITAL_OS_RELIABILITY_HARDENING_SPEC.md`) is **not present in this repo** — only the Coverage Index is. Acceptance criteria below are therefore anchored to the Coverage Index's own verbatim "Missing" items (present and quoted) and to the governance/cost-ceiling intent of the spec, **not** to specific section numbers that cannot be checked against a document in this tree. If/when the spec lands, map these acceptance items onto its §3 measures.

---

### Corrected current-reality note (for the top of the affected rows)

The index understates shipped governance and observability work. Since it was written, a dedicated **Governance Engine** (`src/governance/`) and a **Token Governance** module (`src/intelligence-layer/token-governance/`) have landed and are wired into the Application Layer. The corrections below remove false "Missing" claims, and — critically — flag the *honest wiring status*: governance runs as a **parallel control path** invoked by the apps/CLI/Hermes, **not** yet unified under `executeWithEnforcement()`. The single-enforcement-authority rule still holds; unifying governance into it is the genuine remaining work.

---

### BEFORE / AFTER — L10 Governance row (lines 191, 195)

**BEFORE (Status, line 191):**
```
| **Status** | 🔶 Partial |
```
**AFTER:**
```
| **Status** | 🔶 Partial (governance engine built + Application-Layer-wired; not yet unified under executeWithEnforcement) |
```

**BEFORE (Notes / Gaps, line 195):**
```
| **Notes / Gaps** | Enforcement engine, permission levels, and policy-as-code files cover security governance. Missing: brand voice governance, legal claims constraints, SOP policy files, offer governance, client-specific rule overrides. |
```
**AFTER:**
```
| **Notes / Gaps** | Security governance (enforcement engine, permission levels, action-risk/tenant/approval policies) is live. BUSINESS governance now ALSO exists: `src/governance/` reads and evaluates `runtime/policies/{brand-voice,legal-constraints,sop-constraints,offer-governance,agent-behavior}.policy.json` plus client-specific overrides. Built & evaluated — NOT orphan files. WIRING STATUS (honest): `evaluateGovernance()` is invoked by the Application Layer (offer-engine, content-engine, lead-to-offer workflow), CLI (`src/commands/governance.commands.ts`), and Hermes API (`src/hermes/hermes-status-api.ts`), and emits MAP attribution events — but it is NOT routed through `executeWithEnforcement()` (which still runs `enforceAgentAction()` only), and the core policy dispatcher `evaluatePolicy()` does not special-case these files (they hit its default allow branch). Remaining gap: unify governance decisions under the single enforcement authority / shared enforcement audit, and expose governance outcomes on the dashboard. |
```

**ADD to the "Key files" list under L10 (after line 205):**
```
- `src/governance/governance-engine.ts` — `evaluateGovernance()` (single L10 business-governance entry point)
- `src/governance/brand-voice/brand-voice-policy.ts` — `evaluateBrandVoice()` (reads `brand-voice.policy.json`)
- `src/governance/legal/legal-policy.ts` — `evaluateLegalCompliance()` (reads `legal-constraints.policy.json`)
- `src/governance/sop/sop-policy.ts` — `validateWorkflowSteps()` (reads `sop-constraints.policy.json`)
- `src/governance/offer/offer-policy.ts` — `evaluateOffer()` (reads `offer-governance.policy.json`)
- `src/governance/agent-behavior/agent-behavior-policy.ts` — `evaluateAgentAction()` (reads `agent-behavior.policy.json`)
- `src/governance/client-rules/client-rule-engine.ts` — `loadClientOverrides()` (client-specific rule overrides)
- `src/governance/governance-attribution.ts` — `emitGovernanceEvent()` → MAP attribution ledger (fire-and-forget)
- `runtime/policies/{brand-voice,legal-constraints,sop-constraints,offer-governance,agent-behavior}.policy.json`
```

---

### BEFORE / AFTER — L13 Observability row (line 249)

**BEFORE (Notes / Gaps, line 249):**
```
| **Notes / Gaps** | JSONL audit logs exist across Control Plane, BEL, DAG, Cache, Retrieval, Decision Engine. Operating Core adds unified System Event Ledger and file-backed metrics. Missing: cost tracking per run, tool/API spend, performance metrics (execution time), ROI dashboard, alerting. |
```
**AFTER:**
```
| **Notes / Gaps** | JSONL audit logs exist across Control Plane, BEL, DAG, Cache, Retrieval, Decision Engine. Operating Core adds unified System Event Ledger and file-backed metrics. Token model-cost capture EXISTS: `src/intelligence-layer/token-governance/` computes per-event `cost_estimate`, rolls up by stage/agent (`summarizeTokenUsageByCase`), and enforces per-case/per-stage/soft-ratio budgets (`enforceTokenBudgetPolicy`). LIMITS — this telemetry is in-memory only (no writeFile/appendFile under `src/intelligence-layer`; verified). Narrowed Missing: (a) per-run persistence of token telemetry to a `runtime/` JSONL ledger; (b) EXTERNAL tool/API spend (only model tokens are costed today, via DEFAULT_COST_PER_1K); (c) per-tenant cost rollup; (d) performance metrics (execution time); (e) ROI dashboard + spend alerting. |
```

**ADD to the "Key files" list under L13 (after line 258):**
```
- `src/intelligence-layer/token-governance/index.ts` — `recordTokenUsage()`, `summarizeTokenUsageByCase()`, `enforceTokenBudgetPolicy()`, `computeErrorReductionPer1kTokens()` (token cost capture + budget enforcement; in-memory)
- `src/intelligence-layer/ais-core/index.ts` — consumes token-governance in `diagnoseSystem()` / `updateOutcome()`
```

---

### BEFORE / AFTER — L15 Optimization row (lines 284, 288)

**No change to Status — keep Planned.** Confirmed unbuilt: `src/**/{evaluation,run-eval,optimization}/**` returns no files.

**BEFORE (Notes / Gaps, line 288):**
```
| **Notes / Gaps** | CERA (Capture, Extract, Refine, Amplify) in the MAP-CERA Decision Engine is the conceptual foundation for this layer. Full optimization pipeline — reading attribution history and improving workflows — is unbuilt. |
```
**AFTER:**
```
| **Notes / Gaps** | CERA (Capture, Extract, Refine, Amplify) in the MAP-CERA Decision Engine is the conceptual foundation for this layer. Run-evaluation / feedback-loop / optimization pipeline confirmed UNBUILT as of this re-baseline (no `src/**/{evaluation,run-eval,optimization}` module). Remains 📋 Planned. NOTE: token-cost efficiency primitives now exist in `src/intelligence-layer/token-governance/` (`computeErrorReductionPer1kTokens`) and can feed this layer when built — but the optimization loop itself is not started. |
```

---

### BEFORE / AFTER — Priority / Roadmap table (line 365)

**BEFORE (Priority 1 row):**
```
| 1 | **L10 Governance hardening** | Brand voice policies, SOP constraints, legal claim rules, client-specific policy overrides — required before any Application Layer work |
```
**AFTER:**
```
| 1 | **L10 Governance UNIFICATION (not greenfield build)** | Brand voice, SOP, legal, offer, agent-behavior, and client-override policies ALREADY exist and are evaluated by `src/governance/` and wired into the Application Layer. Remaining work is WIRING, not building: unify `evaluateGovernance()` with the single `executeWithEnforcement()` authority / shared enforcement audit, and surface governance outcomes on the dashboard. |
```

---

### Gate 0 Diagnosis — recommended addition (one line)

Add to the diagnosis/intake checklist (Gate 0):

```
- [ ] Verify each "Missing"/"Planned" claim against the LIVE repo (grep for the module + exported symbol), not only against this Coverage Index. This index is a hand-maintained living document and can lag `main`; treat it as a hint, the code as ground truth.
```

---

### Phased charter (wiring-only; no rebuilds) — for whoever actions the above

> All work is WIRE + EXTEND. No new top-level layers. Local-first / file-backed under `runtime/` (or `logs/`, matching existing JSONL ledgers). No Firebase / cloud vector DB / new secret-dependent integrations. `executeWithEnforcement()` remains the single control authority.

**Phase A — L13 token-cost persistence (smallest, highest-signal)**
- Changed files: `src/intelligence-layer/token-governance/index.ts` (add a thin persistence helper), new `src/intelligence-layer/token-governance/token-ledger.ts`, new JSONL under `runtime/observability/`.
- Wiring point: `recordTokenUsage()` (and/or its caller `diagnoseSystem()` in `src/intelligence-layer/ais-core/index.ts`, which today builds `tokenTelemetry: TokenTelemetry[]` and returns it in-memory) — append each `TokenTelemetry` to a JSONL ledger.
- Data shape (append-only line): `{ ts, case_id, run_id, tenant_id, stage, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_estimate }` — extends the existing `TokenTelemetry` (from `src/intelligence-layer/shared-types/index.ts`, which has `case_id, stage, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_estimate`) with new `run_id` / `tenant_id` / `ts` fields.
- Ledger path: `runtime/observability/token-spend.jsonl` (mirrors existing JSONL ledgers; no DB).
- Acceptance (cost-capture / cost-ceiling intent; mirrors Coverage Index L13 narrowed-Missing items (a)+(c)): each diagnosed run appends ≥1 token-spend line; per-run and per-tenant totals are reconstructable from the ledger; the `enforceTokenBudgetPolicy` outcome (`allowed`/`reasons`/`warnings`) is recorded alongside; in-memory behavior unchanged when persistence is disabled.

**Phase B — L10 governance ↔ enforcement unification**
- Changed files: `src/security/permissions/enforced-execution.ts` (consume `evaluateGovernance()` for content/offer/SOP-bearing actions); governance engine `src/governance/governance-engine.ts` left intact (no rebuild). Optionally `src/security/permissions/enforcement-engine.ts` if the fold-in happens inside `enforceAgentAction`.
- Wiring point: `executeWithEnforcement()` in `src/security/permissions/enforced-execution.ts` (line 48) — before `executor()`, run governance for governance-relevant requests and fold a `block` / `approval_required` outcome into the existing enforcement decision.
- **AUDIT LEDGER (corrected — read the code):** `executeWithEnforcement` → `enforceAgentAction()` (`src/security/permissions/enforcement-engine.ts`) writes its audit via **`logAgentActionAudit()` in `src/security/permissions/audit-logger.ts`** (appends to `logs/security/agent-action-audit.jsonl` AND `defaultAuditStore` from `src/security/audit/persistent-audit-store.js`). Governance decisions folded into enforcement MUST land in THAT ledger (the one this path already writes), carrying the same `auditId`. Do NOT target `src/control-plane/run-registry/run-audit-log.ts` (`logAuditEvent` → `logs/control-audit.jsonl`) — that is a separate run-state-transition ledger keyed by `runId`, not the ledger `executeWithEnforcement` populates. Today governance only fire-and-forgets to the attribution ledger via `emitGovernanceEvent()`; the gap is making it land in the enforcement audit too.
- Data shape: reuse `GovernanceResult` (`src/governance/governance-types.ts`: `overall: 'pass'|'warn'|'block'|'approval_required'`, `blockedReasons: string[]`, `warnings: string[]`, `requiresApproval: boolean`) mapped onto the existing enforcement decision union (`allow | require_approval | block` — see `EnforcementDecision` / `EnforcementResult` in `enforcement-engine.ts`).
- Acceptance (governance-unification intent; mirrors Coverage Index L10 "Remaining gap" text): a governance-blocked content/offer action surfaces as an enforcement `block` carrying an `auditId` present in the enforcement audit (`logs/security/agent-action-audit.jsonl` / `defaultAuditStore`), not only in the attribution log; `executeWithEnforcement` remains the only authority; no governance bypass path is introduced; existing app-layer `evaluateGovernance` calls (offer-engine:109, content-engine:122 & :210, lead-to-offer.workflow:192) still function with no double-block regression — verified by `tests/governance/governance.test.ts`.

**Phase C — L13 external tool/API spend + ROI surface (deferred)**
- Extend the Phase-A ledger schema with a `source` discriminator (`model | tool | api`) and a `vendor` field; add per-tenant rollup read; expose a dashboard panel reading `runtime/observability/token-spend.jsonl`. No new external integration required for the ledger itself.
- Acceptance (mirrors Coverage Index L13 narrowed-Missing items (b)+(e)): dashboard renders per-run and per-tenant spend from the local JSONL ledger; alert threshold is a policy value (file-backed under `runtime/policies/`), not a hardcoded constant.

---

### Rebuild-risk guardrails (carry into any implementation)

- DO NOT rebuild governance policy evaluation — brand-voice/legal/sop/offer/agent-behavior engines already exist in `src/governance/` and already read the policy JSON (e.g. `brand-voice-policy.ts` calls `loadPolicy("brand-voice.policy.json")`). The only legitimate work is WIRING (unify with `executeWithEnforcement` / surface to dashboard), not re-authoring policy engines.
- DO NOT rebuild token cost capture — `recordTokenUsage` / `enforceTokenBudgetPolicy` already compute and enforce token cost. Extend with persistence + tool/API spend; do not replace.
- DO NOT introduce a new top-level layer or cloud/secret-dependent store. Persistence for token telemetry and unified governance audit must be local-first / file-backed under `runtime/` or `logs/` (matching existing JSONL ledgers).
- DO NOT bypass `executeWithEnforcement`. Any governance unification must extend it or report into the same enforcement audit ledger it already writes (`audit-logger.ts` → `logs/security/agent-action-audit.jsonl` + `defaultAuditStore`), never create a second authority.

