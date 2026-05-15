# Decisions — AJ Digital OS

Architectural Decision Records (ADRs) for AJ Digital OS. These are the
load-bearing choices the rest of the system rests on. Each entry records
the context, the decision, the consequences, and any later revisions.

ADRs are append-only. Do not edit a `Decided` entry to flip its meaning;
add a new ADR that supersedes it.

---

## ADR-0001 — Local-first architecture

- **Status:** Decided. Active.
- **Date:** 2026-04
- **Context:** AJ Digital OS needs to operate reliably without a cloud
  dependency. The primary operator runs the system on a developer
  workstation. Cloud surfaces (Supabase, Sanity, Telegram, n8n) are
  optional integrations, not preconditions for running a workflow,
  resolving an approval, or producing a deliverable.
- **Decision:** All run state, events, deliverables, memory, retrieval,
  cache, attribution, and outputs persist to disk under `data/`,
  `runtime/`, `memory/`, `output/`. No managed service is required to
  start the system. Cloud is an optional mirror.
- **Consequences:**
  - Setup friction is low; a new operator can clone the repo, install
    Ollama, and run the CLI.
  - Multi-machine fan-out, distributed workers, and high-availability
    deploys are explicitly out of scope until the storage migration
    targets in `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
    are addressed.
  - File-backed state must remain the canonical form; cloud mirrors
    can read but never own state until a future ADR supersedes this.

## ADR-0002 — File-backed state during bootstrap

- **Status:** Decided. Active.
- **Date:** 2026-04
- **Context:** Choosing the runtime storage layer was a load-bearing
  decision: it would have been easy to start with Postgres or DynamoDB,
  but every such choice imports a service dependency, schema migrations,
  and connection management before the product itself was stable.
- **Decision:** Bootstrap with JSON / JSONL files under `runtime/`,
  `data/`, and `memory/`. Use Zod for schema validation at write time.
  Defer Neon / Postgres / Redis / pgvector to a later phase.
- **Consequences:**
  - The Layer Coverage Index explicitly lists every file-backed store and
    its eventual migration target (Neon, Redis, pgvector).
  - The store API surface is narrow: `read`, `write`, `append`. New code
    must go through the existing store wrappers, not raw `fs` calls.
  - Migration to a database is expected. Any new persistence today must
    be designed so the migration path is mechanical: a typed schema, an
    append-only log where possible, and no implicit invariants.
- **Superseded by:** none yet. A migration ADR is expected once Neon
  becomes the canonical store for run control.

## ADR-0003 — Approval-gated execution for high-risk actions

- **Status:** Decided. Active.
- **Date:** 2026-04
- **Context:** AJ Digital OS can publish content, send messages, mutate
  external systems, and update client-facing deliverables. Letting
  agents auto-execute is a strict-liability problem; the cost of a wrong
  publish is much higher than the cost of a human pause.
- **Decision:** Every high-risk action passes through an explicit
  `pending_approval` state. Workflow completion does not imply
  execution. The approval resolver (`src/security/approvals/`) and the
  enforcement engine (`src/security/permissions/enforced-execution.ts`)
  own the gate. Restricted commands and L5 actions require human
  approval every time and are never auto-promoted.
- **Consequences:**
  - The state machine in `src/core/state/run-state-machine.ts` is the
    single source of truth for transitions; no agent may bypass it.
  - The cost of every workflow includes operator review time. The CLI
    `operator-console` and `list-pending-approvals` exist to keep that
    cost low.
  - Approval surfaces (Telegram today, future Slack/web) are treated as
    privileged control-plane boundaries per
    `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` §4.

## ADR-0004 — Ollama / local model support as the primary live path

- **Status:** Decided. Active.
- **Date:** 2026-04
- **Context:** Cost, latency, privacy, and offline reliability are all
  better with a local model than a cloud API for AJ Digital's daily
  operational workload. Cloud providers (OpenAI, Anthropic, Perplexity)
  are scaffolded for fallback, escalation, and specialized tasks.
- **Decision:** Ollama on `localhost:11434` is the default provider. The
  default model tag is `llama3.1:8b`, overridable via `OLLAMA_MODEL`.
  Cloud provider scaffolds exist in `src/providers/` but are not part of
  the supported staging launch path. `routeModelTask()` in
  `src/model-routing/` is the central dispatcher and enforces an
  escalation chain only when explicitly configured.
- **Consequences:**
  - Operators must install and run Ollama locally for live model-backed
    output. `assistant-doctor` reports readiness.
  - Provider scaffolds must not be removed; they enable future
    escalation and specialized routing.
  - Smoke and validation tests prefer the deterministic provider over
    live Ollama to keep CI fast and hermetic.

## ADR-0005 — CLI-first operator surface

- **Status:** Decided. Active.
- **Date:** 2026-04
- **Context:** Multiple surfaces compete for attention: dashboard, web
  shell, Telegram, future client portal. Picking one as canonical avoids
  duplicating business logic across surfaces.
- **Decision:** The CLI (`src/cli.ts` + `src/commands/`) is the primary
  operator surface and the canonical entry point for every system
  capability. The Next.js dashboard, Hermes status server, Telegram
  approval flow, and any future GUI are thin layers on top of the same
  command and service layer. Commands never duplicate business logic;
  they delegate to agents and services.
- **Consequences:**
  - Every new capability ships with a CLI command first. Other surfaces
    follow.
  - Tests target the command layer and the underlying services; UI tests
    are not a substitute for command-level tests.
  - JSON mode (`--json`) is a first-class output format on every
    relevant command, so other surfaces and automations can consume CLI
    output without parsing human text.

---

## How to add an ADR

1. Append a new section with the next ADR number.
2. Use the headings above: Status, Date, Context, Decision, Consequences,
   and (if applicable) Superseded by.
3. If the new ADR supersedes an existing one, update the existing one's
   Status to `Superseded by ADR-NNNN`. Do not delete history.
4. Link the ADR from the related spec in `docs/system/` or
   `docs/architecture/` if it changes design behavior.
