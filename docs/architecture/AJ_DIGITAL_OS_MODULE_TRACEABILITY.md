# AJ Digital OS — Module Traceability Map

**Version:** 1.0
**Date:** April 25, 2026
**Owner:** AJ Digital LLC
**Status:** Living Document
**Canonical Reference:** [AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md](./AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md)
**Coverage Index:** [AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md](./AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md)

---

## Purpose

This document maps every major source module to its owning OS layer. It is the authoritative traceability record for the AJ Digital OS codebase. Use it to:

- Understand where a module belongs in the architecture
- Identify modules that cross layer boundaries
- Verify that new modules declare proper ownership
- Audit attribution, observability, and test coverage gaps

---

## Module Traceability Table

| Source Path | Layer | Purpose | Key Dependencies | Emits Events | Writes Attribution | Has Tests |
|-------------|-------|---------|-----------------|-------------|-------------------|-----------|
| `src/control-plane/run-registry/control-actions.ts` | L2 | Primary control action executor — all run mutations pass here | enforced-execution, approval-service, attribution-tracker | ✅ audit JSONL | ✅ via emitAttributionEvent | ✅ |
| `src/control-plane/run-registry/run-control-store.ts` | L2 | File-backed run state persistence | node:fs | ❌ | ❌ | ✅ |
| `src/control-plane/run-registry/run-audit-log.ts` | L2, L13 | Enforcement audit JSONL writer | node:fs | ✅ JSONL | ❌ | ✅ |
| `src/control-plane/run-registry/run-control-types.ts` | L2 | Run control types — ControlAction, RunControlState, AuditEvent | — | ❌ | ❌ | ❌ |
| `src/control-plane/run-registry/control-context.ts` | L2 | ControlActionContext type and defaultContext factory | — | ❌ | ❌ | ❌ |
| `src/security/permissions/enforced-execution.ts` | L2, L10 | `executeWithEnforcement()` — core security gate | permission-levels, approval-service | ✅ internal | ❌ | ✅ |
| `src/security/permissions/permission-levels.ts` | L2, L10 | PermissionLevel type, AgentActionRequest | — | ❌ | ❌ | ✅ |
| `src/security/approvals/approval-service.ts` | L2, L10 | Approval creation, pending approval management | approval-types, persistent-approval-store | ✅ | ❌ | ✅ |
| `src/security/approvals/persistent-approval-store.ts` | L2, L10 | File-backed approval record persistence | node:fs | ❌ | ❌ | ✅ |
| `src/security/tenancy/tenant-policy.ts` | L2, L10 | Tenant isolation rules | — | ❌ | ❌ | ✅ |
| `src/security/agents/agent-registry.ts` | L9 | Agent registration and capability lookup | — | ❌ | ❌ | ✅ |
| `src/security/mcp/mcp-secure-executor.ts` | L9 | MCP tool call security wrapper | enforced-execution | ✅ | ❌ | ✅ |
| `src/core/state/run-state-machine.ts` | L2, L8 | Formal state transition validation and enforcement | run-state-types | ❌ | ❌ | ✅ |
| `src/core/state/run-state-types.ts` | L2 | RunState type, VALID_TRANSITIONS map | — | ❌ | ❌ | ❌ |
| `src/core/policy/policy-engine.ts` | L10 | evaluatePolicy, evaluateActionRisk, evaluateTenantBoundary | policy-loader, policy-types | ❌ | ❌ | ✅ |
| `src/core/policy/policy-loader.ts` | L10 | Reads runtime/policies/*.policy.json | node:fs | ❌ | ❌ | ✅ |
| `src/core/policy/policy-types.ts` | L10 | PolicyDecision, PolicyReason, PolicyDocument types | — | ❌ | ❌ | ❌ |
| `src/core/events/event-ledger.ts` | L13 | appendSystemEvent, listSystemEvents, getEventsByRunId/TenantId/Category, replayRunEvents | event-types, node:fs | ✅ system-events.jsonl | ❌ | ✅ |
| `src/core/events/event-types.ts` | L13 | SystemEvent type and category enum | — | ❌ | ❌ | ❌ |
| `src/core/schemas/schema-registry.ts` | L2, L10 | registerSchema, validateSchema, listSchemas, exportJsonSchema | zod | ❌ | ❌ | ✅ |
| `src/core/idempotency/idempotency-store.ts` | L2 | checkIdempotency, recordCommandStart/Success/Failure, purgeExpired | node:crypto, node:fs | ❌ | ❌ | ✅ |
| `src/core/observability/metrics-store.ts` | L13 | incrementMetric, getMetricSnapshot, getRunMetrics, getPolicyMetrics | node:fs | ❌ | ❌ | ✅ |
| `src/core/commands/command-executor.ts` | L2 | executeCommand — full envelope flow: schema → idempotency → policy → handler → event → metrics | schema-registry, idempotency-store, policy-engine, event-ledger, metrics-store | ✅ | ✅ if handler emits | ✅ |
| `src/bel/execution-planner.ts` | L8 | BEL v3 execution plan generation from goal | bel-types, capabilities | ❌ | ❌ | ✅ |
| `src/bel/execution-runtime.ts` | L8, L9 | BEL v3 step execution, retry, escalation | execution-planner, bel-state-store, capabilities | ✅ JSONL | ❌ | ✅ |
| `src/bel/dag/dag-validator.ts` | L8 | DFS cycle detection, orphan/duplicate/edge-ref checks | dag-types | ❌ | ❌ | ✅ |
| `src/bel/dag/dag-runtime.ts` | L8, L9 | createDagRun, getReadyNodes, executeNode, retryNode, skipNode, runDagToCompletion | dag-types, dag-store, dag-attribution, dag-validator | ✅ audit JSONL | ✅ fire-and-forget | ✅ |
| `src/bel/dag/dag-store.ts` | L8, L13 | File-backed DAG run, audit, node output persistence | node:fs | ✅ JSONL | ❌ | ✅ |
| `src/bel/dag/dag-attribution.ts` | L14 | Fire-and-forget MAP attribution for DAG events | attribution-tracker | ❌ | ✅ | ✅ |
| `src/bel/mcp-tool-registry.ts` | L9 | MCP tool registration and lookup | — | ❌ | ❌ | ✅ |
| `src/bel/capabilities.ts` | L9 | Agent capability definitions and validation | — | ❌ | ❌ | ✅ |
| `src/attribution/attribution-tracker.ts` | L14 | emitEvent() — MAP scoring, JSONL write, complianceRate tracking | attribution-types, map-validator | ✅ JSONL | ✅ (is the attribution system) | ✅ |
| `src/attribution/attribution-types.ts` | L14 | AttributionEvent, AttributionEventType | — | ❌ | ❌ | ❌ |
| `src/attribution/map-validator.ts` | L14, L7 | evaluateMAP, filterMAPCompliant, getMAPStats | attribution-types | ❌ | ❌ | ✅ |
| `src/aeo/opportunity-scorer.ts` | L7 | AEO formula: volume×0.30 + difficulty×0.30 + intent×0.20 + local×0.10 + aeo×0.10 | aeo-types | ❌ | ❌ | ✅ |
| `src/aeo/aeo-store.ts` | L7 | File-backed AEO opportunity persistence | node:fs | ❌ | ❌ | ✅ |
| `src/decision/decision-engine.ts` | L7 | calculateMapScore, calculateCeraEfficiencyScore, calculateCompoundScore, evaluateMap, createCeraCycle | decision-types | ❌ | ❌ | ✅ |
| `src/decision/decision-policy.ts` | L7, L10 | Production tenant gate, weak-alignment execution block | decision-types | ❌ | ❌ | ✅ |
| `src/decision/decision-store.ts` | L7, L13 | File-backed evaluation, cycle, and audit JSONL | node:fs | ✅ JSONL | ❌ | ✅ |
| `src/decision/decision-attribution.ts` | L14 | Fire-and-forget MAP attribution for decision events | attribution-tracker | ❌ | ✅ | ✅ |
| `src/cache/cache-store.ts` | L6 | 5-namespace file-backed cache — lookup, write, invalidate, stats | cache-types, cache-policy-engine | ❌ | ❌ | ✅ |
| `src/cache/cache-policy-engine.ts` | L6, L10 | 8 cache decision rules — tenant, env, policy version, formula version, TTL, risk, cross-tenant | cache-types | ❌ | ❌ | ✅ |
| `src/cache/cache-audit-log.ts` | L6, L13 | Cache audit JSONL — hit, miss, stale, blocked, bypass | node:fs | ✅ JSONL | ❌ | ✅ |
| `src/cache/cache-attribution.ts` | L14 | Fire-and-forget MAP attribution for cache events | attribution-tracker | ❌ | ✅ | ✅ |
| `src/cache/cache-aeo-integration.ts` | L6, L7 | AEO scoring wrapped with score-cache | cache-store, aeo/opportunity-scorer | ❌ | ❌ | ✅ |
| `src/cache/cache-bel-integration.ts` | L6, L8 | BEL planning wrapped with plan-cache; beforeNodeExecute/afterNodeComplete hooks | cache-store | ❌ | ❌ | ✅ |
| `src/retrieval/retrieval-store.ts` | L6 | File-backed document, chunk, and trace persistence | node:fs, node:crypto | ✅ JSONL | ❌ | ✅ |
| `src/retrieval/retrieval-ingestor.ts` | L6 | Document ingestion — hash, chunk, store | retrieval-store, retrieval-policy | ❌ | ❌ | ✅ |
| `src/retrieval/retrieval-search.ts` | L6, L7 | Keyword search with word-overlap scoring, tenant filter, trace write | retrieval-store, retrieval-policy | ✅ trace | ❌ | ✅ |
| `src/retrieval/retrieval-context.ts` | L6, L7 | Context pack with citations and source metadata | retrieval-search | ❌ | ❌ | ✅ |
| `src/retrieval/retrieval-policy.ts` | L6, L10 | evaluateRetrievalPolicy, cross-tenant block, namespace access rules | retrieval-types | ❌ | ❌ | ✅ |
| `src/retrieval/retrieval-attribution.ts` | L14 | Fire-and-forget MAP attribution for retrieval events | attribution-tracker | ❌ | ✅ | ✅ |
| `src/hermes/hermes-status-api.ts` | L11 | Hermes HTTP API — all endpoints for Control Plane, BEL, DAG, Cache, Retrieval, Decision, Core | All modules | ❌ | ❌ | ❌ |
| `dashboard/app/` | L11 | Next.js App Router pages | dashboard/lib | ❌ | ❌ | 🔶 |
| `dashboard/components/EnforcementStatus.tsx` | L11, L2 | Run state + enforcement decision panel | control-client, types | ❌ | ❌ | ✅ |
| `dashboard/components/MAPAttribution.tsx` | L11, L14 | Attribution event panel with MAP compliance | types | ❌ | ❌ | ✅ |
| `dashboard/components/AuditTrail.tsx` | L11, L13 | Enforcement audit event table | types | ❌ | ❌ | ✅ |
| `dashboard/components/RunControls.tsx` | L11, L2 | Action buttons with terminal-state disable, approval-pending UI | control-client, api | ❌ | ❌ | ✅ |
| `dashboard/lib/api.ts` | L11 | Hermes API client — getControlRun, controlRunAction, getControlRunAudit | fetch | ❌ | ❌ | ✅ |
| `dashboard/lib/control-client.ts` | L11, L2 | Payload builders, terminal-state gate, enforcement snapshot | types | ❌ | ❌ | ✅ |
| `src/cli.ts` | L11 | CLI entry point — command routing | All commands | ❌ | ❌ | ❌ |
| `src/commands/` (40+ files) | L11 | CLI command modules for all subsystems | All modules | ❌ | ❌ | 🔶 |
| `runtime/policies/*.policy.json` | L10 | Policy definitions — action risk, tenant boundary, environment, approval gates | — | ❌ | ❌ | ✅ (via policy-engine tests) |

---

## Rules for Adding New Modules

Every new module added to AJ Digital OS **must** satisfy all applicable rules below before being committed to main.

### Rule 1 — Declare Layer Ownership

Every new module must declare its owning layer at the top of the file in a JSDoc comment:

```typescript
/**
 * @layer L8 — Orchestration Layer
 * @purpose Workflow dependency resolution and retry coordination
 */
```

Update `AJ_DIGITAL_OS_MODULE_TRACEABILITY.md` with the new row before submitting.

### Rule 2 — Mutating Modules Must Pass Through Control Plane

Any module that modifies run state, agent state, tool execution results, client data, or tenant data must route through `executeWithEnforcement()` or use the `executeCommand()` envelope. Direct state mutation without enforcement is not permitted.

### Rule 3 — Meaningful Business Actions Must Emit Attribution

Any module that takes a meaningful business action — content published, lead scored, offer evaluated, workflow completed, diagnostic run — must call `emitEvent()` from `src/attribution/attribution-tracker.ts`. Attribution must be fire-and-forget and must never throw.

Meaningful is defined by the MAP framework: Meaningful + Actionable + Profitable.

### Rule 4 — Runtime Actions Must Emit Observability Events

Any module that creates, completes, fails, or transitions a run must call `appendSystemEvent()` from `src/core/events/event-ledger.ts`. System events are the canonical runtime record.

### Rule 5 — Agents Must Declare Allowed Tools, Memory Scope, and Approval Requirements

Any new agent must implement the `OSAgent` interface:

```typescript
interface OSAgent {
  id: string;
  name: string;
  role: string;
  allowedActions: string[];
  forbiddenActions: string[];
  requiredTools: string[];
  memoryScope: "none" | "run" | "tenant" | "global";
  approvalRequiredFor: string[];
  outputSchema: unknown;
}
```

Agents may not use tools or access memory outside their declared scope.

### Rule 6 — Workflows Must Declare Linear or DAG

Every workflow must specify its execution model:
- **Linear** → use BEL v3 execution planner
- **Dependency-aware** → use BEL v4 DAG with explicit nodes and edges

Undeclared or implicit prompt chains are not permitted in production workflows.

### Rule 7 — Data Objects Must Map to a Schema Version

Every new data type used in persistence, APIs, or inter-module communication must be registered in the Schema Registry:

```typescript
import { registerSchema } from "../core/schemas/schema-registry.js";
registerSchema("MyObject", "1.0.0", MyObjectSchema);
```

### Rule 8 — Client-Facing Features Must Map to a Business Outcome

Every feature that touches a client tenant must declare which business outcome category it serves:

| Outcome | Description |
|---------|-------------|
| `reduce_spend` | Lowers waste, cost, or operational inefficiency |
| `increase_profit` | Improves revenue, margins, or conversion |
| `reduce_risk` | Prevents compliance, data, or brand failures |
| `increase_signal` | Improves decision quality and reduces prediction error |

---

## Current Architecture Readiness Assessment

### What Is Production-Like

These modules are stable, tested, and behave predictably in local development:

- Control Plane enforcement and state machine
- MAP attribution event emission pipeline
- AEO opportunity scoring (formula-based, file-backed)
- MAP-CERA decision engine (scoring logic, audit, attribution)
- BEL v3 linear execution runtime
- BEL v4 DAG (cycle detection, dependency execution, retry, approval gate)
- Cache Augmentation Layer (all 5 namespaces, 8 policy rules)
- Operational Retrieval Layer (keyword search, context packs, traces)
- Operating Core (state machine, policy engine, idempotency, event ledger, metrics, command envelope)

### What Is Still File-Backed / Prototype

All persistence is file-backed via JSON/JSONL in `runtime/`. This is appropriate for local development and early production. Before scaling to multiple tenants or high request volume, migrate:

| Store | File Path | Migration Target |
|-------|-----------|-----------------|
| Run control | `runtime/control-runs.json` | Neon (Postgres) |
| Approvals | `data/security/approvals.json` | Neon |
| DAG runs | `runtime/dag/dag-runs.json` | Neon |
| Cache namespaces | `runtime/cache/*.json` | Redis |
| Retrieval documents | `runtime/retrieval/documents.json` | Neon |
| Retrieval chunks | `runtime/retrieval/chunks.json` | Neon + pgvector |
| Decision evaluations | `runtime/decision/map-evaluations.json` | Neon |
| Idempotency records | `runtime/idempotency/idempotency-records.json` | Redis |
| System event ledger | `runtime/events/system-events.jsonl` | Event stream or Neon |
| Metrics | `runtime/observability/metrics.json` | Time-series (Prometheus or Neon) |

### What Requires Neon Migration

Priority order for Neon migration:
1. Approval records (already has structured schema)
2. Run control store (most-queried operational data)
3. DAG runs and node outputs
4. Decision evaluations and CERA cycles
5. Retrieval documents and chunks (add pgvector for embeddings)
6. Attribution events (high-volume append-only)

### What Requires Dashboard Exposure

Panels not yet visible in the Next.js dashboard:

- Cache namespace browser (entries, stats, hit/miss/stale counts)
- DAG run graph view (visual node/edge/status rendering)
- Retrieval search trace browser
- MAP-CERA evaluation history and compound score view
- Decision audit log
- System event ledger browser
- Idempotency hit/conflict monitor
- Operating Core metrics panel
- Schema Registry inspector

### What Requires Tenant Hardening

- All file-backed stores need per-tenant directory isolation or tenant-keyed JSON
- Retrieval chunk reads need tenant enforcement at the store layer, not just the search layer
- Cache entries need per-tenant TTL policy overrides
- DAG runs need cross-tenant isolation (prevent one tenant's run from reading another's node outputs)
- Approval policies need per-tenant override support
- Governance policies need client-specific rule inheritance

### What Requires Connector Hardening

No external connectors exist yet. Before the Connector Layer (L3) is built:

1. Formalize `OSConnector` interface in `src/connectors/connector-types.ts`
2. Register connectors with the Control Plane before execution
3. Enforce riskLevel on connector actions via `executeWithEnforcement()`
4. Build connector-level audit events
5. Priority connectors: Google Drive, Gmail, Calendar, Airtable/Google Sheets, GitHub

---

## Next Recommended Layer Build Order

### Priority 1 — L10 Governance Layer Hardening

**Why first:** Every Application Layer module (L12) depends on governance rules being explicit and enforced. Brand voice, legal claims, SOP, and client-specific rules must exist before agents are given client-facing authority.

**What to build:**
- Brand voice policy file and validator
- Legal claims constraints
- SOP policy files per workflow type
- Client-specific rule override mechanism
- Offer governance (pricing, scope, guarantee constraints)
- Agent behavior policy enforcement hooks

---

### Priority 2 — L5 Data Normalization Layer

**Why second:** Application Layer modules (Offer Engine, Diagnostic Engine, Proposal Generator) all require standardized entity objects. Without normalization, each module builds its own ad-hoc data shapes.

**What to build:**
- Zod schemas for Tenant, User, Client, Contact, Lead, Offer, Asset, Workflow, SOP, KnowledgeDocument
- Normalization pipeline: receive raw → validate → map fields → produce normalized entity
- Normalization audit event
- Schema Registry registrations for all normalized objects

---

### Priority 3 — L3 Connector / Driver Layer

**Why third:** Once normalized entity schemas exist, connectors can produce normalized outputs. Without normalization, connector data floods the system in incompatible shapes.

**What to build:**
- `OSConnector` interface and registry in `src/connectors/`
- Google Drive adapter (read/write docs)
- Gmail adapter (read/send)
- Calendar adapter (read/create events)
- Airtable adapter (read/write records)
- GitHub adapter (read repos, issues, PRs)
- Each connector must declare riskLevel and route through enforcement

---

### Priority 4 — L11 Interface / Shell Expansion

**Why fourth:** Once connectors produce data, the dashboard needs to expose it. Operators need visibility into connector activity, retrieval traces, DAG execution, and business outcomes.

**What to build:**
- Telegram approval bot (approve/reject runs from mobile)
- Dashboard cache browser, DAG graph view, retrieval trace browser
- Approval inbox with pending actions queue
- Agent status monitor panel
- Operating Core health and metrics panel

---

### Priority 5 — L15 Optimization Layer

**Why fifth:** Optimization requires attribution history to analyze. Only build once attribution data is accumulating at scale.

**What to build:**
- Feedback loops reading `runtime/logs/attribution.jsonl`
- Run evaluation scoring (was this run profitable?)
- Workflow recommendation engine (which workflows produce the best MAP scores?)
- Prompt optimization tracking (which generations score highest on MAP?)
- CERA cycle automation (auto-generate CERA signals from attribution history)

---

### Priority 6 — L16 Business Outcome Layer

**Why last:** This layer synthesizes everything. It requires Observability, Attribution, Optimization, and Application data to produce meaningful ROI evidence.

**What to build:**
- Revenue influence tracking per run / per workflow
- Spend reduction evidence (time saved × rate, tool cost avoided)
- Profit growth dashboard
- MAP-to-outcome correlation reports
- Client ROI reporting module

---

*Last updated: April 25, 2026. Update this document after every build sprint or architectural decision.*
