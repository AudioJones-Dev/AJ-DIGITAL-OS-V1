# Product Requirements — AJ Digital OS

**Owner:** AJ Digital LLC
**Primary persona:** Audio Jones / AJ Digital operator
**Status:** Living document
**Canonical:** This file. Older docs that overlap (`aj-digital-agent-architecture.md`, `aj-digital-os-scaffold-and-schema.md`, `copilot-build-prompt-aj-digital-os.md`, `BUILD-PROGRESS.md`) are point-in-time artifacts; their useful content has been folded into this PRD, `docs/DESIGN.md`, and `docs/ROADMAP.md`.

---

## 1. What AJ Digital OS is

AJ Digital OS is a **local-first, approval-gated, multi-agent operating
system** for AJ Digital LLC and its clients. It is not a chatbot. It is the
operational substrate that runs brand intelligence, content production,
automation architecture, and client delivery workflows under deterministic
execution and human approval.

The system replaces ad-hoc prompt chains with:

- a control plane that owns run lifecycle and state transitions,
- scoped specialist agents that own narrow domain actions,
- a tool layer that mediates every external integration,
- a security/trust layer that enforces permission levels and audit logging,
- a validation layer that gates output against schemas and brand rules,
- a human approval layer that authorizes high-impact actions,
- a memory and retrieval layer for cache, semantic recall, and run history,
- an attribution layer that records the Meaningful / Actionable /
  Profitable (MAP) signal of every event,
- a CLI-first operator surface, with a Next.js dashboard as the read model.

## 2. Operating principles

These are non-negotiable. They are the same principles enforced in
`src/core/`, `src/security/`, and the system specs under `docs/system/`.

1. **Local-first by default.** Run state, events, deliverables, memory,
   and outputs persist to disk under `data/`, `runtime/`, `memory/`. No
   service is required to start the system. Cloud is an optional mirror,
   not a dependency.
2. **Approval-gated execution.** Workflow output does not auto-publish.
   Runs stop at `pending_approval` until a human decision is recorded
   through the Telegram approval surface or the CLI.
3. **Deterministic execution.** Workflows produce typed outputs against
   Zod schemas. Validation happens before approval, not after publish.
4. **Single-responsibility agents.** Each agent has a role, scope, allowed
   actions, forbidden actions, required inputs, and an output schema.
5. **Schema-first handoffs.** Major stage transitions move structured
   payloads, not freeform text.
6. **Least privilege.** Agents and tools get the smallest permission
   level needed (`docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`).
7. **Audit by default.** Every command, tool call, file write, approval
   decision, and execution emits a structured event into the system
   ledger and attribution log.
8. **CLI is the primary surface.** Other surfaces (dashboard, Telegram,
   future web shell) layer on top of the same commands.

## 3. Who it serves

- **Internal operators** (AJ Digital team): drive runs, resolve approvals,
  inspect failures, ship deliverables.
- **Clients of AJ Digital**: receive published artifacts (brand DNA docs,
  blog drafts, transcript-derived content, automation specs) without ever
  touching the OS directly.
- **AI agents** (Claude Code, Codex, MCP tools, n8n automations): execute
  scoped, governed work under the Security / Trust Layer.

## 4. Core capabilities (in repo today)

| Capability | Module | Status |
|---|---|---|
| Run lifecycle and state machine | `src/control-plane/run-registry/`, `src/core/state/` | Implemented |
| Workflow registry and runners | `src/core/workflows/`, `src/services/` | Implemented |
| Approval system (packets, Telegram, resolver) | `src/security/approvals/`, `src/decision/` | Implemented |
| Execution coordinator and resumer | `src/services/execution/` | Implemented |
| Publish router (local target) | `src/services/publishing/` | Implemented |
| Browser agent (Playwright, session reuse) | `src/browser-agent/` | Implemented |
| Local file-ops agent (allowlist-gated) | `src/local-agent/` | Implemented |
| Model routing (Ollama / OpenAI / deterministic) | `src/model-routing/`, `src/providers/` | Implemented |
| Memory runtime (cognitive store, before/after run hooks) | `src/memory-runtime/`, `src/memory/` | Implemented |
| Retrieval (keyword search, context packs) | `src/retrieval/` | Implemented |
| Cache Augmentation Layer (5 namespaces) | `src/cache/` | Implemented |
| BEL v3 linear execution / BEL v4 DAG | `src/bel/`, `src/bel/dag/` | Implemented |
| MAP / CERA decision engine | `src/decision/` | Implemented |
| Attribution tracker (MAP events) | `src/attribution/` | Implemented |
| Agent permission enforcement | `src/security/permissions/` | Implemented |
| Tenant isolation primitives | `src/security/tenancy/` | Partial |
| MCP secure executor | `src/mcp/`, `src/security/mcp/` | Partial |
| AEO opportunity scorer | `src/aeo/` | Implemented |
| Qualification engine v1 | `src/intelligence/` | Implemented |
| Operator CLI | `src/cli.ts`, `src/commands/` | Implemented |
| Next.js dashboard (read model) | `dashboard/` | Implemented |
| Hermes status server | `src/hermes/` | Implemented |
| Prometheus / Grafana stack | `monitoring/` | Implemented |

For full per-layer coverage with file references, see
`docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`.

## 5. Non-goals

The system is intentionally not:

- A multi-tenant SaaS. Tenant isolation primitives exist but the product
  ships single-tenant local-first today.
- A general-purpose chatbot. Assistant mode is one surface among many; it
  defaults to advisory output and never bypasses the approval gate.
- A cloud database. State is file-backed; Neon/Postgres/Redis are listed
  in `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` as
  migration targets, not current dependencies.
- A vector store. Retrieval is keyword-first; pgvector is a roadmap item.
- A unified scheduling system. n8n and cron drive external scheduling; the
  OS is invoked by those triggers, not the other way around.

## 6. Supported launch profile

Today the supported live model-backed path is **Ollama on localhost**.
Other provider scaffolds exist in `src/providers/` but are not part of the
staged launch path.

Required environment for a working install:

- Node.js 20+ and npm.
- Ollama installed locally with at least one chat model pulled
  (default tag `llama3.1:8b`, overridable via `OLLAMA_MODEL`).
- Writable directories under `data/`, `memory/`, `runtime/`.
- Optional: Telegram bot token + chat id for the approval surface;
  Supabase project for the control mirror; Sanity project for CMS
  publishing target.

See `.env.example` for the full environment matrix.

## 7. Lifecycle of a run

```text
created
  -> validated
  -> pending_approval
  -> approved | rejected | revision_requested
  -> execution
  -> executed | failed | skipped | denied
```

Each transition is enforced by `src/core/state/run-state-machine.ts`. The
orchestrator never jumps states; the approval resolver and execution
coordinator each own their own transitions. Detail in `docs/DESIGN.md`.

## 8. Stack

- TypeScript (strict), Node 20, ES modules.
- Zod for schemas, Vitest for tests, Playwright for browser automation.
- prom-client for metrics; Hermes status server for live state.
- Next.js (App Router) for the dashboard.
- Docker compose stack for local Ollama + monitoring + n8n.
- PowerShell scripts for Windows ops (`scripts/*.ps1`).

## 9. Open product questions

- When does the system move from file-backed runtime to Neon for run
  control and approvals? Tracked under `docs/ROADMAP.md` and
  `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`.
- When does multi-tenant client isolation graduate from primitive to
  enforced? Tracked in `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`.
- What is the canonical messaging surface beyond Telegram (Slack, web
  app)? Open.
- How is the Optimization Layer (L15) seeded — manual review or
  automated CERA loop reading the attribution log? Open.

## 10. Pointers

- Design: `docs/DESIGN.md`
- Roadmap: `docs/ROADMAP.md`
- Decisions: `docs/DECISIONS.md`
- Security: `docs/SECURITY.md`
- Deployment: `docs/DEPLOYMENT.md`
- Operator runbook: `docs/operator-playbook.md`
- Onboarding: `docs/onboarding.md`
