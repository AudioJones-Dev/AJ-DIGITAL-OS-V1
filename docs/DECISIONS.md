# Architectural Decision Records (ADRs)

This file is the canonical decision log. Each entry captures a load-bearing decision: context, decision, consequences, and status.

New decisions append to this file via PR. Reversals add a new entry referencing the prior one rather than editing history.

---

## ADR-0001 — Local-First Architecture

**Status:** Accepted
**Date:** Established prior to v0.1.0; documented here.

### Context

AJ Digital OS is built for operator trust, deterministic execution, and disconnected operation. A cloud-first model would impose dependencies on availability, billing, and access controls before the runtime could be useful to its operator.

### Decision

The runtime is local-first by default. Run state, conversation history, semantic memory, deliverables, and outputs persist to the local filesystem. Cloud and SaaS shapes are additive deployment options, not the default.

### Consequences

- The system is operable offline for advisory and local workflow execution.
- Operators are responsible for backing up local runtime state.
- Multi-tenant SaaS will sit atop the local-first runtime as an additive deployment, not a replacement.
- Cloud-only features remain non-goals for the current phase (`docs/PRD.md` § 5).

---

## ADR-0002 — File-Backed Bootstrap State

**Status:** Accepted

### Context

Early-phase product needs explicit, inspectable state without requiring database operations to start, debug, or move.

### Decision

State persists to JSON files under `data/` and structured files under `memory/`. The run store, run tracker, approval registry, deliverable registry, and conversation store are all file-backed.

### Consequences

- Operators can inspect, copy, and back up state with regular file tools.
- Migration to a database (e.g., Supabase, Neon) becomes a target-future decision, not a precondition for shipping.
- Concurrency is bounded by single-process operation today.
- Schema versioning will eventually be required (tracked under `docs/ROADMAP.md` Later).

---

## ADR-0003 — Approval-Gated Mutations

**Status:** Accepted

### Context

The runtime executes AI workflows and agent actions that affect business state, content, and external systems. Letting AI act without explicit operator authorization is incompatible with the operator trust model.

### Decision

Every state-mutating action passes through the approval lifecycle:

```
draft → pending_approval → approved → executed
                        ↘ rejected
                        ↘ revision_requested
```

The orchestrator does not auto-execute after validation. The execution coordinator refuses runs not in `approved`. The publisher writes deterministic local artifacts only after execution.

### Consequences

- Human operators stay authoritative.
- Agents and workflows extending the system MUST preserve approval gating.
- Approval channels (Telegram, CLI) need explicit allowlists.
- Future autonomous loops require explicit per-class authorization rather than implicit trust.

---

## ADR-0004 — CLI-First Operator UX

**Status:** Accepted

### Context

Operators need a low-overhead, scriptable, deterministic surface to drive the system. A web UI carries higher engineering and trust cost.

### Decision

The CLI is the primary operator surface. The local web shell (`ui-start`) is a thin local-first control surface, and the Next.js dashboard (`dashboard/`) is a separate workspace for command-center read views. Neither replaces the CLI.

### Consequences

- All operator capability must be reachable from the CLI.
- New features must ship a CLI command before (or alongside) any UI.
- Automation and scripting can rely on `--json` output modes for machine-readable results.
- The CLI command layer is a thin wrapper over agents and services; business rules live in the runtime, not the CLI.

---

## ADR-0005 — Ollama as the Supported Live Provider for Staging

**Status:** Accepted

### Context

Multiple model providers are scaffolded in code (Ollama, OpenAI, Anthropic, LM Studio). Treating all of them as "supported" makes operator onboarding ambiguous and complicates production validation.

### Decision

For the current internal staging path, Ollama is the only supported live provider. Other providers exist as scaffolds but are not part of the supported live model-backed validation set.

### Consequences

- `release:check` validates Ollama-specific configuration first.
- Production envs pin `ACTIVE_MODEL_PROVIDER=ollama` and `ENABLED_MODEL_PROVIDERS=ollama`.
- Other providers can be enabled at operator discretion but operate outside the supported launch path.
- Re-evaluating provider scope is a future ADR, not a runtime decision.

---

## ADR-0006 — Canonical Monitoring Stack: Prometheus + Grafana + Alertmanager + Blackbox

**Status:** Accepted

### Context

Operator-grade observability needs a known stack. The repo accumulated overlapping monitoring scaffolds (root `monitoring/`, `ops/grafana/`, `ops/prometheus/`).

### Decision

The canonical monitoring stack is:

- Prometheus (`monitoring/prometheus.yml`)
- Alertmanager (`monitoring/alertmanager.yml`)
- Blackbox exporter (`monitoring/blackbox.yml`)
- Grafana provisioning (`monitoring/grafana/`)
- Alert rules (`monitoring/alerts/`)

`ops/` retains supporting scaffolds for otel/grafana/prometheus that complement (not replace) the canonical stack.

### Consequences

- Dashboards and alert rules land under `monitoring/`.
- Grafana dashboard map lives at `docs/grafana-dashboard-map.md`.
- Future telemetry additions (e.g., OpenTelemetry collector) extend `ops/otel/` and integrate via the canonical stack.

---

## ADR-0007 — Canonical Compose Location: `compose/docker-compose.yml`

**Status:** Accepted

### Context

Two compose files exist (root `docker-compose.yml` and `compose/docker-compose.yml`). Without a canonical choice, operators do not know which to trust.

### Decision

`compose/docker-compose.yml` is the canonical compose definition. The root `docker-compose.yml` remains for current usage but is treated as legacy. Divergence is reconciled toward `compose/`.

### Consequences

- New compose changes land in `compose/docker-compose.yml`.
- The root compose file is reconciled or removed in a future maintenance pass (tracked on the roadmap).
- Container deploys reference the canonical file.

---

## ADR-0008 — Canonical Dashboard: Next.js Workspace Under `dashboard/`

**Status:** Accepted

### Context

Multiple dashboard surfaces emerged across iterations (CLI dashboard, local web shell, Next.js dashboard). Each has a role; without a stated decision, operators are unsure which is authoritative.

### Decision

- The CLI `dashboard` and `operator-console` commands are the authoritative operator dashboards.
- The local web shell (`ui-start`) is a thin local-first chat/control surface, NOT a dashboard.
- The Next.js `dashboard/` workspace is the canonical browser-based command-center surface, scoped to read views first.

### Consequences

- `dashboard/` evolves as the operator's browser-based command center.
- New rich operator surfaces ship under `dashboard/`, not under `src/ui/`.
- Read models in `src/services/observability/` remain the authoritative data source for all dashboards.

---

## ADR-0009 — Repository Governance Layer (AGENTS.md, CLAUDE.md, PRD, DESIGN, ROADMAP, DECISIONS, SECURITY, DEPLOYMENT)

**Status:** Accepted

### Context

The repository accumulated extensive specs without a stable navigation layer. Agents (Claude, Codex, Copilot, OpenHands) lacked a single operating contract, and operators lacked a stable entry point for product, architecture, and decisions.

### Decision

Install a fixed governance layer at known paths:

- `AGENTS.md` — operating contract for all agents.
- `CLAUDE.md` — Claude-specific overlay.
- `SECURITY.md` (root) + `docs/SECURITY.md` (full policy).
- `docs/PRD.md` — product definition.
- `docs/DESIGN.md` — architecture navigation index.
- `docs/ROADMAP.md` — canonical roadmap.
- `docs/DECISIONS.md` (this file) — ADR log.
- `docs/DEPLOYMENT.md` — deployment index.

### Consequences

- Agents read AGENTS.md before action.
- Architecture navigation flows through DESIGN.md → docs/system/ + docs/architecture/.
- Roadmap and decisions become first-class artifacts.
- Documentation drift becomes a defect, treatable in PRs.

---

## ADR-0010 — Runtime State Stays Out of Version Control

**Status:** Accepted

### Context

Runtime state (`data/`, `memory/`, `output/`, `sessions/`, `runtime/cache/`, `dist/`, `logs/`) accumulates per-operator state and contains sensitive content. Committing it would leak secrets, bloat history, and make merges painful.

### Decision

All runtime state is gitignored. Operators are responsible for their own backup posture. New runtime directories MUST extend `.gitignore` in the same change that introduces them.

### Consequences

- The repo stays small and reviewable.
- Onboarding requires an explicit setup step to create runtime directories.
- Backups are an operator responsibility, not a repository feature.
- Local AI tool config directories (`.claude/`, `.codex/`, etc.) are also gitignored.

---

## How to Add an ADR

Append a new section under the next ADR number with:

- **Status:** Accepted / Proposed / Superseded by ADR-XXXX
- **Date:** (optional)
- **Context:** what forced the decision
- **Decision:** what we decided
- **Consequences:** what falls out of it

Reversals create a new ADR with `Status: Accepted` and reference the prior ADR (which moves to `Status: Superseded by ADR-XXXX`).
