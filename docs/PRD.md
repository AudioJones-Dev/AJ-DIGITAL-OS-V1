# AJ Digital OS — Product Requirements Document (PRD)

**Status:** Living document
**Authority:** This document defines product intent. For implementation specs, see `docs/system/` and `docs/architecture/`.

---

## 1. Vision

AJ Digital OS is an applied intelligent system for business operations. It exists to reduce the prediction error every business carries across marketing, sales, content, fulfillment, and intelligence by stacking validated signal, deterministic execution, and approval-gated autonomy on a local-first runtime.

Operating doctrine:

> Signal > Noise. Systems > Hacks. Data before automation. Attribution or it didn't happen.
> AI explores ambiguity. Scripts execute repetition. Humans govern risk.

---

## 2. Target Users

**Primary (today):** AJ Digital LLC operators using the system internally to deliver client work and run the business.

**Secondary (near-term):** Trusted technical operators inside partner businesses who want a local-first AI runtime they can govern.

**Future (SaaS direction):** Small and mid-sized businesses adopting AJ Digital OS as a multi-tenant managed runtime.

---

## 3. Operating Model

AJ Digital OS treats the human operator as authoritative. The runtime stays advisory by default and only mutates state through a controlled approval lifecycle:

```
draft → pending_approval → approved → executed
                        ↘ rejected
                        ↘ revision_requested
```

Operator surfaces:

- **CLI** — primary surface; full operator capability.
- **Local web shell** (`ui-start`) — thin local-first chat/control surface.
- **Next.js dashboard** (`dashboard/`) — separate workspace, command-center read views.
- **Telegram control plane** — approval requests and remote operator actions.

---

## 4. Major Subsystems

| Subsystem               | Purpose                                                                |
|-------------------------|------------------------------------------------------------------------|
| Workflow runtime        | Deterministic workflows producing typed outputs                        |
| Run lifecycle           | Persisted state machine over each workflow execution                   |
| Approval system         | Human-in-the-loop gate for all state-mutating actions                  |
| Execution system        | Policy → coordinator → resumer → agent → publisher pipeline            |
| Publish router          | Local-first publisher with extension points (Sanity, Notion, n8n, etc.)|
| Observability           | Run tracker, run summary, dashboard, operator console                  |
| Assistant runtime       | Operator-facing AI assistant in advisory or orchestrated mode          |
| Conversation memory     | Persisted conversation threads, turns, context bundles                 |
| Semantic memory         | Local-first chunks, embeddings, retrieval index                        |
| Skills layer            | Markdown-defined reusable capability definitions                       |
| Provider abstraction    | Ollama (live), OpenAI/Anthropic/LM Studio scaffolds                    |
| Model routing           | Provider/model selection with constraint enforcement                   |
| Browser execution (BEL) | Controlled browser automation for UI-only workflows                    |
| MCP tool layer          | Registered tools with policy + secure execution                        |
| Hermes scheduler        | Mission scheduling, failure watcher, status API                        |
| Telegram control plane  | Operator-grade remote control                                          |
| Permission enforcement  | Action-level enforcement engine for agent and tool calls               |
| Multi-tenant isolation  | Client/tenant context scaffolding                                      |
| Qualification engine    | Deterministic business-readiness scoring (commercialization gate)      |
| Webhook security        | Signed approval/execution webhooks (HMAC + freshness + replay)         |
| Monitoring stack        | Prometheus, Grafana, Alertmanager, Blackbox                            |
| Dashboard (Next.js)     | Command center read views                                              |

---

## 5. Non-Goals (Today)

- Hosted multi-tenant SaaS.
- Continuous always-on autonomous agent loops without operator gating.
- Cloud-only persistence.
- A web UI that replaces the CLI.
- Live OAuth flows for every integration scaffolded in code.
- Fine-tuning jobs from inside the runtime.
- Plug-and-play customer self-service install.

These remain compatible with the architecture but are explicitly out of scope for the current phase.

---

## 6. Current Maturity

Coverage is tracked per-layer in `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`. As of the current version:

- **Functional:** Workflow runtime, run lifecycle, approvals, execution, publishing, observability, CLI, monitoring stack, Hermes scheduler, model routing, memory runtime.
- **Partial:** Intelligence/scoring, agent execution diversity, BEL v3 maturation, attribution layer, dashboard depth, guardrails coverage.
- **Defined / Planned:** Offer engine, full module layer activation, Next.js admin surface, multi-tenant deployment isolation, n8n server in-stack.

The qualification engine v1 is the most recent intelligence-layer addition and is extraction-ready for downstream attribution and deployment-planner integration.

---

## 7. Deployment Philosophy

- **Local-first by default.** Every operator can run the system without cloud dependencies.
- **Single-process today.** No long-running web service entrypoint; the operator console in watch mode is the staging launch path.
- **Container-ready.** `Dockerfile`, `docker-compose.yml`, monitoring stack, and `Procfile` exist for hosted deployments.
- **Approval-aware staging.** `release:check` gates production startup; production environment requires explicit env configuration.

For the canonical deployment path, see `docs/DEPLOYMENT.md`.

---

## 8. Local-First Philosophy

- Run state, conversation history, semantic memory, deliverables, and outputs persist to the local filesystem.
- Generated artifacts route through brand-aware output roots (`drafts`, `pending`, `approved`, `published`).
- Live model inference is Ollama-first; other providers are scaffolded but not the supported live path.
- Operator-grade observability does not require external services.
- The system is operable disconnected from the internet for advisory and local workflow execution.

---

## 9. Future SaaS Direction

The architecture deliberately leaves room for a managed multi-tenant offering:

- Stripe scaffolding (3 tiers, signed webhook verification).
- Supabase provisioning stub for tenant onboarding.
- Client isolation spec under `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`.
- Offer engine layer (currently Defined) for AI readiness scoring and offer routing.

The local-first runtime is the substrate. SaaS is an additive deployment shape, not a replacement.

---

## 10. Success Criteria (Current Phase)

The current phase is successful when an internal AJ Digital operator can:

1. Install and start the runtime via documented commands.
2. Run a workflow end-to-end through approval and execution without leaving the CLI.
3. Inspect any run's lifecycle, events, and outputs from the operator console.
4. Recover from a failed run using the recovery playbook.
5. Add a new skill or workflow without modifying core runtime logic.
6. Trust that webhook traffic is verified and approval gates are enforced.

Future phases extend this to partner operators, hosted deployments, and SaaS tenants.

---

## 11. Document Map

| Concern                             | Document                                              |
|-------------------------------------|-------------------------------------------------------|
| Operating contract for agents       | `AGENTS.md`                                           |
| Architecture navigation             | `docs/DESIGN.md`                                      |
| Master architecture schema          | `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md` |
| Layer model                         | `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md` |
| Layer coverage                      | `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` |
| Roadmap                             | `docs/ROADMAP.md`                                     |
| Decisions (ADRs)                    | `docs/DECISIONS.md`                                   |
| Security                            | `docs/SECURITY.md`                                    |
| Deployment                          | `docs/DEPLOYMENT.md`                                  |
| Operator playbook                   | `docs/operator-playbook.md`                           |
| Recovery playbook                   | `docs/recovery-playbook.md`                           |
