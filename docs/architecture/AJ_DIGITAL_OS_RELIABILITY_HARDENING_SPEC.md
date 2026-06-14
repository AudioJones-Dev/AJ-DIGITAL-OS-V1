# AJ Digital OS — Reliability Hardening Spec (Evaluation, Cost Control, Memory Integrity, Governance Completion)

**Version:** 0.1 (Draft — Git Spec candidate)
**Date:** June 13, 2026
**Owner:** AJ Digital LLC (Audio / Tyrone Alexander Nelms)
**Status:** 📋 Planned — awaiting `proceed` to convert to per-gap build charters
**Canonical References:**
- [AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md](./AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md)
- [AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md](./AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md)
- [../IMPLEMENTATION_GATES.md](../IMPLEMENTATION_GATES.md) · [../OPERATING_POLICY.md](../OPERATING_POLICY.md) · [../dmaic-gate.md](../dmaic-gate.md)

> **What this spec is.** A gap-closure delta against the existing 16-layer architecture. It does **not** introduce new top-level layers and does **not** restate layers already specced. It hardens four existing layers (L6, L10, L13, L15) plus one enforcement path in L2, targeting the failure modes the field is actually hitting in 2026.

---

## 0. Why now (evidence base)

This spec is grounded in two inputs: (a) the AJ Digital OS Layer Coverage Index (internal source of truth), and (b) a 30-day scan of community/engineering signal (Hacker News, web, archived in `~/Documents/Last30Days/agentic-operating-system-raw-v3.md`). The 2026 signal is consistent: agentic systems fail on the **control plane**, not on model capability.

| External finding (last 30 days) | Source | Maps to internal gap |
|---|---|---|
| Highest-upvoted agent thread of the window: an AI agent **bankrupted its operator** while scanning DN42 (no spend cap) | HN 1,434 pts | G2 Cost ceiling |
| Guardrails took an 8B model from **53% → 99%** on agentic tasks — constrain, don't coax | HN 687 pts (Forge) | G1 Evaluation + G4 Governance |
| ~**89%** of teams have observability, only ~**52%** run real evals; failures live in that gap | Towards AI, 2026 | G1 Evaluation |
| "Memory hallucination" (stale/conflicting recall stated confidently) is the **#1 production failure** | mem0 State of Agent Memory 2026 | G3 Memory integrity |
| A **€0.01 transfer** can compromise a banking agent; no standard authorization at the tool-call boundary | HN 208 pts; OWASP Agent Security 2026 | G4 Governance |
| Human-in-the-loop is degrading into **"permission fatigue"** | HN 386 pts | G4 Governance (escalation design) |
| **Tokenomics** of agentic software engineering is now a tracked metric | HN 173 pts | G2 Cost metering |

**Fact / inference labeling (per OPERATING_POLICY):**
- *Fact:* The Coverage Index lists L15 Optimization as `📋 Planned` and L13 as missing "cost tracking per run, tool/API spend."
- *Fact:* The L15 Optimization Loop in the Layer Model Spec names `Evaluate` as a required step (`Execute → Observe → Attribute → Evaluate → Optimize → Redeploy`).
- *Inference:* Because `Evaluate` has no implementing module and no spec, the optimization loop and L16 Business Outcome reporting cannot close. Evaluation is therefore the highest-leverage missing capability.
- *Assumption:* File-backed local-first storage is acceptable for v0.1 of each capability, with the documented Neon/Redis migration path applied later (consistent with the Coverage Index migration table).

---

## 1. Problem

The OS can **execute** (L2, L8 ✅), **attribute** (L14 ✅), and **observe** (L13 🔶), but it cannot yet **judge its own output, cap its own spend, trust its own memory, or block a non-compliant claim**. Specifically:

1. **No evaluation capability.** Nothing measures whether a run produced a *correct/acceptable* result across runs, query types, or time. The `Evaluate` step of the L15 loop is unbuilt. Without it, L15 Optimization and L16 Business Outcome (ROI claims) are unprovable.
2. **No cost ceiling.** L2 gates *risk* but not *spend*. There is no per-run or per-tenant budget that hard-stops a runaway agent. This is the exact DN42 failure mode.
3. **Memory has no integrity rules.** L6 stores and stitches memory but has no freshness/decay/conflict-resolution policy, so stale or contradicting context can be recalled and stated as fact.
4. **Governance is incomplete at the highest-risk boundary.** L10 lists Legal/Claims/Compliance governance as components, but the Coverage Index confirms those policy files are missing. For an accessibility / home-modification vertical (ADA-adjacent, financial adjacency via platform lifts), claims and money/comms boundaries are non-negotiable.

---

## 2. Desired outcome

A run cannot complete without being **scored, budgeted, memory-checked, and claim-checked**, with every result tied to a measurable business outcome (L16). Concretely:

- Every run emits an **evaluation verdict** (pass / fail / needs-review) against a defined rubric, persisted and queryable.
- Every run executes under a **hard cost ceiling** with an audit trail of spend per run and per tenant.
- Memory recall is **freshness- and conflict-aware**; stale or contradicting items are demoted or flagged, never silently authoritative.
- Outbound **claims and money/comms actions** pass an L10 policy check wired into the existing `executeWithEnforcement()` path before they fire.

---

## 3. Success criteria (measurable)

| Gap | Criterion | Measure |
|---|---|---|
| G1 Evaluation | Eval verdict attached to ≥95% of runs | `runs_with_eval / total_runs` from event ledger |
| G1 Evaluation | A golden set of ≥20 reference cases per active engine, scored on every release | golden-set file count + CI eval run |
| G2 Cost ceiling | 0 runs exceed configured per-run budget without an explicit override | enforcement audit: `cost_ceiling_breaches = 0` |
| G2 Cost metering | Cost per run + tool/API spend recorded for 100% of runs | L13 metrics completeness |
| G3 Memory integrity | Recall results carry a freshness score; conflicting items flagged | retrieval metadata field present 100% |
| G3 Memory integrity | 0 silently-authoritative stale items in stitched bundle (staleness > threshold demoted) | stitch-bundle metadata audit |
| G4 Governance | Claims/legal policy file exists and is evaluated on every outbound deliverable | policy hit logged per deliverable |
| G4 Governance | Money/comms actions require human approval by default | approval-gate policy coverage |

---

## 4. Scope

In scope for this spec (delta only):

- **G1 — Evaluation discipline (L15 `Evaluate` step).** Rubric model, golden-set store, per-run eval verdict, cross-run reliability rollup, CI eval command. Builds on L13 Observability + L14 Attribution.
- **G2 — Cost metering + ceiling (L13 + L2).** Cost event capture (tokens, tool/API spend) into the event ledger; a budget policy (`runtime/policies/cost-ceiling.policy.json`) evaluated inside the existing enforcement engine.
- **G3 — Memory integrity (L6).** Freshness/recency weighting, decay/TTL on recall, conflict detection, and source-precedence rules layered onto the existing CAG/RAG + stitcher — without adding a cloud vector DB.
- **G4 — Governance completion (L10 + L2 path).** Claims/legal/compliance policy files and a claims-check wired into `executeWithEnforcement()`; default human-approval gate at money/comms boundaries; least-privilege review of tool permissions.

## 5. Out of scope

- New top-level layers (the 16-layer model stands).
- Cloud vector databases, external embedding services, semantic reranking APIs (consistent with the memory specs' Out of Scope).
- Multi-agent / A2A / ACP interoperability — protocols are converging under the Linux Foundation but are not mature; defer until a real second agent exists.
- Any UI build beyond a thin read-only panel; UI work proceeds against stable placeholder contracts only.
- Secret-dependent integrations (MailerLite, ImageKit, Whop, Doppler, GCP) — remain deferred.
- LLM-as-judge calling a paid provider in v0.1 (start deterministic/rubric-based; provider-judge is a later, gated option).

## 6. Constraints

- **No hardcoded secrets, ever.** All new config via typed config + `.env.example`; graceful missing-env handling.
- **Firebase must not be reintroduced.** Storage stays local-first (file-backed) with the documented Neon/Redis migration path.
- **Local-first.** v0.1 of each capability is file-backed under `runtime/` or `data/`, matching existing conventions.
- **Preserve existing architecture.** No breaking API changes; the enforcement engine `executeWithEnforcement()` remains the single control authority — new checks extend it, they do not bypass it.
- **Documentation-first.** This spec → validation → per-gap charter → build, per DMAIC gate and Implementation Gates.
- **No destructive refactors without approval.** Each gap is additive.

## 7. Existing assets / prior work to inspect (do NOT rebuild)

| Asset | Layer | Reuse for |
|---|---|---|
| `src/security/permissions/enforced-execution.ts` (`executeWithEnforcement()`) | L2 | G2 cost-ceiling hook, G4 claims-check hook |
| `src/core/policy/policy-engine.ts` · `policy-loader.ts` · `runtime/policies/*.policy.json` | L2/L10 | G2 + G4 policy-as-code (add `cost-ceiling`, `claims`, `legal` policies) |
| `src/security/approvals/approval-service.ts` · `approval-gates.policy.json` | L2 | G4 money/comms approval gate |
| `src/core/events/event-ledger.ts` · `src/core/observability/metrics-store.ts` | L13 | G2 cost events + G1 eval verdict persistence |
| `src/attribution/attribution-tracker.ts` · `map-validator.ts` | L14 | G1 link eval verdicts to MAP outcomes |
| `src/decision/decision-engine.ts` (MAP-CERA) | L7/L15 | G1 — CERA "Evaluate/Refine" is the conceptual home for eval |
| `src/cache/` (CAG) · `src/retrieval/` (RAG) + memory specs | L6 | G3 freshness/decay/conflict extension |
| `semantic-memory-and-retrieval-spec.md` · `conversation-memory-and-context-stitching-spec.md` | L6 | G3 — extend, do not replace |
| `AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` · `_APPROVAL_SYSTEM_SPEC.md` · `_AGENT_PERMISSION_ENFORCEMENT_SPEC.md` · `_MCP_SECURE_EXECUTION_LAYER_SPEC.md` | L2/L10 | G4 — claims/legal sits beside these |

## 8. Proposed plan (phased, gated)

Each phase enters via Implementation Gate 0 (Diagnosis) → Gate 1 (Scope) → Gate 2 (Plan) → Gate 3 (Approval) and ships under the `/goal` protocol with full validation.

**Phase 1 — G1 Evaluation (P1).** Define the eval rubric schema (Zod) and verdict object; add `src/evaluation/` with `eval-runner`, `golden-set-store` (`runtime/evaluation/golden/*.json`), and `eval-verdict` persistence into the event ledger; expose `eval-run` and `eval-stats` CLI; wire a verdict emission point into BEL/DAG completion. Acceptance: every run produces a verdict; golden set runs in CI.

**Phase 2 — G2 Cost metering + ceiling (P1).** Add cost capture (token + tool/API spend) to the event ledger and L13 metrics; add `runtime/policies/cost-ceiling.policy.json` (per-run + per-tenant budgets); evaluate it inside `executeWithEnforcement()` so a breach blocks or requires override. Acceptance: 0 silent budget breaches; cost-per-run on 100% of runs.

**Phase 3 — G3 Memory integrity (P2).** Add freshness/recency scoring and TTL-based decay to retrieval scoring; add conflict detection (contradicting items in the same recall set) and source-precedence (canonical specs > memory > generated) to the stitcher; surface freshness + conflict flags in stitch-bundle metadata and the Memory panel. Acceptance: recall metadata carries freshness; stale items demoted, never silently authoritative.

**Phase 4 — G4 Governance completion (P2).** Author `runtime/policies/claims.policy.json` + `legal.policy.json` (forbidden claims, required disclaimers, money/comms boundary rules); wire a claims/legal check into `executeWithEnforcement()` for outbound deliverables; set human-approval default at money/comms boundaries; run a least-privilege audit of registered tool permissions. Acceptance: claims policy evaluated per deliverable; money/comms actions gated.

**Cross-cutting (Operator step):** update `AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` and `AJ_DIGITAL_OS_MODULE_TRACEABILITY.md` after each phase ships (Coverage Index is a living document — requires operator action, not auto-edit).

## 9. Risks

- **Eval rubric over-fitting.** A thin golden set rewards what's already passing. Mitigation: include adversarial/failure cases; measure across query types and time, not single runs (per Galileo).
- **Cost ceiling false-positives.** Too-tight budgets block legitimate long runs. Mitigation: soft-warn threshold + hard-stop threshold; explicit override path with audit.
- **Memory decay tuning.** Aggressive decay drops still-relevant context; lax decay reintroduces staleness. Mitigation: per-memory-type TTL defaults, recency weighting, operator-tunable.
- **Governance friction → permission fatigue.** Too many approvals trains the operator to rubber-stamp. Mitigation: gate only money/comms/claims boundaries by default; batch low-risk approvals.
- **Scope creep into multi-agent / cloud.** Mitigation: explicit Out of Scope (Section 5); local-first + no-Firebase constraints hold.

## 10. Open questions (need operator decision)

1. **Eval home:** new `src/evaluation/` module, or extend `src/decision/` (CERA already owns "Evaluate/Refine")? *(Recommend: new `src/evaluation/`, referenced by L15.)*
2. **Cost ceiling default:** hard-block on breach, or soft-warn + require override? *(Recommend: soft-warn at 70%, hard-stop at 100% with override.)*
3. **Memory decay model:** fixed TTL per memory type, or recency-weighted cosine score? *(Recommend: recency-weighted score + TTL floor.)*
4. **Claims governance source:** static policy file only, or static + optional LLM-judge later? *(Recommend: static v0.1; LLM-judge as gated v0.2.)*
5. **Build order:** confirm P1 = G1 + G2 first (they unblock L15/L16 reporting and stop spend bleed). Or prioritize G4 first given vertical risk profile?

---

## 11. Decision labels (per IMPLEMENTATION_GATES)

- **Review / Diagnosis:** Gaps mapped to L6/L10/L13/L15 + L2; confirmed against Coverage Index and 30-day evidence.
- **Decision (needs operator):** Open questions 1–5; confirm phase order.
- **Human / Operator step:** Approve build order; update Coverage Index + Module Traceability after each phase.
- **Actionable AI task (on `proceed`):** Convert Phase 1 (G1 Evaluation) into a `/goal` charter with changed-files list, validation (typecheck, lint, build, tests, secret scan, schema validation), and PR.

---

*Draft generated June 13, 2026 from the AJ Digital OS Layer Coverage Index plus a 30-day agentic-engineering signal scan. No code changed. This document is additive and reversible (delete to revert). Convert to build charters only on explicit `proceed`.*
