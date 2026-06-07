# AJ Digital OS — Canonical Systems, Cascading Layers, Clusters, and Tech Stack

**Type:** Implementation-facing system map (architecture reference)
**Status:** Active
**Owner:** AJ Digital LLC
**Canonical source of truth:** `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
**Relationship:** This document sits *beside* the layer model spec and does not replace it. The layer model spec defines the architecture; this document maps named systems, cascading sub-systems, clusters, and tech stack into each layer for implementation.
**Governed by:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md`

---

## 1. Executive Summary

AJ Digital OS is a governed business/AI operating system. It coordinates business data, AI agents, human approvals, workflows, client context, tool integrations, attribution, ROI tracking, spend reduction, and profit growth into one measurable system.

This document is the four-level implementation map:

```txt
Layer → Cascading Systems → Clusters → Named Tech Stack
```

It exists so every named tool (Claude, Codex, n8n, GitHub, Obsidian, Telnyx, Vapi, PostgreSQL, etc.) is mapped to the layer and system it belongs to, what governs it, and what it must never bypass — rather than being treated as a standalone architecture.

## 2. Core Architecture Principle

- Tools are not the system. Tools are resources governed by the system.
- Agents are processes. Workflows are programs. The Control Plane is the scheduler.
- Attribution or it did not happen.
- Normalize before automation.
- Governance before scale.
- Control before execution.
- Profit and spend are the final scoreboards.

A single tool may appear in multiple layers (e.g. GitHub is infrastructure, a connector, and an observability source). That is expected. What matters is that each *use* of a tool is governed by the layer it operates in.

## 3. Master Dependency Map

```txt
Business Outcome Layer
  ↑
Optimization Layer
  ↑
Attribution Layer
  ↑
Observability Layer
  ↑
Application Layer
  ↑
Interface / Shell Layer
  ↑
Governance Layer
  ↑
Agent Execution Layer
  ↑
Orchestration Layer
  ↑
Intelligence Layer
  ↑
Memory Layer
  ↑
Data Normalization Layer
  ↑
Data Ingestion Layer
  ↑
Connector / Driver Layer
  ↑
Control Plane / Kernel Layer
  ↑
Infrastructure Layer
```

The map reads **bottom-up for dependency** (what the OS needs to function) and **top-down for business intent** (why the OS exists).

---

## 4. Canonical Layer Breakdown

Each layer is documented with: function, traditional OS equivalent, cascading systems, clusters, named tech stack, relationship to adjacent layers, what must never bypass it, and acceptance criteria.

---

### Layer 1 — Infrastructure Layer

**Function:** Physical, local, cloud, repo, runtime, storage, and deployment substrate where AJ Digital OS runs.
**OS equivalent:** Hardware, disk, network, virtual machines, deployment environments.

**Cascading systems & clusters:**

- **Local Runtime System** — Windows 11, WSL2 Ubuntu, Docker Desktop, Node.js, PNPM, Python, uv, PowerShell, VS Code, Git.
- **Repository Infrastructure System** — GitHub, Git, GitHub Actions, PRs, branches, architecture docs, issue tracking.
- **Storage Infrastructure System** — Obsidian vault, Google Drive, local Windows file system, GitHub repo docs, Cloudflare R2 (if adopted).
- **Database Infrastructure System** — PostgreSQL, Supabase or Neon, Redis, pgvector, SQLite (local-first lightweight use).

**Relationship:** Supports every layer above. Must be abstracted so agents and workflows never depend on one fragile tool.
**Must not bypass:** Environment/secret policy. No hardcoded secrets; `.env.example` defines expected config. Firebase must not be reintroduced.
**Acceptance criteria:** Local-first execution works before any SaaS expansion; internal AJ infra is separable from client infra; config is externalized and typed.

---

### Layer 2 — Control Plane / Kernel Layer

**Function:** The core authority. Decides what can run, when, who approved it, what state it is in, and whether it may continue.
**OS equivalent:** Kernel, system calls, protected execution, scheduler, memory protection.

**Cascading systems & clusters:**

- **Run Registry System** — run ID registry, ownership, status, timestamps, input/output references, risk classification. Stack: PostgreSQL, Supabase/Neon, GitHub PR metadata where relevant, local JSON run logs during early build.
- **State Machine System** — legal transition rules (`draft → queued → approved → running → completed`, plus reject/fail/retry paths). Stack: TypeScript state machine module, Zod schemas, PostgreSQL persistence, Vitest coverage.
- **Approval Gate System** — triggers on send email, post publicly, modify client data, spend money, deploy code, change secrets, delete records, update production, make legal/financial/medical claims, modify governance docs. Stack: web dashboard approval inbox, Telegram approval bot, Gmail draft review, GitHub PR review.
- **Permission Enforcement System** — role-based access, tenant isolation, tool permissions, memory-scope permissions, secret boundaries. Stack: Clerk / Auth.js / Supabase Auth, Doppler, GitHub permissions, Google OAuth, local policy files.
- **Tenant Isolation System** and **Audit Authority System** — enforce per-client boundaries and emit immutable audit events.

**Relationship:** Governs the Agent Execution, Orchestration, and Connector layers. Sits directly above Infrastructure.
**Must not bypass:** No agent executes freely; every meaningful action registers a run and passes a policy check. In this repo this is enforced by `.codex/hooks.json` → `.codex/hooks/repo_policy.py`.
**Acceptance criteria:** Register run → validate state → validate action → classify risk → require approval when needed → execute → emit audit → persist; invalid/unauthorized transitions are blocked.

---

### Layer 3 — Connector / Driver Layer

**Function:** Communication with external tools, APIs, platforms, and files.
**OS equivalent:** Device drivers.

**Cascading systems & clusters:**

- **Communication Connectors** — Gmail, Google Calendar, Google Contacts, Telegram, Slack, Discord, Telnyx, Twilio, Resend/SendGrid.
- **Repo / Builder Connectors** — GitHub, Claude Code, Codex, Copilot, VS Code.
- **Automation Connectors** — n8n, GitHub Actions, Cron, Hermes scheduled jobs, Webhooks.
- **Voice / AI Receptionist Connectors** — Vapi, Telnyx, Aircall, Dialpad, Twilio, Retell (if evaluated), Bland (if evaluated), LiveKit (if adopted).
- **Knowledge / Content Connectors** — Obsidian, Google Drive, Sanity, Notion (if adopted), WordPress/Webflow (if client-required), YouTube, LinkedIn, Instagram, TikTok.

**Relationship:** Exposes external capability to Ingestion, Orchestration, and Agents. Each connector registers with the Control Plane before execution.
**Must not bypass:** High-risk connector actions require Control Plane approval. Tools are devices attached to the OS, never the OS itself.
**Acceptance criteria:** Every connector exposes a stable `OSConnector` interface (id, provider, capabilities, authType, riskLevel, execute) and declares its risk level.

---

### Layer 4 — Data Ingestion Layer

**Function:** Collects raw inputs from business systems, files, APIs, conversations, forms, and commands.
**OS equivalent:** Input subsystem, device events, network input.

**Cascading systems & clusters:**

- **Human Input Ingestion** — ChatGPT, Claude, Telegram, Slack/Discord, Obsidian, web forms, Google Forms, Typeform (if adopted).
- **Business System Ingestion** — HubSpot, Airtable, Google Sheets, Gmail, Google Drive, Stripe, QuickBooks (if adopted), client CRMs.
- **Voice / Conversation Ingestion** — Vapi, Telnyx, Aircall, Dialpad, Twilio, Gong/Fireflies/Otter (if adopted).
- **Repo / Development Ingestion** — GitHub, GitHub Actions, Claude Code logs, Codex logs, Copilot outputs, local terminal logs, Docker logs.
- **Webhook Ingestion** and **Client Onboarding Ingestion**.

**Relationship:** Feeds Normalization. No intelligence layer outperforms its input layer.
**Must not bypass:** Every ingested item produces a normalized `IngestionEvent` with a confidentiality classification.
**Acceptance criteria:** All sources emit `IngestionEvent` (id, tenantId, source, sourceType, rawPayloadRef, receivedAt, classification, status).

---

### Layer 5 — Data Normalization Layer

**Function:** Transforms messy data into structured, reusable, machine-readable records.
**OS equivalent:** File-system indexing, structured metadata, registries.

**Cascading systems & clusters:**

- **Entity Normalization System** — Tenant, User, Client, Contact, Lead, Vendor, Project, Offer, Asset, Invoice, Job, Workflow, Agent. Stack: TypeScript schemas, Zod, PostgreSQL, Airtable/Google Sheets (temporary mode).
- **Document Normalization System** — classification, metadata extraction, chunking, source attribution, versioning, confidentiality. Stack: Obsidian Markdown, Google Drive, GitHub docs, Sanity schemas, pgvector.
- **Event Normalization System** — IngestionEvent, RunEvent, ApprovalEvent, AttributionEvent, ErrorEvent, AgentActionEvent, WorkflowEvent. Stack: PostgreSQL event table, JSON schema, Zod.
- **Lead / Offer / SOP / Attribution Normalization Systems**.

**Relationship:** Sits between Ingestion and Memory. Normalize before automation.
**Must not bypass:** No application stores unnormalized business-critical data.
**Acceptance criteria:** The standard normalized objects (Tenant, Client, Lead, Offer, Asset, Workflow, Agent, Run, Event, AttributionEvent, MAPScore, SOP, KnowledgeDocument, ApprovalRequest) validate against schemas.

---

### Layer 6 — Memory Layer

**Function:** Stores and retrieves persistent business context.
**OS equivalent:** RAM, cache, disk, registry, search index.

**Cascading systems & clusters:**

- **Working Memory Cluster** — current task/run context. Stack: Redis, local JSON, agent runtime memory, PostgreSQL run context. In repo: `memory/working-context/`.
- **Persistent Business Memory Cluster** — doctrine, offers, positioning, client profiles, SOPs, decisions, mistakes. Stack: Obsidian, GitHub Markdown, PostgreSQL, Google Drive, Sanity. In repo: `memory/decisions/`, `memory/mistakes/`, `memory/sops/`.
- **Client / Brand / SOP-Procedural Memory Clusters**.
- **Semantic Retrieval Cluster** — RAG, context lookup. Stack: pgvector, Supabase Vector, Chroma (local-first), LanceDB (if adopted), embeddings.
- **Episodic Run History Cluster** — `memory/run-logs/`.
- **Attribution Memory Cluster** — ROI/MAP evidence. Stack: PostgreSQL, analytics dashboard, Grafana/Metabase (if adopted).

**Relationship:** Serves Intelligence, Control Plane, Observability, Attribution. Governed by the Memory Router and per-agent retrieval policies (`memory/retrieval/retrieval-policy-*.json`).
**Must not bypass:** Agents read memory only through the governed Router and the correct policy — never the full vault directly. No agent writes canonical memory without policy checks and approval state.
**Acceptance criteria:** Memory types (working, persistent, semantic, episodic, procedural, brand, attribution) are addressable; retrieval is policy-bounded and tenant-isolated.

---

### Layer 7 — Intelligence Layer

**Function:** Reasoning, retrieval, scoring, classification, prioritization, decision support.
**OS equivalent:** System intelligence, search, diagnostics, enterprise analytics.

**Cascading systems & clusters:**

- **Reasoning Cluster** — ChatGPT, Claude, Codex (code reasoning), Perplexity (research), Gemini/local models (if adopted).
- **Retrieval Intelligence Cluster** — pgvector, Obsidian, GitHub docs, Google Drive, Sanity, model context windows, local retrieval scripts.
- **Scoring Cluster** — MAP score, lead score, risk score, content opportunity score, workflow ROI score, AI readiness score, revenue leak score. Stack: TypeScript scoring modules, PostgreSQL, Python analytics, Google Sheets (early manual).
- **Diagnostic Cluster** — Founder Revenue Leak Audit, AI Readiness Diagnostic, Speed-to-Lead, Business Memory, Offer Clarity, Workflow Bottleneck. Stack: Next.js, TypeScript, PostgreSQL, Claude/ChatGPT, HubSpot.
- **Risk Classification / Recommendation / Strategic Analysis Clusters**.

**Relationship:** Consumes Memory, feeds Orchestration and Agents.
**Must not bypass:** Intelligence must produce decisions, not just summaries.
**Acceptance criteria:** Every intelligence output carries recommended action, confidence, source references, risk level, business-impact estimate, required approval level, attribution target, and MAP classification.

---

### Layer 8 — Orchestration Layer

**Function:** Coordinates multi-step workflows, dependencies, retries, approvals, sequencing.
**OS equivalent:** Task/process scheduler, system services, background jobs.

**Cascading systems & clusters:**

- **Workflow Graph Cluster** — DAGs (Ingest → Normalize → Score → Diagnose → Recommend → Approve → CRM task → Attribution event). Stack: n8n, TypeScript workflow engine, GitHub Actions, Temporal (later), BullMQ + Redis (if adopted).
- **Scheduling Cluster** — n8n cron, GitHub Actions scheduled workflows, Hermes scheduled jobs, Windows Task Scheduler, Cloudflare Workers Cron (if adopted).
- **Queue / Retry Cluster**, **Event Trigger Cluster**.
- **Human-in-the-Loop Cluster** — Telegram, Slack/Discord threads, web approval inbox, Gmail drafts, GitHub PR review.
- **Failure Recovery Cluster** — PostgreSQL run status, Redis queue, n8n error workflows, GitHub issues, Sentry (if adopted), Grafana logs.

**Relationship:** Requests state transitions from the Control Plane (which decides validity); drives Agents.
**Must not bypass:** No workflow bypasses the Control Plane. Workflows are explicit graphs, not hidden prompt chains.
**Acceptance criteria:** Complex workflows with dependencies are represented as DAGs with explicit retry, timeout, and approval checkpoints.

---

### Layer 9 — Agent Execution Layer

**Function:** Runs scoped AI workers inside the governed environment.
**OS equivalent:** Processes, threads, execution contexts.

**Cascading systems & clusters:**

- **Builder Agent Cluster** — Claude Code, Codex, Copilot, VS Code, GitHub. Allowed: inspect, plan, modify branches, run tests, create docs, prepare PRs. Must not bypass: git review, tests, secrets policy, production deploy approval.
- **Research Agent Cluster** — ChatGPT, Claude, Perplexity, browser tools, Google Drive, Obsidian. Must output claims, sources, confidence, contradictions, unknowns, recommended action.
- **Business Intelligence Agent Cluster** — revenue leak, AI readiness, offer strategy, CRM intelligence, content opportunity, attribution analyst. Stack: ChatGPT, Claude, HubSpot, Google Sheets, PostgreSQL, Airtable, Obsidian.
- **Voice / Receptionist Agent Cluster** — Vapi, Telnyx, Aircall, Dialpad, Twilio, HubSpot, Google Calendar, Gmail/Resend.
- **QA / Auditor Agent Cluster** — Claude Code, Codex, GitHub Actions, CodeRabbit (if adopted), architecture checklist, tests.
- **Browser / Repository / Data Analyst Agent Clusters**.

**Relationship:** Scheduled by the Control Plane; constrained by Governance.
**Must not bypass:** No agent executes without a registered run. Each agent defines an `OSAgent` manifest (allowed/forbidden actions, required tools, memory scope, approval-required actions, output schema). Agents never hold unrestricted access to tools, credentials, memory, or client data.
**Acceptance criteria:** Every agent has a manifest, a memory scope, and declared approval requirements.

---

### Layer 10 — Governance Layer

**Function:** Rules, constraints, approval requirements, brand rules, legal boundaries, operating standards.
**OS equivalent:** Group Policy, Active Directory policy, UAC.

**Cascading systems & clusters:**

- **Brand Governance Cluster** — Obsidian brand doctrine, GitHub docs, Sanity brand content, writing agents.
- **Legal / Claims Governance Cluster** — blocks unsupported claims (investment, medical/legal/financial, ROI promises, public case studies, testimonials). Stack: claims registry, source registry, approval workflow, GitHub doc review, human approval.
- **Data Governance Cluster** — PostgreSQL RLS (if Supabase), Clerk/Auth.js/Supabase Auth, Doppler, Google Workspace permissions, GitHub secrets, `.env.example`.
- **Execution Governance Cluster** — agent manifests, permission schemas, Control Plane, approval gates, audit logs.
- **Client / Offer / Security Governance Clusters**.

**Relationship:** Constrains Agents, Connectors, Applications, and Interface.
**Must not bypass:** No public claim ships without claims governance. Governance turns AI from a creative assistant into a business-safe execution layer.
**Acceptance criteria:** Each governance category has a defined rule set and an escalation path.

---

### Layer 11 — Interface / Shell Layer

**Function:** Human-facing command surfaces for operating the OS.
**OS equivalent:** Desktop, Start Menu, Terminal, File Explorer, Settings.

**Cascading systems & clusters:**

- **Command Center Cluster** — view runs, start workflows, approve/reject, inspect audit trail, view attribution, monitor ROI, manage agents. Stack: Next.js, React, Tailwind, shadcn/ui, PostgreSQL, Clerk/Auth.js/Supabase Auth, Grafana/custom dashboard.
- **Mobile / Messaging Command Cluster** — Telegram, Slack, Discord, PWA, mobile web.
- **Client Portal Cluster** — intake, approvals, reports, deliverables, ROI dashboard. Stack: Next.js, Clerk/Supabase Auth, Stripe, Sanity, Google Drive, PostgreSQL.
- **Approval Inbox / Run Console / Agent Status Monitor Clusters**.

**Relationship:** Surfaces the layers below; routes approvals to the Control Plane.
**Must not bypass:** The interface exposes control, not complexity. Approval actions taken in the interface still pass Control Plane validation.
**Acceptance criteria:** Operators can view, approve, start, inspect, and monitor without bypassing governance.

---

### Layer 12 — Application / Module Layer

**Function:** Modular business applications powered by the OS.
**OS equivalent:** Word, Excel, Outlook, Teams.

**Cascading systems & clusters:**

- **Founder Intelligence System Cluster** (flagship) — Founder Revenue Leak Audit, AI Readiness Diagnostic, Business Memory Install, Speed-to-Lead System, Attribution Dashboard, Offer Engine, Workflow Builder. Stack: Next.js, PostgreSQL, Claude/ChatGPT, HubSpot, Google Sheets, Obsidian, Sanity.
- **Voice Agent / AI Receptionist Cluster** — missed-call capture, voice intake, qualification, booking, follow-up, call summary, CRM update. Stack: Vapi, Telnyx, Aircall, Dialpad, Twilio, HubSpot, Google Calendar, Gmail/Resend.
- **Content / Authority Engine Cluster** — LinkedIn, YouTube, newsletter, SEO/AEO, Podcast Authority, repurposing, case-study generator. Stack: Sanity, Next.js, YouTube, LinkedIn, Descript/Riverside (if used), Remotion (`aj-video-engine`), Obsidian, Google Drive.
- **Internal Ops Cluster** — daily digest, repo review, client status, invoice prep, task routing, research archive, decision/mistake logs. Stack: Obsidian, GitHub, n8n, Telegram/Slack/Discord, Gmail, Google Calendar/Drive, Claude Code, Codex.
- **Website Engine / CRM Intelligence / Proposal Generator / Attribution Dashboard Clusters**.

**Relationship:** Applications are modules that share memory, rules, identity, attribution, and execution.
**Must not bypass:** Each application declares purpose, inputs, outputs, required agents/connectors, memory scope, approval rules, attribution events, success metrics, failure modes.
**Acceptance criteria:** No module is "done" without an attribution event and declared success metric.

---

### Layer 13 — Observability Layer

**Function:** Tracks what happened, why, who approved it, what it cost, and what outcome it produced.
**OS equivalent:** Event Viewer, Task Manager, Resource Monitor.

**Cascading systems & clusters:**

- **Run Observability Cluster** — PostgreSQL logs, JSON logs, GitHub Actions logs, n8n execution logs, Docker logs, Grafana, Prometheus.
- **Agent Observability Cluster** — agent run logs, OpenTelemetry (if adopted), LangSmith (if adopted), custom dashboard, GitHub PR reports.
- **Workflow / Cost / Error-Incident Observability Clusters**.
- **Business Observability Cluster** — HubSpot, Google Analytics, Search Console, Stripe, PostgreSQL, Grafana/Metabase.

**Relationship:** Reads from every layer; feeds Attribution and Optimization.
**Must not bypass:** No meaningful action is complete without observability. If it is not observable it cannot be improved.
**Acceptance criteria:** Required metrics emitted — run count, success/failure rate, approval wait time, execution time, cost per run, tool/API spend, lead conversion impact, revenue influence, time saved, MAP compliance rate, attribution coverage.

---

### Layer 14 — Attribution Layer

**Function:** Connects activity to business outcomes. Commercially distinct.
**OS equivalent:** None — business-native.

**Cascading systems & clusters:**

- **MAP Scoring Cluster** — Meaningful, Actionable, Profitable. Stack: TypeScript scoring module, PostgreSQL, dashboard, agent evaluation prompts.
- **Revenue Attribution Cluster** — lead source, offer, channel, agent/workflow involvement, conversion event, value. Stack: HubSpot, Stripe, Google Analytics, Search Console, PostgreSQL, custom dashboard.
- **Cost / Time Savings Attribution Cluster** — time estimates, cost logs, workflow logs, manual baselines, PostgreSQL, dashboard.
- **Lead Journey / Agent-to-Outcome / Content-to-Conversion Attribution Clusters**.

**Relationship:** Consumes Observability; feeds Optimization and Business Outcome.
**Must not bypass:** Attribution or it did not happen. No business-impacting action is complete without an attribution event.
**Acceptance criteria:** Meaningful actions emit a standard `AttributionEvent` with `mapScore` and optional `businessOutcome`.

---

### Layer 15 — Optimization Layer

**Function:** Improves workflows, agents, offers, content, conversion, cost efficiency, outcomes over time.
**OS equivalent:** Performance tuning, updates, diagnostics.

**Cascading systems & clusters:**

- **Workflow Optimization Cluster** — n8n execution history, PostgreSQL logs, Grafana, agent evaluator, GitHub issues.
- **Agent Optimization Cluster** — Claude, ChatGPT, Codex, Claude Code, prompt registry, test suites, evaluation reports.
- **Offer / Business Optimization Cluster** — HubSpot, website analytics, Search Console, Stripe, Obsidian strategy docs, attribution dashboard.
- **Cost / Conversion / Prompt-Context Optimization Clusters**.

**Relationship:** Closes the loop: `Execute → Observe → Attribute → Evaluate → Optimize → Redeploy`.
**Must not bypass:** Optimization before expansion.
**Acceptance criteria:** Every optimization cites the observability/attribution evidence that justifies it.

---

### Layer 16 — Business Outcome Layer

**Function:** Defines why the OS exists commercially.
**OS equivalent:** None — business objective layer.

**Cascading systems & clusters:**

- **Spend Reduction Cluster** — time saved, tools removed, manual steps automated, rework reduced, failed handoffs reduced.
- **Profit Growth Cluster** — leads captured, conversion rate, response time, revenue influenced, pipeline value, retention.
- **Risk Reduction Cluster** — approval compliance, claims compliance, data-access violations avoided, failed runs reduced, unauthorized actions blocked.
- **Signal Increase Cluster** — better prioritization, diagnostics, recommendations, context retrieval, lower prediction error.

**Relationship:** Top of the stack; every lower layer must eventually serve one of these outcomes.
**Must not bypass:** Businesses have two core problems — spend and profit. Every layer must serve one of them.
**Acceptance criteria:** Each shipped capability maps to at least one outcome cluster with a measurable indicator.

---

## 5. Named Tech Stack Mapping

| Tool / Technology | Primary Layer | Secondary Layer(s) | Role | Governed By | Must Not Bypass |
|---|---|---|---|---|---|
| Windows 11 | Infrastructure | — | Local host environment | Infra policy | Secret policy |
| WSL2 Ubuntu | Infrastructure | — | Linux-compatible runtime | Infra policy | Secret policy |
| Docker Desktop | Infrastructure | Orchestration | Containerized local services | Infra policy | Control Plane |
| Node.js / PNPM | Infrastructure | Agent Execution | JS runtime / package mgr | Infra policy | — |
| Python / uv | Infrastructure | Intelligence | Analytics/scoring runtime | Infra policy | — |
| PowerShell | Infrastructure | Orchestration | Local automation scripts | Infra policy | Approval gates |
| Git | Infrastructure | Repo Connector | Version control | Repo policy | PR review |
| GitHub | Infrastructure | Connector / Observability | Repo, PRs, issues, logs | Repo policy + `repo_policy.py` | PR review, secrets policy |
| GitHub Actions | Orchestration | Observability | CI / scheduled workflows | Governance | Control Plane |
| VS Code | Infrastructure | Agent Execution | Local dev shell | Repo policy | — |
| Claude Code | Agent Execution | Repo Connector | Builder/review agent | Agentic Standard + retrieval-policy-claude | git review, tests, deploy approval |
| Codex | Agent Execution | Repo Connector | Builder/review agent | Agentic Standard + retrieval-policy-codex | git review, tests, `repo_policy.py` |
| Copilot | Agent Execution | — | IDE assistant | Repo policy | PR review |
| Hermes | Agent Execution | Orchestration / Interface | Local agent runner, scheduled jobs | Governance + retrieval-policy-hermes | Control Plane |
| OpenClaw | Agent Execution | — | Agent runner / experimentation | Governance | Control Plane |
| n8n | Orchestration | Connector | Workflow automation device | Control Plane | Control Plane |
| Obsidian | Memory | Interface | Human-readable vault / doctrine | Memory Router | Direct full-vault agent reads |
| Google Drive | Infrastructure | Connector / Memory | File storage / knowledge source | Data Governance | Confidentiality classification |
| Gmail | Connector | Ingestion / Interface | Email in/out | Approval gates | Send approval |
| Google Calendar | Connector | Ingestion / Application | Scheduling | Governance | — |
| Google Sheets | Infrastructure | Normalization / Application | Lightweight tables/prototypes | Data Governance | Normalization |
| Airtable | Infrastructure | Normalization / Application | Lightweight operational DB | Data Governance | Normalization |
| PostgreSQL | Infrastructure | Memory / Control / Attribution | Core structured DB | Data Governance | Migration approval |
| Supabase / Neon | Infrastructure | Memory / Control | Managed Postgres | Data Governance | Migration approval |
| Redis | Infrastructure | Orchestration / Working Memory | Queue / cache | Infra policy | — |
| pgvector | Memory | Intelligence | Semantic retrieval | Memory Router | Tenant isolation |
| Sanity | Memory | Application / Content | CMS / public content memory | Brand + Claims Governance | Claims governance |
| HubSpot | Connector | Application / Attribution | CRM / revenue tracking | Data + Client Governance | Client boundary |
| Vapi | Connector | Agent Execution / Application | Voice agent | Governance + approval gates | Control Plane |
| Telnyx | Connector | Application | Phone/SMS infrastructure | Governance | Approval gates |
| Aircall | Connector | Application | Business phone option | Governance | Approval gates |
| Dialpad | Connector | Application | AI call platform option | Governance | Approval gates |
| Twilio | Connector | Application | Programmable comms | Governance | Approval gates |
| Telegram | Interface | Approval / Orchestration | Mobile command shell | Approval gates | Control Plane |
| Slack | Interface | Approval / Orchestration | Team/agent coordination | Approval gates | Control Plane |
| Discord | Interface | Approval / Orchestration | Team/agent coordination | Approval gates | Control Plane |
| Grafana | Observability | — | Dashboards | Governance | — |
| Prometheus | Observability | — | Metrics | Governance | — |
| Doppler | Governance | Infrastructure | Secrets management | Security Governance | Secret policy |
| Clerk / Auth.js / Supabase Auth | Governance | Interface | Identity and access | Security Governance | Tenant isolation |
| Stripe | Connector | Attribution / Application | Payments / revenue events | Data Governance | Financial approval |
| Remotion | Application | Content Engine | Programmatic video rendering | Brand Governance | Claims governance |

## 6. Relationships Between Layers

Infrastructure supports everything. The Control Plane governs execution. Connectors expose external capability. Ingestion captures raw input. Normalization creates structured objects. Memory stores reusable context. Intelligence makes decisions. Orchestration coordinates workflows. Agents execute scoped work. Governance constrains behavior. The Interface exposes control. Applications package business use cases. Observability records what happened. Attribution proves business value. Optimization improves the system. The Business Outcome layer defines why the OS exists.

## 7. Non-Negotiable Architecture Rules

1. No agent executes without a registered run.
2. No connector executes high-risk actions without approval.
3. No workflow bypasses the Control Plane.
4. No application stores unnormalized business-critical data.
5. No public claim ships without source/claims governance.
6. No client system runs without a tenant boundary.
7. No meaningful action is complete without observability.
8. No business-impacting action is complete without attribution.
9. No tool is allowed to become the architecture.
10. No hardcoded secrets; Firebase must not be reintroduced; no new vendor becomes canonical without architecture review.

## 8. Acceptance Criteria for Future Features

Every future AJ Digital OS feature must declare, before implementation:

- owning layer
- cascading system
- cluster
- named tools used
- inputs
- outputs
- memory scope
- agent permissions
- approval requirements
- risk level
- audit behavior
- attribution event
- observability / logging requirements
- success metric
- failure mode

## 9. Implementation Priority

**Priority 1 (active / critical):** Control Plane / Kernel, Agent Execution, Orchestration, Observability, Attribution, Governance.
**Priority 2 (build next):** Memory, Data Normalization, Connector System, Interface / Shell, Application System.
**Priority 3 (scale):** Optimization, Developer / Extension Layer, Client Portal, Multi-tenant Infrastructure, Module Registry.

## 10. Final Doctrine

```txt
Data before automation.
Control before execution.
Governance before scale.
Attribution before claims.
Optimization before expansion.
Profit and spend are the final scoreboards.
```

This document is doc-only and additive. It does not modify application code, rename, or replace existing architecture docs. Rollback: `git rm docs/architecture/AJ_DIGITAL_OS_CANONICAL_SYSTEMS_AND_CLUSTERS.md`.
