# AJ Digital OS — Master Architecture Schema
**Version:** 1.0  
**Updated:** 2026-04-24  
**Owner:** AJ DIGITAL LLC  
**Source of Truth:** This document supersedes all partial architecture notes.

---

## 0. System Definition

**AJ Digital OS = Applied Intelligent Systems for Business Operations**

A modular AI operating system that diagnosing and closes the value leaks most businesses have across:
marketing, business intelligence, R&D, customer service, sales, operations, automation, and client delivery.

Core thesis: Businesses leak value because their data, workflows, decisions, and feedback loops are fragmented.
AJ Digital OS reduces prediction error by stacking meaningful data points across the business, then deploying
structured agents to execute at the speed of software.

**Operating doctrine:**
> Signal > Noise. Systems > Hacks. Data before automation. Attribution or it didn't happen.
> AI explores ambiguity. Scripts execute repetition. Humans govern risk. Attribution measures truth.

---

## 1. Core Philosophy

| Principle | Application |
|-----------|-------------|
| Signal > Noise | Only ingest structured, validated data |
| Prediction error reduction | Track expected vs actual across all agent outputs |
| Deterministic before dynamic | Script known flows; use AI only for ambiguity and supervision |
| Attribution or it didn't happen | Every agent action ties to a measurable business outcome |
| Compounding IP | Every successful execution converts into a reusable skill or workflow |

---

## 2. Full System Layer Map

```
[INPUT LAYER]               ← Forms, webhooks, browser agent, CRM, APIs, voice
        ↓
[DATA STRUCTURE LAYER]      ← Schema registry, normalizers, Zod validators, Neon/Supabase
        ↓
[INTELLIGENCE LAYER]        ← Scoring engines, AIS reasoning, prediction error, signal/noise
        ↓
[AGENT EXECUTION LAYER]     ← Orchestrator, context-loader, approval, execution, publisher
        ↓
[BROWSER EXECUTION LAYER]   ← BEL — controlled browser automation for UI-only workflows
        ↓
[AUTOMATION LAYER]          ← Hermes scheduler, n8n workflows, deterministic scripts
        ↓
[INTERFACE LAYER]           ← CLI operator surface, web shell, Next.js dashboard (planned)
        ↓
[ATTRIBUTION / ROI LAYER]   ← Lead source tracking, revenue per workflow, cost per output
        ↓
[FEEDBACK LOOP LAYER]       ← Memory runtime, pattern extraction, scoring iteration
        ↓
[GUARDRAILS LAYER]          ← Security, policy gates, brand voice, compliance checks
        ↓
[OFFER ENGINE LAYER]        ← AI readiness scoring, offer routing, Stripe billing
        ↓
[MODULE LAYER]              ← SEO/AEO, content, lead gen, voice agent, CRM intelligence
        ↓
[INFRASTRUCTURE LAYER]      ← Node.js, Neon, Supabase, Ollama, Cloudflare, Telegram, Docker
```


---

## 3. Layer Completion Scoring

**Scale:**
- 0–20% = Concept only | 21–40% = Defined | 41–60% = Partial | 61–80% = Functional | 81–95% = Production-ready | 96–100% = Optimized

| Layer | % | Status | What Exists | What's Missing | Risk | Next Action |
|-------|---|--------|-------------|----------------|------|-------------|
| 1. Input / Data Ingestion | 40% | Partial | Browser agent (Playwright, 14 files), webhook handlers (approval + execution), n8n client | Forms, CRM sync, voice agent, manual ops entry | Medium | Add structured form ingestion endpoint |
| 2. Data Structure | 70% | Functional | 20+ Zod schemas, Neon schema (runs/steps/observations/failures/patterns), Supabase schema, run/workflow/brand/content/memory types | Schema auto-validation on ingestion, data versioning | Low | Add ingestion-time validation middleware |
| 3. Intelligence / Scoring | 50% | Partial | Agent execution scoring (signal/noise, prediction error), AIS foundational layer (9 tests), Prometheus metrics | AEO opportunity scoring formula, keyword/intent scoring, business signal aggregation | High | Build `opportunity-scorer.ts` with Bible v1 weighted formula |
| 4. Agent Execution | 55% | Partial | Orchestrator, context-loader, approval, execution, publisher (5 core agents); planner/executor/monitor/validator role system; 10 real run records | Research, strategy, content, distribution, sales, ops agents | Medium | Add research + content agents next |
| 5. Browser Execution (BEL) | 45% | Partial | bel-controller, session-manager, task-runner, bel-types; MCP tools (browser/filesystem/shell); MCP policy, bridge, logger, task-classifier | BEL v3: execution planner, runtime, state store, tool registry, persistent JSONL logs, retry/escalation, capability discovery | High | Implement BEL v3 per spec |
| 6. Automation (Hermes/n8n) | 60% | Functional | Hermes scheduler (7 missions, failure watcher, status API); n8n client + 3 workflow JSONs; n8n trigger commands | n8n server not running in stack; Hermes ↔ n8n handoff not wired | Medium | Decide: Hermes-first or integrate n8n server |
| 7. Interface | 40% | Partial | 50+ CLI commands (full operator surface); local web shell (ui-start); brand/skill/model selection | Next.js admin dashboard; agent control panel; client portal | High | Scaffold Next.js dashboard using existing read models |
| 8. Attribution / ROI | 25% | Defined | Distribution metrics (`distribution-metrics.ts`), attribution schema in run record, BEL attribution event spec | Lead-to-revenue tracking, ROI per workflow/agent/content, real data flowing | High | Wire attribution recording to orchestrator + publisher |
| 9. Feedback Loop | 55% | Partial | Memory runtime (beforeRun/afterRun/onFailure hooks), retrieval policy (12K budget, 4 slots), Hermes pattern extraction (daily), prediction error gauge | Formal compare-vs-prediction loop, scoring adjustment automation | Medium | Wire prediction-error feedback into scoring update path |
| 10. Guardrails | 65% | Functional | HMAC webhook security, replay protection, timing-safe compare, BEL policy engine, MCP policy, Zod validation at all boundaries | Brand voice runtime enforcement, content compliance filter, output quality gate | Medium | Add brand voice check to content agent output path |
| 11. Offer Engine | 30% | Defined | Stripe checkout (3 tiers), HMAC webhook verification, Supabase provisioning stub | AI readiness scoring algorithm, qualification framework (80/50 threshold), offer routing | High | Build readiness scorer tied to lead intake |
| 12. Module Layer | 30% | Defined | 5 skill markdown files (SEO, lead-gen, transcript, blog, publish-to-sanity); skill loader/executor/registry | SEO/AEO execution engine, lead gen pipeline, voice agent, CRM intelligence layer | Medium | Activate skills as real executable modules vs markdown only |
| 13. Infrastructure | 75% | Functional | Node.js CLI ✅, Neon/Postgres ✅, Supabase ✅, Ollama ✅, OpenAI/Anthropic ✅, Cloudflare R2 client ✅, Telegram control plane ✅, Docker + Prometheus/Grafana ✅ | Next.js frontend, n8n server deployment, Windows path portability (PR-04) | Medium | Fix Windows paths; containerize app baseline |


---

## 4. System-Level Readiness Score

| Weight | Layer | Layer % | Contribution |
|--------|-------|---------|-------------|
| 15% | Data Schema Layer | 70% | 10.5% |
| 15% | Data Pipeline Layer (Input + BEL) | 42% | 6.3% |
| 15% | Agent Execution Layer | 55% | 8.25% |
| 10% | Intelligence Layer | 50% | 5.0% |
| 10% | Attribution / ROI Layer | 25% | 2.5% |
| 10% | Feedback Loop Layer | 55% | 5.5% |
| 15% | Business Ops (Modules + Offer Engine + Interface) | 33% | 5.0% |
| 10% | Infrastructure / Control (Infra + Guardrails + Automation) | 67% | 6.7% |
| **100%** | **TOTAL** | | **49.75%** |

### **System Readiness: ~50% — Experimental**

| Threshold | Status |
|-----------|--------|
| < 50% | Not deployable |
| 50–70% | **Experimental** ← You are here |
| 70–85% | Early production |
| 85–95% | Production-ready |
| 95%+ | Scalable system |

**What "Experimental" means:** The engine is real and technically sound. The security layer is production-grade.
The gap is business-logic completeness — the intelligence scoring, attribution, and domain agent layers are defined
but not fully executing. You can run internal workflows. You cannot confidently deploy to clients yet.

**Path to Early Production (70%):** Close the Attribution layer (+15% impact), complete BEL v3 (+5%), scaffold the
Next.js dashboard (+5%), and wire the AEO scoring engine (+5%). That's the fastest 20% gain.

---

## 5. Critical Path to +20% Readiness

### Blocking Layers (preventing deployment)

1. **Attribution / ROI (25%)** — No lead-to-revenue data flows. Cannot prove system value to clients.
2. **Browser Execution Layer / BEL v3 (45%)** — Execution planner and runtime missing. BEL can be called but cannot plan and execute multi-step jobs.
3. **Interface Layer (40%)** — No client-facing dashboard. All value is locked behind CLI.

### Fastest Path to +20% System Readiness

| Build | Readiness Gain | Effort |
|-------|---------------|--------|
| BEL v3 (execution planner + runtime + state store) | +8% | Medium — spec is complete, use Copilot execution prompt |
| Attribution event pipeline (orchestrator → publisher → Neon) | +7% | Medium — Neon schema exists, add recording calls |
| Next.js dashboard scaffold (3 views: dashboard, runs, deliverables) | +5% | Medium — read models already exist |
| AEO/opportunity scoring formula | +5% | Low — formula defined, build one file |

### Highest ROI Next Implementation

**BEL v3** is the highest ROI because it:
- Unlocks the entire browser-based workflow library
- Converts one-time AI exploration into reusable deterministic skills
- Enables lead capture, social ops, QA, and client portal automation
- Has a complete Copilot execution prompt ready in `BEL_V3_AUTONOMOUS_EXECUTION_RUNTIME.md`


---

## 6. BEL Architecture (Browser Execution Layer)

BEL is the bridge between agent reasoning and real-world browser execution. It sits between the agent layer and the automation layer.

### BEL Version Progression

| Version | Status | What It Adds |
|---------|--------|-------------|
| BEL v1 (Spec) | ✅ Defined | 3-mode model (exploratory/deterministic/supervisor), skill registry design, API design, use cases |
| BEL v2 (Production Implementation) | ✅ Defined | FastAPI Python service spec, Telegram control commands, n8n integration, DB tables |
| BEL v3 (Autonomous Execution Runtime) | 🔧 Partial | TypeScript execution layer scaffolded (bel-controller, session-manager, task-runner, mcp-tools); missing planner/runtime/state/retry/escalation |
| BEL v4 (Skill Capture + Workflow Compiler) | ❌ Planned | Convert successful executions → reusable skill YAML → Hermes/n8n workflow |

### BEL Three-Mode Execution Model

| Mode | Purpose | When Used | Executor |
|------|---------|-----------|----------|
| Explore | AI learns a new workflow | First time on unknown platform | LLM + browser-use |
| Script | Repeatable deterministic execution | Known, stable workflows | Python/CLI/n8n |
| Supervisor | Handle failures in script mode | Element drift, auth expiry, CAPTCHA | LLM + escalation |

**Correct pattern:**
```
LLM discovers → script performs → LLM supervises → human resolves exceptions
```

### BEL v3 Files Required (Next Build)

```
CREATE:
  src/bel/bel-execution-planner.ts     — Convert task to structured tool call plan
  src/bel/bel-execution-runtime.ts     — Execute plan steps with policy + retry
  src/bel/bel-result-normalizer.ts     — Normalize all tool outputs to one shape
  src/bel/bel-state-store.ts           — Persist execution state to runtime/bel-state.json
  src/bel/bel-retry-policy.ts          — Max 3 attempts, transient errors only
  src/bel/bel-escalation.ts            — Structured escalation object (→ Telegram later)
  src/bel/bel-capabilities.ts          — GET /bel/capabilities endpoint
  src/mcp/mcp-tool-registry.ts         — Explicit tool registration + capability discovery
  src/mcp/mcp-tools/index.ts           — Tool barrel
  src/scripts/test-bel-v3.ts           — 10-case smoke test

MODIFY:
  src/bel/bel-types.ts                 — Add BelExecutionMode, BelExecutionPlan, BelNormalizedResult
  src/bel/bel-session-manager.ts       — Persist sessions to runtime/bel-sessions.json
  src/bel/bel-task-runner.ts           — Use execution runtime
  src/bel/bel-controller.ts            — Wire planner + runtime
  src/mcp/mcp-logger.ts                — Write JSONL to logs/bel-execution.log
  src/mcp/mcp-tools/browser-tool.ts    — Enforce --session <sessionName> on all commands
  src/hermes/hermes-status-api.ts      — Add GET /bel/capabilities, GET /bel/logs
```

---

## 7. Agent Execution Model

### Core Agents (Built)
| Agent | File | Responsibility |
|-------|------|----------------|
| Orchestrator | `agents/orchestrator.agent.ts` | Load context, execute workflow, validate, request approval |
| Context Loader | `agents/context-loader.agent.ts` | Assemble client + project context |
| Approval | `agents/approval.agent.ts` | Format approval packets, send via Telegram |
| Execution | `agents/execution.agent.ts` | Enforce approval gate, route to publisher |
| Publisher | `agents/publisher.agent.ts` | Write artifacts, mark run executed |

### Role System (Built)
| Role | Handler | Responsibility |
|------|---------|----------------|
| Planner | `agent-roles/handlers/planner-handler.ts` | Interpret objective, select execution mode |
| Executor | `agent-roles/handlers/executor-handler.ts` | Perform task actions |
| Monitor | `agent-roles/handlers/monitor-handler.ts` | Track progress, detect anomalies |
| Validator | `agent-roles/handlers/validator-handler.ts` | Verify outputs meet contract |

### Domain Agents (Missing — Next Build Priority)
| Agent | Purpose | Status |
|-------|---------|--------|
| Research Agent | SERP data, keyword research, competitor analysis | ❌ |
| Strategy Agent | Opportunity scoring, content planning | ❌ |
| Content Agent | AEO-optimized content generation | ❌ |
| Distribution Agent | Push content to Sanity/Cloudflare/social | ❌ |
| Sales Agent | Lead qualification, CRM updates | ❌ |
| Operations Agent | Task coordination, client reporting | ❌ |


---

## 8. Intelligence Layer Architecture

### Built (Functional)
- **Agent Execution Scoring** (`intelligence/intelligence-engine.ts`): Records agent runs, calculates prediction error and signal/noise ratio, ranks agents, exposes snapshots. Wired to Prometheus.
- **AIS Foundational Layer** (`intelligence-layer/`): Structural reducer, archetype library, prediction error module, token governance. 9 tests passing.
- **Memory Runtime** (`memory-runtime/`): `beforeRun` retrieval, `afterRun` persistence, `onFailure` recording. 4-slot retrieval policy with 12K total char budget.
- **Semantic Memory** (`memory/`): Local embedding service, memory indexer/retriever/store. Deterministic (keyword-based, not vector).

### Scoring Formula (Spec — NOT YET BUILT)
From Bible v1:
```
opportunity_score =
  (search_volume    × 0.30) +
  (difficulty_inv   × 0.30) +
  (intent_score     × 0.20) +
  (local_relevance  × 0.10) +
  (aeo_score        × 0.10)
```

**Build target:** `src/intelligence/opportunity-scorer.ts`
- Inputs: keyword data, search volume, competition, intent classification, local signals
- Output: scored opportunity with priority tier (A/B/C) and recommended execution path
- Ties into: research agent output → content agent input → attribution tracking

---

## 9. Data Schema Overview

### Core Runtime Schemas (Zod-validated)
```
run.schema.ts           — Run lifecycle record (status, approval, workflow output)
workflow-result.schema.ts — Typed workflow output (assets, warnings, summary)
content-asset.schema.ts — Title, outline, draft, CTA, SEO notes, hook set
brand-dna.schema.ts     — Voice, tone, audience, positioning, writing rules
context-bundle.schema.ts — Runtime context assembled per run
approval-packet.schema.ts — Human approval request payload
validation-report.schema.ts — Validator check results
webhook-auth.schema.ts  — HMAC header validation
memory-chunk.schema.ts  — Semantic memory unit
deliverable.schema.ts   — Deliverable lifecycle record
```

### Database Schemas
```
Neon (Postgres — AI execution data):
  runs, steps, observations, failures, patterns, repair_events

Supabase (SaaS multi-tenant):
  clients, subscriptions, stripe_events, onboarding_profiles

BEL (planned addition to Neon):
  bel_tasks, bel_sessions, bel_events, bel_skills, bel_skill_patches
```

---

## 10. Local vs Remote Execution Model

| Component | Local (Current) | Remote (Planned) |
|-----------|----------------|------------------|
| AI model | Ollama (gemma3:1b / llama3.1:8b) | OpenAI / Anthropic API (routed by model-router) |
| Browser execution | Local Playwright | Containerized Playwright workers |
| State storage | File-based (data/runs/, data/memory/) | Neon + Supabase (partially wired) |
| Queue | Hermes in-process scheduler | Redis/BullMQ (planned) |
| Object storage | Local filesystem | Cloudflare R2 (client built, not activated) |
| Secrets | .env file | Doppler / Cloudflare Secrets (planned) |
| Control surface | CLI + Telegram + local web shell | Next.js dashboard + Telegram |

**Provider routing is live:** `src/model-routing/model-router.ts` dispatches to Ollama (local), OpenAI, Anthropic, Perplexity, LM Studio, or deterministic based on task constraints.

---

## 11. MCP / ACP Integration Model

```
ACP (Agent Control/Session Layer) — controls agent sessions and mission lifecycle
  ↓
MCP (Tool Connection Layer) — exposes browser, filesystem, shell tools
  ↓
BEL (Browser Execution Layer) — executes browser-based workflows
  ↓
n8n (Workflow Orchestration) — scheduled and event-driven automation
  ↓
Telegram (Human Control Layer) — approval, escalation, operator commands
```

### Current MCP Implementation (TypeScript)
- `mcp-bridge.ts` — Routes tool calls
- `mcp-execution-adapter.ts` — Adapts tool results
- `mcp-policy.ts` — Enforces tool permissions
- `mcp-task-classifier.ts` — Maps tasks to tools
- `mcp-logger.ts` — Ring-buffer log (upgrade to JSONL in BEL v3)
- Tools: `browser-tool.ts`, `filesystem-tool.ts`, `shell-tool.ts`


---

## 12. Feedback Loop Architecture

```
[Agent Execution]
      ↓
[afterRun hook]       → Persist run log + working context
      ↓
[onFailure hook]      → Record failure + mistake context
      ↓
[Hermes: score-recent-runs (1h)]   → Score unscored mission runs against predictions
      ↓
[Hermes: compute-intelligence (24h)] → Aggregate agent performance, update intelligence snapshot
      ↓
[Hermes: extract-patterns (24h)]   → Identify success/failure patterns, update pattern store
      ↓
[Memory retrieval (beforeRun)]     → Inject working context + last run + failure state into next run
      ↓
[Prediction error gauge]           → Feed back into intelligence engine for signal scoring
```

**Current gap:** The loop is in place but the scoring adjustment is not automatic. Pattern extraction runs but
does not yet modify opportunity scoring weights. This is the key connection to close for Phase 2 intelligence.

---

## 13. Attribution and ROI Tracking

### Spec (from Bible v1)
```json
{
  "lead_id": "",
  "source": "organic | paid | referral",
  "touchpoints": [],
  "conversion_value": 0,
  "attribution_score": {}
}
```

**Target outputs:**
- ROI per system
- ROI per agent
- ROI per content piece
- Cost per execution (LLM tokens + browser minutes + human minutes saved)

### Current State
- Attribution schema exists in run record (`runId`, `publishedPath`, `workflowResult`)
- BEL attribution event spec defined in BEL v1 spec (not yet emitted)
- Distribution metrics file exists (`services/distribution-metrics.ts`)
- **No actual lead-to-revenue data flows yet**

### Build Target
1. Add `attribution_event` emission to orchestrator on run creation
2. Add `touchpoint` recording to approval resolver and publisher
3. Add `attribution-report` CLI command reading from Neon `runs` + `patterns` tables
4. Wire BEL task completion to attribution event payload

---

## 14. Client Deployment Model

### Current (Internal / AJ Digital)
- CLI operator interface: all system control from terminal
- Telegram control plane: approval, escalation, status from mobile
- Local web shell: basic chat + run management interface
- Ollama local AI: gemma3:1b as live model

### Target (SaaS Client Deployment)
- Stripe checkout: 3 tiers (standard / professional / enterprise) — **BUILT**
- Supabase multi-tenant: client isolation, subscription tracking — **BUILT (schema)**
- Next.js admin dashboard: client-facing run management — **NOT BUILT**
- Client portal: client access to their deliverables — **NOT BUILT**
- Containerized workers: isolated browser/agent execution per client — **PLANNED**
- Cloudflare R2: artifact storage per client — **CLIENT BUILT, not activated**

---

## 15. Build Phase Roadmap

### Phase 1 — Foundation (Target: ~75% → Close to 100%)
- [x] Schema layer (Zod, Neon, Supabase)
- [x] Run lifecycle state machine
- [x] Core agents (orchestrator, context-loader, approval, execution, publisher)
- [x] Webhook security (HMAC, replay protection)
- [x] CLI operator surface (50+ commands)
- [x] Memory system (retrieval, hooks)
- [x] BEL v1-v2 TypeScript scaffold
- [ ] **BEL v3 (execution planner + runtime)**
- [ ] **Next.js admin dashboard (3 views minimum)**
- [ ] **ESLint config + CI gates fully wired**
- [ ] **Windows path portability (PR-04 from hardening plan)**

### Phase 2 — Intelligence (Current: ~35%)
- [ ] AEO/opportunity scoring engine
- [ ] Research agent + content agent
- [ ] Attribution event pipeline wired
- [ ] Pattern extraction feeding scoring weights
- [ ] Semantic memory upgrade to vector embeddings

### Phase 3 — Scale (Current: ~20%)
- [ ] Multi-agent orchestration (parallel execution)
- [ ] Client portal (Next.js)
- [ ] n8n server deployment + task ingestion workflow
- [ ] BEL v4 (skill capture + workflow compiler)
- [ ] Distribution agent (Sanity, Cloudflare)

### Phase 4 — Platform (Current: ~25%)
- [ ] Multi-tenant client isolation (Supabase)
- [ ] Containerized browser workers
- [ ] External API surface
- [ ] Skill marketplace / internal library
- [ ] SaaS onboarding flow (Stripe → Supabase → provisioning)

---

## 16. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Multi-AI coordination drift (Copilot + Codex + Claude) | High | Define per-AI ownership zones; version spec docs |
| Ollama model capacity (gemma3:1b too small) | High | Route complex tasks to OpenAI/Anthropic via model-router |
| BEL browser-use CLI dependency (external tool) | Medium | Validate CLI presence in healthcheck; fallback to Playwright direct |
| Windows path hardcoding | Medium | Implement PR-04 runtime-paths.ts helper |
| `dist/` committed to git | Medium | Gitignore dist/, build in CI |
| No attribution data flowing | High | Wire emission calls in next sprint |
| n8n spec'd but not deployed | Medium | Commit: Hermes-first or wire n8n server |
| UI broken = no client demos | High | Build Next.js dashboard scaffold immediately |
