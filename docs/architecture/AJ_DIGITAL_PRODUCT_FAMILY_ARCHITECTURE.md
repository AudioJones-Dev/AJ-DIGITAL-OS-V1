# AJ Digital Product Family Architecture

**Version:** 1.0 (Proposed)
**Date:** July 30, 2026
**Status:** PROPOSED — requires human ratification (see §20)
**Scope:** Documentation-only. This proposal authorizes no repository merger, archival, migration, code change, or PR action.
**Prepared from:** Read-only cross-repository audit of the six repositories listed in §2, performed July 30, 2026 against current default branches via the GitHub API.
**Parent document:** [`docs/strategy/AJ_DIGITAL_COMPANY_PRODUCTIZATION_SPEC.md`](../strategy/AJ_DIGITAL_COMPANY_PRODUCTIZATION_SPEC.md) (v2.0) — company and commercialization authority; per its §21 hierarchy, this architecture document governs repository and capability boundaries beneath it.

---

## 1. Executive Decision

**AJ Digital is one governed intelligence platform with several scoped business systems — not several independent AI operating-system companies.**

Adopt a **federated platform architecture**:

- **AJ Digital OS** (`AJ-DIGITAL-OS-V1`) is the **platform kernel and shared intelligence substrate** — governance, tenant identity, policy, approvals, audit, memory, attribution, connectors, and cross-product observability.
- **ARO** (`aj-agent-room-orchestrator`) is the **agent-execution and handoff runtime** beneath the kernel — not a second platform.
- **ReKonr** (`rekonr-os` canonical) is the **diagnostic and reconnaissance engine** — evidence-driven diagnosis of revenue leaks and operating constraints.
- **ResponseOS** (`responseos`) is the **horizontal revenue-recovery application**.
- **Worksie** (`worksie`) is the **vertical field-operations application**.

Repositories are **not merged**. Stacks are **not consolidated**. What is standardized is **contracts**: language-neutral schemas (JSON Schema / OpenAPI / AsyncAPI) owned by AJ Digital OS and implemented independently by each product in its own stack.

Two decisions in this proposal require explicit operator ratification (§20). Until ratified, no product may add new generalized platform layers (tenancy, policy, approvals, memory, connectors, orchestration control planes).

---

## 2. Verified Current Repository Roles

All six repositories verified active (none archived) on July 30, 2026.

| Repository | Default branch | Open PRs | What it actually is (verified) | Architectural role |
|---|---|---:|---|---|
| `AJ-DIGITAL-OS-V1` | `main` | 14 | 16-layer TypeScript platform: Control Plane (L2), Orchestration (L8), Attribution (L14) implemented; connectors, memory, intelligence, governance, observability, applications partial ([Layer Coverage Index](./AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md)) | **Platform kernel and shared intelligence substrate** |
| `aj-agent-room-orchestrator` | `main` | 1 | Python runtime: live Claude/Codex worker adapters, typed `TurnEnvelope` routing, durable approval pause/resume, Slack transport with fail-closed approver allowlist, health probes, cost/turn/runtime guardrails. Single-tenant by construction; internal reference runtime per its own `docs/product/ARO_PRODUCTIZATION_SPEC.md` | **Agent execution runtime** |
| `responseos` | `master` | 9 | Next.js 16 + Prisma 6 + Postgres revenue-recovery platform: RECOVER pipeline, `WorkflowRun`/`WebhookEvent` event-ledger spine, `RevenueMetrics` ROI attribution, own `Account` tenancy + `AuditLog`. Explicitly "not an AI receptionist clone" (`docs/PRD.md`) | **Horizontal revenue-recovery application** |
| `worksie` | `main` | 2 | Turborepo: Next.js web + Expo mobile, Drizzle/Supabase/PowerSync offline-first. Capability modeling, work orders, compliance gating, proof-of-work, 1099 payouts. Explicitly "not another CRM or another photo log" (`docs/WORKSIE_SPINE.md`) | **Vertical field-operations application** |
| `aj-rekonr` | `main` | 3 | Legacy CLI-only v0.1 foundation (Node/TS/Drizzle/Neon): env contract, multi-tenant schema, six provider integration smoke scripts. No crawlers, scoring, or UI ever shipped | **Legacy implementation source** (proposed) |
| `rekonr-os` | `main` | 2 | Documentation-only product reset (12 markdown files, zero runtime code): evidence-driven revenue-leak and operating-constraint reconnaissance thesis with explicit scope exclusions | **Canonical ReKonr product repository** (proposed) |

### Canonical documents inspected

- `AJ-DIGITAL-OS-V1`: `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`, `AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`, `docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`, `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`, `runtime/policies/*.json`, `src/schemas/*.schema.ts`
- `aj-agent-room-orchestrator`: `README.md`, `docs/product/ARO_PRODUCTIZATION_SPEC.md`, `docs/product/ARO_EPISTEMIC_CAPABILITY_ROUTING_SPEC.md`, `docs/system/ARO_REPOSITORY_COMPLIANCE_REMEDIATION_PLAN.md`, `src/aro/*`
- `responseos`: `README.md`, `docs/PRD.md`, `docs/architecture.md`, `docs/architecture/RESPONSEOS_EVENT_SCHEMA.md`, `docs/brand/RESPONSEOS_POSITIONING.md`, `prisma/schema.prisma`
- `worksie`: `README.md`, `docs/WORKSIE_SPINE.md`, `docs/PRD.md`, `docs/DOMAIN_MODEL.md`, `docs/TECH_STACK_DECISION.md`, `packages/db/src/schema/tables.ts`, `supabase/migrations/0001_phase_2_rls_and_audit.sql`
- `aj-rekonr`: `README.md`, `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` (ADRs 0001–0005), `src/config/env.ts`, `src/db/schema/*`
- `rekonr-os`: `README.md`, `docs/product-reset/REKONR_CANONICAL_PRODUCT_THESIS.md`, `REKONR_DOMAIN_MODEL_SPEC.md`, `REKONR_LEAK_AND_CONSTRAINT_ARCHITECTURE.md`, `REKONR_PHASED_IMPLEMENTATION_PLAN.md`, `REKONR_LEGACY_MIGRATION_DECISION.md`, `REKONR_REPOSITORY_RECONCILIATION.md`

### Verified overlaps (the problem this document resolves)

1. **ARO ↔ AJ Digital OS (roadmap-level, not code-level).** ARO's proposed 8-layer product model (Productization Spec §11) — control, policy, memory, connectors, governance, observability, agent registry — describes capabilities AJ-DIGITAL-OS-V1 has already partially or fully built in TypeScript (policy engine `src/core/policy/policy-engine.ts`, approvals `src/security/approvals/`, connector registry `src/connectors/`, agent registry `src/security/agents/agent-registry.ts`, tenancy `src/security/tenancy/`). No shared code or cross-repo imports exist today; the collision is entirely in roadmaps. Left unresolved, the portfolio ends up with two policy engines, two approval models, two memory models, and two orchestration control planes.
2. **Three independent tenancy + audit vocabularies.** AJ Digital OS (`tenant-context` + policy overlays + RLS specs), ResponseOS (`Account`/`account_id` + Clerk roles + Prisma `AuditLog` with break-glass), and Worksie (`tenants`/`memberships` + Supabase RLS with composite `(tenant_id, id)` FKs + append-only `work_order_events`). Aj-rekonr adds a fourth dormant hierarchy (`tenants → workspaces → clients → projects → campaigns`). Semantics have already drifted.
3. **Two "business memory" definitions.** AJ Digital OS semantic memory (`src/memory/`, memory-chunk schemas) vs. ResponseOS's named "Business Memory" product concept (demo assets, PRD Phase-1 capture baseline). rekonr-os correctly cedes memory ownership to AJ Digital OS already.
4. **Two ReKonr repositories** with a shared name and inverted ontologies (§7).
5. **Attribution defined twice.** AJ Digital OS `AttributionEvent`/MAP (implemented, L14) vs. ResponseOS `RevenueMetrics`/recovered-revenue calculators. Resolved in §5: products produce, the kernel aggregates.

### Verified unique product boundaries (no action needed)

- ResponseOS's RECOVER pipeline, provider adapters (Telnyx/Vapi/Twilio/GHL/HubSpot), and assessment commercial motion overlap nothing else.
- Worksie's capability model, offline sync (PowerSync/SQLite), compliance gating, proof-of-work, and 1099 payout engine overlap nothing else.
- rekonr-os's diagnostic kernel (assessment cases, evidence items, findings, constraint hypotheses, intervention options, validation plans) overlaps nothing else and explicitly excludes CRM, workflow execution, memory, and recovery execution.
- ARO's live worker invocation, envelope parsing with fail-safe human escalation, and Slack-gated approval mechanics are the only proven multi-agent loop in the portfolio.

---

## 3. Product-Family Architecture

```text
AJ Digital
│
├── Platform Kernel
│   └── AJ Digital OS — governance, tenant identity, policy, approvals,
│       audit, business memory, attribution, connectors, intelligence,
│       cross-product observability
│
├── Runtime Services
│   ├── ARO — agent execution, worker adapters, handoffs, turn envelopes,
│   │   pause/resume mechanics, collaboration transports
│   └── AIS — reasoning, validation and prediction-error subsystem
│       (applied-intelligence layer inside AJ-DIGITAL-OS-V1 today;
│       listed as a service for contract purposes, not a separate repo)
│
├── Intelligence Services
│   └── ReKonr — evidence collection, constraint/leak diagnosis,
│       intervention routing
│
└── Solution Applications
    ├── ResponseOS — demand capture and revenue recovery (horizontal)
    └── Worksie — field fulfillment and blue-collar operations (vertical)

Vertical / domain packs (future): domain-specific configuration bundles
(e.g., Florida accessibility-install pack for Worksie; home-services pack
for ResponseOS) — data + policy overlays, never new platform layers.
```

**Commercial lifecycle:**

```text
ReKonr        — diagnose the constraint or revenue leak
    ↓
ResponseOS    — capture and recover the demand
    ↓
Worksie       — execute and document the field work
    ↓
AJ Digital OS — govern, remember, attribute, evaluate
    ↓
ARO           — coordinate specialist AI workers across the lifecycle
```

---

## 4. Responsibility Matrix

| Responsibility | AJ Digital OS | ARO | ReKonr | ResponseOS | Worksie |
|---|---|---|---|---|---|
| Tenant identity & isolation | **Owns** | Consumes | Consumes (reference-only) | Implements contract locally | Implements contract locally |
| Global policy evaluation | **Owns** | Enforces at runtime | Consumes | Consumes | Consumes |
| Approval authority | **Owns** | Executes pause/resume mechanics | Consumes | Consumes | Consumes |
| Audit ledger (canonical) | **Owns** | Emits events | Emits events | Emits events (local `AuditLog` feeds up) | Emits events (local `work_order_events` feeds up) |
| Attribution (aggregate) | **Owns** | — | Emits diagnostic outcomes | **Produces** revenue-recovery attribution | Produces fulfillment/proof events |
| Business memory (canonical) | **Owns** | Exports session memory | References only | Captures signals, feeds up | Feeds proof-of-work artifacts up |
| Connector registry | **Owns** | Consumes | Consumes | Owns product-local provider adapters | Owns product-local provider adapters |
| Cross-product observability | **Owns** | Emits health/telemetry | Emits | Emits | Emits |
| Shared agent registry definitions | **Owns** | Consumes & executes | — | — | — |
| Cost policies | **Owns** | Enforces per-task caps | — | — | — |
| Agent invocation & worker adapters | — | **Owns** | — | — | — |
| Agent-to-agent handoffs & envelopes | — | **Owns** | — | — | — |
| Constraint/leak diagnosis | — | — | **Owns** | — | — |
| Demand capture & recovery workflows | — | — | — | **Owns** | — |
| Field execution, compliance, payout | — | — | — | — | **Owns** |

---

## 5. Explicit Capability Ownership

| Capability | Owner | Notes |
|---|---|---|
| Tenant identity | **AJ Digital OS** | Canonical tenant context contract; products keep local implementations conforming to `tenant-context.schema.json` |
| Policy | **AJ Digital OS** | `policy-engine.ts` + `runtime/policies/*` is the reference implementation; ARO §15 action-level policy consumes it rather than rebuilding it |
| Approvals | **AJ Digital OS** (authority) / **ARO** (mechanics) | Who may approve, risk classification, and gates are kernel decisions; pausing a running agent and resuming on decision is runtime mechanics |
| Audit | **AJ Digital OS** | Canonical `audit-event` contract; product-local audit tables remain but map to the shared event shape |
| Attribution | **ResponseOS produces; AJ Digital OS aggregates** | `RevenueMetrics` and recovery calculators stay in ResponseOS; cross-product attribution and MAP evaluation stay in the kernel (L14, implemented) |
| Memory | **AJ Digital OS** | One canonical business memory. ResponseOS "Business Memory" features become capture surfaces emitting `memory-record` events, not a second store |
| Connectors | **AJ Digital OS** (registry/governance) / products (local adapters) | Kernel owns the connector manifest, credential governance, and enablement policy; Telnyx/Vapi/Stripe-Connect-style product adapters stay in-product |
| Observability | **AJ Digital OS** | Event-ledger doctrine and Grafana stack; products emit, kernel correlates |
| Agent execution | **ARO** | Worker adapters, subprocess execution, envelope parsing, turn routing, health probes, timeout/failure handling |
| Domain workflows | **Owning product** | RECOVER pipeline → ResponseOS; work-order lifecycle → Worksie; diagnostic loop → ReKonr |

---

## 6. ARO ↔ AJ Digital OS Boundary

### ARO retains (runtime concerns)

- Worker adapters (Claude Code CLI, Codex CLI, mock workers)
- Agent invocation and subprocess lifecycle
- Turn-envelope parsing, including fail-safe escalation of unparseable output to human gates
- Agent-to-agent handoffs and routing state machine
- Runtime health probes (`aro-doctor`, preflight, subscription-auth posture checks)
- Collaboration transports (Slack Bolt/Socket Mode, console, composite fallback)
- Task pause/resume mechanics with durable local state
- Process-level timeout, cost-cap, and failure handling (`MAX_TURNS_PER_TASK`, `MAX_RUNTIME_MINUTES`, `MAX_COST_USD`)

### Delegated to AJ Digital OS (platform concerns)

From ARO's own productization spec, these PROPOSED layers are **not built in ARO**; they are consumed from the kernel via contracts:

- Agent registry (Productization Spec §13) → kernel `agent-registry` + shared registry contract
- Action-level policy evaluation (§14–15) → kernel policy engine via `action-request`/`approval-request` contracts
- Connector registry → kernel connector manifest
- Tenant boundaries → kernel tenant context (ARO is single-tenant by construction today; it gains tenancy by consuming the contract, not by defining one)
- Canonical memory → kernel memory records (Obsidian export becomes a memory-record producer)
- Centralized observability, audit, and cost governance → kernel ledgers

### Prohibited duplicate control-plane behavior

ARO must **not** implement: its own tenant model, a second policy engine, approval *authority* (deciding who may approve what), a canonical audit ledger, a connector registry, a business-memory store, or cross-product observability. Any such need is a contract request against AJ Digital OS. The same prohibition applies symmetrically: AJ Digital OS must not reimplement worker subprocess adapters or envelope-parsing mechanics; its L9 Agent Execution layer delegates to ARO.

---

## 7. ReKonr Repository Reconciliation

**Proposed:** `rekonr-os` becomes the canonical ReKonr product repository; `aj-rekonr` becomes the legacy implementation source.

**Basis (verified):**

- `rekonr-os` has the stronger bounded thesis: revenue-leak and operating-constraint reconnaissance with SEO/AEO demoted to one optional signal domain, reference-only pointers to AJ Digital OS operational objects, and explicit exclusions (no CRM, no workflow execution, no canonical memory, no recovery execution, no agent runtime).
- `aj-rekonr` shipped only a v0.1 CLI foundation (env contract, schema, provider smoke scripts); the SEO/AEO research workflows were never built. Its tenant hierarchy conflicts with kernel ownership and is rejected as a foundation by `rekonr-os`'s own `REKONR_REPOSITORY_RECONCILIATION.md`.
- `rekonr-os`'s `REKONR_LEGACY_MIGRATION_DECISION.md` already selected selective migration (Option D); this proposal aligns with it rather than overriding it.

**Migration assessment gates** (all must pass, per migrated file/module):

1. File-by-file compatibility review against the rekonr-os domain model (no import of the legacy tenant hierarchy).
2. Asset is on the earmarked list (env contract, provider integrations, OAuth helper, API-usage metering) or individually justified.
3. Conformance to platform contracts (§9) where the asset touches tenant, audit, or cost concepts.
4. Migration recorded in a migration ledger (rekonr-os PR #3 direction).

**Archival gates** (`aj-rekonr` archived only when all hold):

1. Migration ledger complete and validated.
2. Open PRs (#1, #3, #4) dispositioned by a human.
3. rekonr-os Phase 0 approval recorded (its own docs mark the reset packet "Proposed — decision required").
4. Explicit operator ratification (§20).

**No migration or archival is authorized by this document.**

---

## 8. Shared Contract Architecture (Language-Neutral)

The portfolio spans Python (ARO) and TypeScript (everything else), with three ORMs (Prisma, Drizzle ×2) and two Postgres providers (Neon, Supabase). Shared semantics therefore live in **serialization-level contracts**, not shared packages:

- **JSON Schema (2020-12)** for data shapes — tenant context, events, envelopes, manifests.
- **OpenAPI** for any synchronous kernel APIs (approval requests, policy queries).
- **AsyncAPI** for event streams (audit, attribution, memory, cost events).

Rules:

1. Contracts live in `AJ-DIGITAL-OS-V1/contracts/` — the single canonical location.
2. Products vendor or codegen types from schemas; they never import kernel runtime packages across language boundaries.
3. Every contract carries `contract_version` (semver) in its payloads.
4. Existing kernel Zod schemas (`src/schemas/*.schema.ts`) are the seed material: export them to JSON Schema rather than authoring parallel definitions.

## 9. Required Platform Contract Schemas

```text
contracts/
├── tenant-context.schema.json        # canonical tenant identity + isolation scope
├── actor-context.schema.json         # human | agent | system actor, roles, authority
├── action-request.schema.json        # a governable action with risk classification
├── approval-request.schema.json      # gate request, approver constraints, resolution
├── audit-event.schema.json           # append-only audit record (maps ResponseOS AuditLog, Worksie work_order_events, ARO turn logs)
├── attribution-event.schema.json     # revenue/outcome attribution (maps kernel MAP + ResponseOS RevenueMetrics)
├── agent-envelope.schema.json        # formalizes ARO TurnEnvelope for cross-runtime use
├── memory-record.schema.json         # canonical business-memory write
├── connector-manifest.schema.json    # connector identity, scopes, credential class, enablement policy
├── workflow-run.schema.json          # cross-product workflow run identity (maps ResponseOS WorkflowRun, kernel BEL runs)
├── cost-event.schema.json            # token/provider spend events (maps ARO cost caps, kernel token governance)
└── product-capability-manifest.schema.json  # §10
```

## 10. Product Capability Manifest

Every product repository eventually declares (at repo root, `product.manifest.yaml`):

```yaml
product:
  id: responseos
  type: solution_application   # platform_kernel | runtime_service | intelligence_service | solution_application | domain_pack
  owner: aj-digital

platform_contract:
  version: 1.0

capabilities:
  consumes:
    - tenant_context
    - approval_policy
    - business_memory
    - audit_events
  produces:
    - revenue_recovery_events
    - attribution_events
    - workflow_outcomes
```

The manifest is validated against `product-capability-manifest.schema.json`. A product declaring `produces` for a kernel-owned capability (e.g., `approval_policy`) fails validation — this is the mechanical enforcement of §13.

## 11. Cross-Product Event Flow

```text
ReKonr ──(finding / intervention_option)──────────────▶ AJ Digital OS memory + audit
   │
   └─(routed intervention)──▶ ResponseOS ──(attribution_event, workflow_run)──▶ AJ Digital OS
                                   │
                                   └─(booked work)──▶ Worksie ──(proof-of-work, audit_event)──▶ AJ Digital OS
                                                                       │
AJ Digital OS ──(agent task + policy + approval context)──▶ ARO ──(turn audit, cost_event)──▶ AJ Digital OS
```

All arrows are contract-shaped events (§9). No product reads another product's database.

## 12. Integration Sequence

Formalize integrations in this order — each step produces contract conformance before the next begins:

1. **ReKonr → ResponseOS**: diagnostic findings route to recovery interventions (`finding` → intervention request).
2. **ResponseOS → Worksie**: booked opportunities become work orders where fulfillment is field work.
3. **Worksie → AJ Digital OS**: proof-of-work and completion events land in canonical audit + memory.
4. **AJ Digital OS → ARO**: kernel dispatches governed agent tasks with tenant, policy, and approval context attached.
5. **ARO → all**: specialist AI workers coordinate lifecycle tasks under kernel governance.

## 13. Kernel vs. Product Placement Rules

A capability belongs in **AJ Digital OS** only when at least one is true:

1. Two or more solution products require it.
2. It governs cross-product execution.
3. It establishes a universal security or tenant boundary.
4. It provides shared memory, attribution, or observability.
5. It is required to install and operate the platform.

Everything else belongs in the product that owns the business outcome.

| Capability | Owner |
|---|---|
| Approval policy | AJ Digital OS |
| Claude/Codex subprocess execution | ARO |
| Missed-call recovery | ResponseOS |
| Ramp-install checklist | Worksie (domain pack data) |
| Operating-constraint diagnosis | ReKonr |
| Cross-product business memory | AJ Digital OS |
| Work-order proof photos | Worksie |
| Revenue-recovery attribution | ResponseOS produces; AJ Digital OS aggregates |

**Corollary (repository sprawl):** AJ-DIGITAL-OS-V1 currently also hosts application workstreams — CRM (`src/crm/`), social ops, link-in-bio/website systems, founder-opportunity engine, Telegram bot, Stripe billing. Under rule 1–5 several of these are *applications*, not kernel. This proposal does not relocate them, but new application workstreams should default to product repositories, and a future review should classify the existing ones.

## 14. Naming Policy

**Internal architectural language:** AJ Digital OS = platform kernel · ARO = agent runtime · ReKonr = diagnostic intelligence engine · ResponseOS = revenue recovery application · Worksie = field operations application.

**External buyer language** — sell outcomes, not infrastructure:

- ✅ "Diagnose revenue leaks. Recover missed opportunities. Coordinate follow-up. Manage field execution. Create business memory. Prove operational ROI."
- ❌ "Five AI operating systems", "agent orchestration fabrics", "multi-agent runtime architecture".

**"OS" suffix policy:** ResponseOS retains it (established product brand). AJ Digital OS retains it internally. No new "OS"-suffixed products or repositories (note: `AJ-DIGITAL-AGENT-OS`, `career-os`, `PodcastOS-Agent` already exist in the org — the moratorium applies to new naming going forward).

## 15. Repository Independence Policy

- Each product ships from its own repository on its own cadence with its own stack (TypeScript CLI/runtime; Python; Next.js/Prisma; Next.js/Expo/Drizzle/Supabase/PowerSync — all retained).
- No monorepo consolidation. No cross-repo runtime imports. No shared ORM or database.
- Coupling is allowed **only** through `contracts/` artifacts and versioned kernel APIs.
- CI/CD, secrets management (Doppler in ARO and ResponseOS today), and deployment remain per-repository.

## 16. Versioning and Compatibility Policy

- Contracts are semver'd: MAJOR = breaking shape/semantic change; MINOR = additive optional fields; PATCH = documentation.
- The kernel supports the current and previous MAJOR of every contract (N−1 compatibility window).
- Products pin `platform_contract.version` in their manifest; the kernel never assumes a product is on latest.
- Breaking changes require: migration notes in the contract's changelog, a deprecation window, and operator approval (contract changes govern cross-product execution and are therefore kernel-governed actions).
- Event payloads are forward-compatible: consumers must ignore unknown fields.

## 17. Security and Tenant-Boundary Requirements

- **One tenant identity.** All products resolve tenant identity through `tenant-context.schema.json`. Local mechanisms (Clerk accounts, Supabase RLS, kernel tenant registry) remain as *enforcement*, but the semantic model is shared.
- **Tenant ID is non-optional** on every cross-product event (audit, attribution, memory, cost, workflow).
- **RLS/default-deny remains product-local best practice** (Worksie's composite-FK + default-deny RLS pattern is the reference standard; ResponseOS tenant-matrix tests are the reference test pattern).
- **ARO gains tenancy only via the contract** — no ARO-native tenant model. Until then, ARO tasks carry the operator's single-tenant context explicitly rather than implicitly.
- **Approval authority is fail-closed** everywhere (ARO's `SLACK_APPROVER_IDS` allowlist and the kernel's `executeWithEnforcement` are the two existing reference implementations; the contract unifies their semantics).
- **Secrets:** no product embeds another product's credentials; connector credential classes are declared in connector manifests and governed by kernel policy.
- **Break-glass access** (ResponseOS raw-transcript pattern) must always emit a kernel-shaped audit event.

## 18. Risks, Tradeoffs, and Rejected Alternatives

| Risk | Level | Reason / Mitigation |
|---|---|---|
| Product-positioning confusion | High | Too many "OS" brands obscure outcomes → naming policy (§14) |
| Runtime duplication | High | ARO roadmap ≈ kernel capabilities → boundary (§6), manifest validation (§10) |
| Contract drift | High | Three tenancy + audit vocabularies already exist → contracts (§8–9) before any new platform layers |
| Repository sprawl | Medium-High | Kernel accumulating CRM/social/website workstreams → placement rules + classification review (§13) |
| Forced technical consolidation | Medium | Monorepo migration = effort without customer value → explicitly rejected (§15) |
| Current code loss | Low | All repositories remain intact; this proposal changes no code |

**Rejected alternatives:**

1. **Merge all repositories into a monorepo.** Rejected: three mature, rational stacks; migration risk with no customer value; contracts achieve the same semantic unification.
2. **Let ARO grow into a full platform.** Rejected: would duplicate the kernel's implemented policy/approval/tenancy/connector layers in a second language; ARO's own spec says "productize the capability, not the repository as-is."
3. **Pick one ReKonr repo and delete the other now.** Rejected: aj-rekonr holds earmarked migration assets and open PRs; archival is gated (§7).
4. **Single shared database / shared ORM.** Rejected: couples release cadences and violates repository independence; event contracts suffice.
5. **Rebrand everything under one product name.** Rejected: ResponseOS and Worksie have defensible standalone theses and distinct buyers.

## 19. Migration Plan (No Physical Consolidation)

**Phase 0 — Ratification (human).** Decisions in §20. No work proceeds past documentation until ratified.

**Phase 1 — Contracts (docs/schemas only).** Author the §9 schemas in `AJ-DIGITAL-OS-V1/contracts/`, seeded from existing kernel Zod schemas, ResponseOS Prisma models, Worksie Drizzle schema, and ARO Pydantic models. Publish `PRODUCT_CAPABILITY_OWNERSHIP_MATRIX.md`.

**Phase 2 — Manifests.** Each product adds `product.manifest.yaml` declaring consumes/produces. CI validation against the manifest schema (per-repo, no shared runtime).

**Phase 3 — Event conformance.** Products map existing local models to contract shapes at their boundaries (ResponseOS `AuditLog` → `audit-event`; Worksie `work_order_events` → `audit-event`; ARO turn logs → `audit-event` + `cost-event`; ResponseOS `RevenueMetrics` → `attribution-event`). Local schemas do not change; adapters serialize outward.

**Phase 4 — ARO delegation.** ARO consumes kernel agent-registry, policy, and approval contracts instead of building §13–15 of its productization spec. Kernel L9 formally delegates execution to ARO.

**Phase 5 — ReKonr reconciliation.** Only after §7 gates: selective migration per ledger, then archival decision.

At no phase is a repository merged, archived, or its stack replaced.

## 20. Acceptance Criteria and Human-Ratification Decisions

**This proposal is accepted when:**

1. The two decisions below are explicitly ratified by the operator (recorded in the governance decision ledger).
2. This document merges to `main` via a human-approved PR (merge itself is HUMAN_REQUIRED under governance).
3. The follow-up artifacts (§21) are scheduled as documentation tasks.

**Decision 1 — Ratify ARO's role.** ARO is the agent-execution runtime beneath AJ Digital OS. Its proposed control-plane/policy/memory/connector/governance/observability layers are delegated to the kernel via contracts. ARO does not grow into a second platform.

**Decision 2 — Ratify ReKonr canonicalization.** `rekonr-os` is the canonical product repository; `aj-rekonr` is the legacy implementation source; migration and archival proceed only through the §7 gates.

**Standing constraint until both are ratified:** no new generalized platform layers (tenancy, policy engines, approval authorities, memory stores, connector registries, orchestration control planes) may be added to ResponseOS, Worksie, ReKonr, or ARO.

## 21. Proposed Follow-Up Artifacts (Not Implemented Here)

- `docs/architecture/PRODUCT_CAPABILITY_OWNERSHIP_MATRIX.md` — expands §4–5 into a per-capability, per-repo matrix with file-path evidence
- `contracts/product-capability-manifest.schema.json`
- `contracts/tenant-context.schema.json`
- `contracts/action-request.schema.json`
- `contracts/approval-request.schema.json`
- `contracts/audit-event.schema.json`
- `contracts/attribution-event.schema.json`
- `contracts/agent-envelope.schema.json`
- `contracts/memory-record.schema.json`
- `contracts/workflow-run.schema.json`

---

*Prepared as a documentation-only proposal on branch `docs/product-family-architecture`. Nothing in this document authorizes implementation, migration, merger, or archival.*
