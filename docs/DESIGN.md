# Design — AJ Digital OS

This is the design index. It points to the long-form specs rather than
duplicating them. The architecture has multiple layers; each layer has a
dedicated spec under `docs/system/` and/or `docs/architecture/`. This file
is the entry point.

For the product framing, read `docs/PRD.md` first.

---

## 1. Architectural shape

AJ Digital OS is a 16-layer architecture. The authoritative model and
per-layer coverage status are:

- **Layer model:** `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
- **Layer coverage:** `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
- **Module traceability:** `docs/architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`
- **Master schema:** `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`

Pinned summary (status as of the layer coverage index):

```
L1  Infrastructure             Planned
L2  Control Plane / Kernel     Implemented
L3  Connector / Driver         Planned
L4  Data Ingestion             Planned
L5  Data Normalization         Planned
L6  Memory                     Partial
L7  Intelligence               Partial
L8  Orchestration (BEL)        Implemented
L9  Agent Execution            Partial
L10 Governance                 Partial
L11 Interface / Shell          Partial
L12 Application                Planned
L13 Observability              Partial
L14 Attribution (MAP)          Implemented
L15 Optimization (CERA)        Planned
L16 Business Outcome           Planned
```

## 2. Core runtime — quick map

The runtime model that operators care about day-to-day is captured in
`docs/system-architecture.md` (kept for historical context; the
authoritative version of the design now lives across the documents
referenced above). The run lifecycle and component decomposition there
still match the implementation as of this writing.

Run lifecycle:

```text
created -> validated -> pending_approval -> approved -> execution -> executed
                                       \-> rejected
                                       \-> revision_requested
                                  fail / skipped / denied at execution
```

Component decomposition:

- **CLI** (`src/cli.ts`, `src/commands/`) — operator surface.
- **Agents** (`src/agent-roles/`, `src/browser-agent/`, `src/local-agent/`) —
  scoped action units.
- **Services** (`src/services/`) — coordinator, resumer, policy, router,
  dashboard, tracker.
- **Core** (`src/core/`) — run manager, validator, state machine,
  run store, logger, schema registry.
- **Control plane** (`src/control-plane/`) — run registry, audit log,
  approvals, tenancy.
- **Security** (`src/security/`) — permissions, approvals, tenancy, MCP
  secure executor, audit logger.
- **Memory and retrieval** (`src/memory/`, `src/memory-runtime/`,
  `src/retrieval/`, `src/cache/`) — cognitive store, hooks, document
  index, cache namespaces.
- **Decision engine** (`src/decision/`) — MAP / CERA scoring and
  decision path.
- **Attribution** (`src/attribution/`) — MAP event tracker, validator,
  JSONL log.
- **Dashboard** (`dashboard/`) — Next.js App Router read model.

## 3. Where to read about each concern

| Concern | Authoritative spec |
|---|---|
| Run lifecycle and state machine | `docs/system-architecture.md`, `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md` |
| Approval system | `docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md` |
| Agent permissions and enforcement | `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md` |
| Security and trust model | `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` |
| MCP secure execution | `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md` |
| Client isolation / multi-tenant | `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md` |
| Brand context system | `docs/architecture/brand-context-system-spec.md` |
| API integration and model profiles | `docs/architecture/api-integration-and-model-profile-spec.md` |
| Applied intelligence | `docs/architecture/applied-intelligence-system.md` |
| Conversation memory and stitching | `docs/architecture/conversation-memory-and-context-stitching-spec.md` |
| Deliverable + approval routing | `docs/architecture/deliverable-and-approval-routing-spec.md` |
| Deliverable approval lifecycle | `docs/architecture/deliverable-approval-lifecycle-spec.md` |
| Integrations and secrets | `docs/architecture/integrations-and-secrets-spec.md` |
| MCP tool architecture | `docs/architecture/mcp-tool-architecture-spec.md` |
| Semantic memory and retrieval | `docs/architecture/semantic-memory-and-retrieval-spec.md` |
| Task category and folder layout | `docs/architecture/task-category-and-folder-spec.md` |
| Qualification engine | `docs/intelligence-layer/qualification-engine.md` |
| Design tokens (UI) | `docs/ui/design-token-system.md` |
| Local web shell | `docs/ui/local-web-shell.md` |
| Repo validation report (snapshot) | `docs/system/AJ_DIGITAL_OS_REPO_VALIDATION_REPORT.md` |

## 4. Schema discipline

All major handoffs between stages are typed:

- Run, workflow result, content asset, approval packet, validation
  report, brand DNA, context bundle — all defined in `src/schemas/` and
  exercised by Vitest under `tests/`.
- Zod is the single source of validation. New schemas live in
  `src/schemas/`; do not introduce ad-hoc TS interfaces for boundary
  payloads.

## 5. Extension points

The currently exposed extension points (and where to register them):

- **Workflows** → `src/core/workflows/workflow-registry.ts`.
- **Publish targets** → `src/services/publishing/publish-router.ts`. Today
  only `local` is implemented.
- **Tools / connectors** → `src/integrations/`. Each tool defines its own
  contract (allowed callers, required inputs, retry policy, audit
  expectations).
- **Model providers** → `src/providers/`. Routed through
  `src/model-routing/route-model-task.ts`.
- **MCP servers** → `src/mcp/` + secure executor wrapper. Per
  `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`, every
  new MCP surface must register through the secure executor and have a
  documented capability scope.

## 6. Conventions

- **Strict TypeScript.** `tsc --noEmit` is part of the CI gate.
- **No silent mutation.** Every action that changes external state emits
  an audit record. See
  `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` §12.
- **No direct publish.** Only the publisher writes final artifacts.
- **No validation bypass.** Output without a validation report does not
  become a deliverable.
- **No contextless generation.** Major deliverables require a context
  bundle assembled by `context-loader.agent`.

## 7. Older / partial design docs

The following root-level files are point-in-time design artifacts. Useful
content has been folded into this index. They are scheduled for
archiving (`docs/_archive/`) and should not be treated as live design
sources:

- `aj-digital-agent-architecture.md`
- `aj-digital-os-scaffold-and-schema.md`
- `copilot-build-prompt-aj-digital-os.md`

If you need them today, treat them as read-only history.
