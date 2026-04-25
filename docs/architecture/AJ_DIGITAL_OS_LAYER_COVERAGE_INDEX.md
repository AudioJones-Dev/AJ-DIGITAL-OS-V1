# AJ Digital OS — Layer Coverage Index

**Version:** 1.0
**Date:** April 25, 2026
**Owner:** AJ Digital LLC
**Status:** Living Document — update after every major build sprint
**Canonical Reference:** [AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md](./AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md)

---

## Purpose

This document tracks implementation coverage against the 16-layer AJ Digital OS architecture model. It is the authoritative source for:

- What has been built and where it lives
- What is partial and what the remaining gaps are
- What requires migration, hardening, or dashboard exposure
- What layer owns each module
- Recommended build order for remaining layers

Every new module added to the system must update this index.

---

## Coverage Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Implemented | Core functionality built, tested, committed |
| 🔶 Partial | Scaffolded or partially implemented; gaps documented |
| 📋 Planned | Specified but not yet started |
| ❌ Blocked | Cannot start until a dependency is resolved |

---

## 16-Layer Coverage Table

### Layer 1 — Infrastructure Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | Environment abstraction, deployment environments, cloud/local separation |
| **Tests** | None |
| **Notes / Gaps** | `.env.example` exists. No connector abstraction, no multi-tenant deployment separation, no cloud/local routing logic, no infrastructure registry. |

---

### Layer 2 — Control Plane / Kernel Layer

| Field | Value |
|-------|-------|
| **Status** | ✅ Implemented |
| **Primary Modules** | `src/control-plane/run-registry/` · `src/security/permissions/` · `src/security/approvals/` · `src/security/tenancy/` · `src/core/state/` · `src/core/policy/` |
| **Runtime Responsibility** | Run lifecycle, state machine, action risk classification, approval gates, enforcement, tenant isolation, audit logging |
| **Tests** | `tests/control-plane/` · `tests/security/` · `tests/core/` |
| **Notes / Gaps** | State machine formalized in Operating Core v1. Approval gates are file-backed. Enforcement engine (`executeWithEnforcement`) is the canonical control authority. All mutating actions must pass through this layer. |

**Key files:**
- `src/control-plane/run-registry/control-actions.ts` — primary enforcement entry point
- `src/control-plane/run-registry/run-control-store.ts` — run state persistence
- `src/control-plane/run-registry/run-audit-log.ts` — enforcement audit JSONL
- `src/security/permissions/enforced-execution.ts` — `executeWithEnforcement()`
- `src/security/approvals/approval-service.ts` — approval creation and management
- `src/core/state/run-state-machine.ts` — formal state transition validation
- `src/core/policy/policy-engine.ts` — centralized policy evaluation
- `runtime/policies/*.policy.json` — policy definitions

---

### Layer 3 — Connector / Driver Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | External tool communication — Google Drive, Gmail, Calendar, CRM, Airtable, GitHub, Cloudflare, n8n, SERP |
| **Tests** | None |
| **Notes / Gaps** | `OSConnector` interface is defined in Layer Model Spec. No adapters implemented. MCP tool registry in BEL v3 is the nearest precursor. Build after Operating Core and Governance hardening. |

---

### Layer 4 — Data Ingestion Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | Normalized ingestion events from files, forms, email, APIs, CRM, calendar, meeting transcripts |
| **Tests** | None |
| **Notes / Gaps** | Retrieval Layer (L6) handles document ingestion for RAG purposes but does not produce normalized `IngestionEvent` records. A dedicated ingestion pipeline with the full `IngestionEvent` schema is unbuilt. |

---

### Layer 5 — Data Normalization Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | Entity extraction, schema mapping, lead/offer/SOP normalization, attribution event normalization |
| **Tests** | None |
| **Notes / Gaps** | Schema Registry (Operating Core v1) provides Zod schemas for core objects. Normalization pipeline itself — entity extraction, field mapping, cleaning — is unbuilt. Priority 2 build. |

---

### Layer 6 — Memory Layer

| Field | Value |
|-------|-------|
| **Status** | 🔶 Partial |
| **Primary Modules** | `src/cache/` · `src/retrieval/` |
| **Runtime Responsibility** | Working memory (CAG), semantic memory (RAG), run history (JSONL), document and chunk storage |
| **Tests** | `tests/cache/` · `tests/retrieval/` |
| **Notes / Gaps** | CAG provides context/plan/score/report/response caches. RAG provides document and keyword-search retrieval. Missing: vector store / embeddings, long-term episodic memory, brand memory, procedural memory (SOP store), client-level memory scoping, Redis/Neon migration. |

**Key files:**
- `src/cache/cache-store.ts` — 5-namespace file-backed cache
- `src/cache/cache-policy-engine.ts` — 8 cache decision rules
- `src/cache/cache-bel-integration.ts` — plan cache hooks for BEL
- `src/cache/cache-aeo-integration.ts` — score cache wrapper for AEO
- `src/retrieval/retrieval-store.ts` — document and chunk persistence
- `src/retrieval/retrieval-search.ts` — keyword search with word-overlap scoring
- `src/retrieval/retrieval-context.ts` — context pack generator
- `runtime/cache/*.json` — cache namespaces (file-backed)
- `runtime/retrieval/*.json` — document and chunk store

---

### Layer 7 — Intelligence Layer

| Field | Value |
|-------|-------|
| **Status** | 🔶 Partial |
| **Primary Modules** | `src/aeo/` · `src/decision/` · `src/retrieval/` |
| **Runtime Responsibility** | Opportunity scoring, MAP/CERA decision engine, keyword retrieval, compound score derivation |
| **Tests** | `tests/aeo/` · `tests/decision/` · `tests/retrieval/` |
| **Notes / Gaps** | AEO scoring and MAP-CERA are live. Retrieval is keyword-only; embeddings and semantic reasoning are deferred. Missing: constraint diagnostics, lead scoring, offer analysis, ROI estimation, prediction error reduction, reasoning agents. |

**Key files:**
- `src/aeo/opportunity-scorer.ts` — AEO formula (`volume×0.30 + difficulty×0.30 + intent×0.20 + local×0.10 + aeo×0.10`)
- `src/decision/decision-engine.ts` — MAP score, CERA efficiency, compound score, decision path
- `src/decision/decision-policy.ts` — MAP decision enforcement (weak-alignment block, tenant gate)
- `src/retrieval/retrieval-search.ts` — keyword relevance scoring

---

### Layer 8 — Orchestration Layer

| Field | Value |
|-------|-------|
| **Status** | ✅ Implemented |
| **Primary Modules** | `src/bel/` |
| **Runtime Responsibility** | Multi-step workflow execution, dependency resolution, retry policy, approval checkpoints, DAG graph execution |
| **Tests** | `tests/bel/` |
| **Notes / Gaps** | BEL v3 handles linear execution. BEL v4 DAG handles dependency-aware graph execution. Queue system, job scheduler, and event-driven triggers are not yet built. |

**Key files:**
- `src/bel/execution-planner.ts` — BEL v3 plan generation
- `src/bel/execution-runtime.ts` — BEL v3 step execution with retry and escalation
- `src/bel/dag/dag-types.ts` — DAG plan, node, edge, run state types
- `src/bel/dag/dag-validator.ts` — DFS cycle detection, orphan/duplicate checks
- `src/bel/dag/dag-runtime.ts` — createDagRun, getReadyNodes, executeNode, retryNode, skipNode
- `src/bel/dag/dag-store.ts` — file-backed run, audit, node output persistence
- `src/bel/dag/dag-attribution.ts` — fire-and-forget DAG attribution events

---

### Layer 9 — Agent Execution Layer

| Field | Value |
|-------|-------|
| **Status** | 🔶 Partial |
| **Primary Modules** | `src/bel/` · `src/security/agents/` |
| **Runtime Responsibility** | Scoped AI workers, tool execution, agent registry, memory scoping |
| **Tests** | `tests/security/agents/` |
| **Notes / Gaps** | BEL runtime provides execution context. Agent registry (`src/security/agents/`) tracks registered agents. Missing: full `OSAgent` interface enforcement, individual agent role definitions, forbidden-action enforcement, memory-scope isolation per agent, browser/voice/research agent implementations. |

**Key files:**
- `src/bel/capabilities.ts` — capability definitions and checks
- `src/bel/mcp-tool-registry.ts` — MCP tool registration
- `src/security/agents/agent-registry.ts` — agent registration and lookup

---

### Layer 10 — Governance Layer

| Field | Value |
|-------|-------|
| **Status** | 🔶 Partial |
| **Primary Modules** | `src/security/permissions/` · `src/core/policy/` |
| **Runtime Responsibility** | SOP policies, brand rules, approval policies, data access policies, agent behavior constraints, legal boundaries |
| **Tests** | `tests/security/permissions/` · `tests/core/` |
| **Notes / Gaps** | Enforcement engine, permission levels, and policy-as-code files cover security governance. Missing: brand voice governance, legal claims constraints, SOP policy files, offer governance, client-specific rule overrides. |

**Key files:**
- `src/security/permissions/enforced-execution.ts`
- `src/security/permissions/permission-levels.ts`
- `src/core/policy/policy-engine.ts`
- `src/core/policy/policy-loader.ts`
- `runtime/policies/action-risk.policy.json`
- `runtime/policies/tenant-boundary.policy.json`
- `runtime/policies/environment.policy.json`
- `runtime/policies/approval-gates.policy.json`

---

### Layer 11 — Interface / Shell Layer

| Field | Value |
|-------|-------|
| **Status** | 🔶 Partial |
| **Primary Modules** | `dashboard/` · `src/cli.ts` · `src/commands/` |
| **Runtime Responsibility** | Web dashboard, CLI command surface, approval inbox, run console, audit trail |
| **Tests** | `tests/dashboard/` |
| **Notes / Gaps** | Next.js App Router dashboard exposes run list, run detail, enforcement status, MAP attribution panel, audit trail. CLI covers most operational commands. Missing: Telegram bot, mobile approval surface, client portal, diagnostic form, agent status monitor. |

**Key files:**
- `dashboard/app/` — Next.js App Router pages
- `dashboard/components/` — EnforcementStatus, MAPAttribution, AuditTrail, RunControls, RunDetailEnforcement
- `dashboard/lib/api.ts` — Hermes API client
- `dashboard/lib/control-client.ts` — enforcement payload builders
- `src/cli.ts` — CLI entry point
- `src/commands/` — 40+ command modules

---

### Layer 12 — Application Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | Offer Engine, Diagnostic Engine, Content Engine, SEO/AEO Engine, Attribution Dashboard, Proposal Generator |
| **Tests** | None |
| **Notes / Gaps** | Individual business applications are unbuilt. The underlying infrastructure (DAG, RAG, CAG, MAP-CERA, attribution) is in place to support them. Build after Connector and Normalization layers are stable. |

---

### Layer 13 — Observability Layer

| Field | Value |
|-------|-------|
| **Status** | 🔶 Partial |
| **Primary Modules** | `src/core/observability/` · `src/core/events/` · JSONL logs throughout |
| **Runtime Responsibility** | Run logs, agent logs, enforcement audit, attribution logs, system event ledger, metrics snapshot |
| **Tests** | `tests/core/` |
| **Notes / Gaps** | JSONL audit logs exist across Control Plane, BEL, DAG, Cache, Retrieval, Decision Engine. Operating Core adds unified System Event Ledger and file-backed metrics. Missing: cost tracking per run, tool/API spend, performance metrics (execution time), ROI dashboard, alerting. |

**Key files:**
- `src/core/events/event-ledger.ts` — canonical system event JSONL
- `src/core/observability/metrics-store.ts` — file-backed metrics
- `src/control-plane/run-registry/run-audit-log.ts` — enforcement audit
- `src/bel/dag/dag-store.ts` — DAG audit JSONL
- `src/cache/cache-audit-log.ts` — cache audit JSONL
- `runtime/events/system-events.jsonl` — canonical system ledger
- `runtime/observability/metrics.json` — metrics snapshot

---

### Layer 14 — Attribution Layer

| Field | Value |
|-------|-------|
| **Status** | ✅ Implemented |
| **Primary Modules** | `src/attribution/` |
| **Runtime Responsibility** | MAP event emission, attribution tracking, JSONL log, MAP compliance validation |
| **Tests** | `tests/control-plane/` (MAP validator tests) |
| **Notes / Gaps** | Core attribution pipeline is live. All major modules (BEL, DAG, Cache, Retrieval, Decision Engine, Control Plane) emit MAP attribution events. Missing: full business outcome linking (lead → conversion → revenue), spend reduction evidence, attribution dashboard view, cross-module attribution correlation. |

**Key files:**
- `src/attribution/attribution-tracker.ts` — `emitEvent()`, JSONL write, MAP scoring
- `src/attribution/attribution-types.ts` — `AttributionEvent`, `AttributionEventType`
- `src/attribution/map-validator.ts` — `evaluateMAP()`, `filterMAPCompliant()`, `getMAPStats()`
- `runtime/logs/attribution.jsonl` — attribution event log

---

### Layer 15 — Optimization Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | Feedback loops, run evaluation, agent performance review, workflow optimization, cost optimization, prompt optimization |
| **Tests** | None |
| **Notes / Gaps** | CERA (Capture, Extract, Refine, Amplify) in the MAP-CERA Decision Engine is the conceptual foundation for this layer. Full optimization pipeline — reading attribution history and improving workflows — is unbuilt. |

---

### Layer 16 — Business Outcome Layer

| Field | Value |
|-------|-------|
| **Status** | 📋 Planned |
| **Primary Modules** | None yet |
| **Runtime Responsibility** | Spend reduction tracking, profit growth, revenue attribution, ROI reporting, margin improvement, strategic clarity |
| **Tests** | None |
| **Notes / Gaps** | MAP attribution events have `mapScore` fields with Meaningful/Actionable/Profitable dimensions. Full business outcome tracking — actual revenue influenced, actual spend reduced, time saved — is unbuilt. This layer requires L13 Observability and L14 Attribution to be mature first. |

---

## Current Architecture Readiness

### Production-like (stable, tested, file-backed)

- Control Plane enforcement and approval gates
- Run state machine with valid transition enforcement
- MAP attribution event emission
- AEO opportunity scoring
- MAP-CERA decision engine
- BEL v3 linear execution runtime
- BEL v4 DAG execution with cycle detection
- Cache Augmentation Layer (all 5 namespaces)
- Operational Retrieval Layer (keyword search, context packs)
- Operating Core command envelope, policy engine, idempotency, schema registry

### Prototype / File-Backed (requires migration)

| Component | Migration Target |
|-----------|-----------------|
| Run control store (`runtime/control-runs.json`) | Neon / Postgres |
| Cache namespaces (`runtime/cache/*.json`) | Redis or Neon |
| Retrieval documents and chunks (`runtime/retrieval/*.json`) | Neon + pgvector |
| Decision evaluations (`runtime/decision/*.json`) | Neon |
| DAG runs and outputs (`runtime/dag/*.json`) | Neon |
| Approval records (`data/security/approvals.json`) | Neon |
| Idempotency records (`runtime/idempotency/*.json`) | Redis |
| System event ledger (`runtime/events/system-events.jsonl`) | Event stream or Neon |
| Metrics (`runtime/observability/metrics.json`) | Time-series store |

### Requires Dashboard Exposure

- Cache namespace stats and entry browser
- DAG run visualization (nodes, edges, status)
- Retrieval search traces and document browser
- MAP-CERA evaluation history and compound score view
- Decision audit log
- System event ledger browser
- Idempotency hit/conflict monitor
- Metrics snapshot panel
- Operating Core health endpoint → dashboard status panel

### Requires Tenant Hardening

- All file-backed stores need per-tenant directory isolation
- Retrieval chunks need tenant-scoped read enforcement at the store level (currently enforced at search layer only)
- Cache entries need per-tenant TTL override support
- Approval gates need per-tenant approval policy override
- DAG runs need cross-tenant execution isolation

### Requires Connector Hardening

- No external connectors exist yet
- MCP tool registry in BEL is the stub for connector registration
- Before connectors are built, the `OSConnector` interface needs to be formalized in `src/connectors/`

---

## Next Recommended Layer Build Order

| Priority | Layer | Rationale |
|----------|-------|-----------|
| 1 | **L10 Governance hardening** | Brand voice policies, SOP constraints, legal claim rules, client-specific policy overrides — required before any Application Layer work |
| 2 | **L5 Data Normalization** | Standardized entity objects (Lead, Offer, Client, Contact) are prerequisites for Application Layer and Connector Layer |
| 3 | **L3 Connector / Driver** | Google Drive, Gmail, Calendar, CRM, Airtable — enables real data flow into the system |
| 4 | **L11 Interface / Shell expansion** | Telegram approval bot, client portal, approval inbox — extends control surface to mobile/remote |
| 5 | **L15 Optimization** | Feedback loops reading attribution history to improve workflows, agents, and offers |
| 6 | **L16 Business Outcome** | ROI tracking, spend reduction evidence, revenue attribution — the commercial reporting layer |

---

*This document must be updated after every build sprint. Layer status should reflect the actual committed state of main, not planned or in-progress work.*
