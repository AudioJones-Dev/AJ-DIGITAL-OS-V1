# AJ Digital OS - System Architecture

> **Note:** [`docs/DESIGN.md`](./DESIGN.md) is the canonical design index
> and the entry point for the 16-layer architecture model. This document
> remains the operator-facing description of the core runtime
> (run lifecycle, agent decomposition, services, CLI layout, end-to-end
> data flow) and is kept current with the implementation. Read
> `docs/DESIGN.md` first for layer-level pointers; come back here for the
> implementation-level overview.

## 1. System Overview

AJ Digital OS is a local-first AI workflow operating system built around deterministic execution, approval gating, resumable workflow control, and file-based observability.

The system orchestrates six core concerns:

- Workflows: deterministic task logic that produces typed outputs.
- Runs: persisted records of workflow execution state.
- Approvals: human-in-the-loop decisions that gate execution.
- Execution: controlled movement from approved state into final output generation.
- Publishing: local artifact writing through a publish target abstraction.
- Observability: event logs, summaries, dashboards, and operator commands.

The current implementation is intentionally local-first. State is persisted to JSON files, output artifacts are written to the filesystem, and the command layer exposes the system through a terminal interface.

## 2. Core Design Principles

The system is built around a small set of architectural rules:

- Deterministic execution: workflow and publishing paths should produce predictable outputs from persisted run state.
- Separation of concerns: commands render, agents execute domain actions, services coordinate policy and aggregation, and core utilities manage state.
- Approval as a first-class gate: execution is intentionally blocked until an approval decision exists.
- Local-first persistence: run state, events, and outputs live on disk without database dependencies.
- Explicit state transitions: run movement is controlled through run manager and state-machine rules.
- Composable command layer: the CLI routes into commands without duplicating system logic.
- Observability by default: every run can be inspected through summaries, events, and dashboard views.

## 3. High-Level Architecture

The implemented architecture can be understood as layered composition:

```text
CLI (commands)
-> Agents (orchestrator, approval, execution, publisher)
-> Services (policy, coordinator, resumer, dashboard, tracker)
-> Core (run manager, validator, constants, state machine, run store)
-> Schemas / Types
-> File system (runs, outputs, reports)
```

Each layer has a narrow responsibility:

- CLI: parses terminal input and delegates to the command layer.
- Commands: provide human-readable and JSON-facing entrypoints over system capabilities.
- Agents: perform system actions such as orchestration, approval request, execution, and publishing.
- Services: coordinate policy, recovery, routing, aggregation, and observability.
- Core: manages validation, persistence, transition rules, and shared runtime primitives.
- Schemas and types: define contracts for runs, workflow output, approval packets, and validation.
- File system: stores run records, published output, client data, and event reports.

## 4. Run Lifecycle

The current run lifecycle is explicit and state-based:

```text
created
-> validated
-> pending_approval
-> approved / rejected / revision_requested
-> execution
-> executed / failed / skipped / denied
```

In the implemented code, these transitions are controlled by specific components:

- Orchestrator: creates and advances a run through context loading, workflow execution, validation, and approval request.
- Validator: determines whether workflow output passes required checks.
- Approval resolver: moves the run from `pending_approval` into `approved`, `rejected`, or `revision_requested`.
- Execution coordinator and resumer: decide whether approved work can proceed.
- Publisher: marks successful execution as `executed` after local artifact output is written.
- State machine and run manager: enforce valid transitions and persist updated timestamps.

The system avoids implicit jumps. Execution is not supposed to bypass approval, and publishing is not supposed to bypass execution policy.

## 5. Core Components

### Agents

- `orchestrator.agent`: loads context, resolves workflows, executes them, validates output, persists the run, and requests approval when required.
- `approval.agent`: formats approval packets and sends approval requests through the Telegram tool.
- `execution.agent`: enforces the approved-only execution gate before delegating to the publish router.
- `publisher.agent`: writes deterministic local output artifacts and marks the run executed.
- `context-loader.agent`: assembles client and project context for workflow execution.

### Services

- `execution-policy`: pure policy layer that decides allow, skip, or deny for execution.
- `execution-coordinator`: top-level execution orchestrator that loads a run, evaluates policy, and delegates to the resumer.
- `execution-resumer`: recovery-oriented service that resumes approved runs when allowed.
- `approval-resolver`: applies approval decisions and updates run state after human review.
- `publish-router`: target router that delegates publishing to the local publisher and is designed for future target expansion.
- `run-dashboard`: aggregates many runs into a system-level dashboard.
- `run-summary`: aggregates one run and its event history into an operator-friendly view.
- `run-tracker`: persists structured lifecycle events for each run.

### Core

- `run-manager`: central API for run creation and explicit run state updates.
- `validator`: checks workflow results and asset requirements against task expectations.
- `constants`: shared status and runtime constants used across the system.
- `state-machine`: enforces valid lifecycle transitions.
- `run-store`: file-based persistence for run records.
- `logger`: shared logging utility used across system layers.

## 6. Data Model

The key object in AJ Digital OS is the run.

A run record contains the evolving system state for a workflow instance, including:

- run identity such as `runId`, `clientId`, `workflowId`, and `taskType`
- lifecycle state such as `status` and timestamps
- workflow output such as `workflowResult`
- approval metadata such as `approvalStatus`, `approvalMessageId`, `approvedAt`, and `approvedBy`
- execution output such as `publishedPath` and `publishedFiles`
- warnings and errors emitted during processing

Supporting objects include:

- `WorkflowResult`: the typed outcome of a workflow, including summary, status, warnings, and assets.
- `ContentAsset`: structured output units such as titles, outlines, drafts, hooks, CTAs, or transcript-derived content sets.
- approval packet: the serialized message payload used to ask for human approval.
- validation report: the structured result of validator checks against workflow output.

The run evolves over time. It starts small, then accumulates workflow output, approval metadata, event history, and publishing metadata as it moves through the system.

## 7. Execution System

Execution is intentionally split into four components with different responsibilities.

### `execution-policy`

This is the decision layer. It evaluates a run, target, and mode, then returns whether execution is allowed, skipped, or denied. It is pure and side-effect free.

### `execution-coordinator`

This is the top-level orchestrator for execution. It loads the run, calls the policy, branches on the policy decision, and delegates only when execution is allowed.

### `execution-resumer`

This is the recovery-aware service. It determines whether a run can be resumed and then calls the execution agent when appropriate. It is the central place for controlled resume behavior.

### `execution.agent`

This is the executor gate. It enforces approved-only execution rules and routes the run into the publish system.

In practical terms:

- policy decides
- coordinator routes
- resumer handles recovery and safe continuation
- agent executes through the publish layer

## 8. Approval System

Approval is an explicit pause point in the architecture.

### `approval.agent`

The approval agent formats the approval message and sends it through the Telegram integration. It does not mutate the run directly beyond returning structured approval-request results to the orchestrator.

### `approval-resolver`

The approval resolver handles the human decision path. It loads the persisted run, validates that the current state is `pending_approval`, applies the decision, and updates the run record through the approved transition rules.

### `pending_approval` as a gate

The important design rule is that workflow completion does not automatically mean execution. A run can complete drafting and validation, then intentionally stop at `pending_approval` until a human decision exists.

This creates a controlled separation between content generation and downstream execution.

## 9. Observability System

Observability is implemented through layered read models on top of file-based run data.

### `run-tracker`

The tracker writes per-run event logs under `src/data/reports/runs/<runId>.events.json`. Events are validated and appended as structured entries.

### `run-summary`

The summary service reads a run plus its event history and derives a single aggregated object containing current status, approval metadata, output metadata, warnings, errors, and event count.

### `run-dashboard`

The dashboard service enumerates persisted runs, builds run summaries, sorts by recency, and aggregates system-level sections such as pending approvals, failures, recently published runs, and overall lifecycle counts.

This design gives the system three observability levels:

- raw events for debugging
- run summaries for single-run inspection
- dashboard aggregation for system overview

## 10. Command Layer (CLI)

The command layer follows a thin-wrapper pattern.

Each command class is responsible for:

- accepting a typed input contract
- calling the appropriate agent or service
- rendering either human-readable output or JSON
- returning a structured result

The commands do not implement business rules directly. They are presentation and entrypoint adapters over the system core.

JSON mode exists for scripting, debugging, and future automation integration. Human mode exists for direct operator use.

`operator-console.command` is the aggregation command in this layer. It calls the underlying overview and queue commands in JSON mode, suppresses their direct console printing, and renders a single combined operator view.

`src/cli.ts` sits above the command layer and handles argument parsing and routing only.

## 11. File System Layout

The current filesystem layout is intentionally explicit:

```text
src/
  agents/
  api/
  commands/
  core/
  schemas/
  services/
    approval/
    execution/
    observability/
    publishing/
  tools/
  types/
  workflows/
  data/
    approved/
    clients/
    reports/
    runs/
```

Directory purposes:

- `agents/`: stateful action components such as orchestrator, approval, execution, and publisher.
- `api/`: framework-agnostic handlers such as approval and execution webhooks.
- `commands/`: terminal-facing command wrappers and the command barrel.
- `core/`: run manager, validator, state machine, persistence, and shared runtime concerns.
- `schemas/`: Zod-backed schemas for validation and typed runtime parsing.
- `services/`: policy, coordination, observability, and publishing support layers.
- `tools/`: external-system adapters such as Telegram integration.
- `types/`: shared domain contracts.
- `workflows/`: workflow definitions and registry.
- `data/runs/`: persisted run records.
- `data/approved/`: locally published artifacts.
- `data/reports/`: run event logs and reporting artifacts.
- `data/clients/`: client-specific context and templates.

## 12. Data Flow (End-to-End)

A typical end-to-end run moves through the following path:

```text
1. workflow triggered
2. orchestrator creates run
3. validator checks output
4. run moves to pending_approval
5. approval-agent sends request
6. approval-resolver updates state
7. execution-coordinator evaluates policy
8. execution-agent executes
9. publish-router delegates
10. publisher writes files
11. run-tracker logs events
12. run-summary aggregates
13. dashboard surfaces system state
```

More concretely:

1. A workflow is selected and executed by the orchestrator.
2. The workflow returns a typed `WorkflowResult`.
3. The validator checks required assets and correctness expectations.
4. If approval is required, the orchestrator creates an approval packet and persists the run as `pending_approval`.
5. A human decision reaches the approval resolver.
6. The run transitions into `approved`, `rejected`, or `revision_requested`.
7. The execution coordinator evaluates whether the run is allowed to execute.
8. The execution agent hands the run to the publish router.
9. The publish router delegates to the local publisher.
10. The publisher writes deterministic artifacts under `src/data/approved/...` and marks the run executed.
11. Observability layers expose the result through event history, summaries, and dashboard views.

## 13. Extension Points

The current architecture already exposes clear expansion points.

### Publish targets

`publish-router` is the main target extension point. Today it supports `local`. It can be extended with additional destinations such as Sanity, GitHub, Notion, Google Drive, or webhook-based delivery.

### New workflows

New workflow definitions can be added under `src/workflows/` and registered through the workflow registry without rewriting the rest of the system.

### External APIs

The system already uses a tool boundary for integrations. Additional tools or API handlers can be introduced without collapsing command or service responsibilities.

### Automation

The CLI and pure handler pattern make future cron, n8n, or external automation straightforward. Commands can be invoked directly, or webhook-style handlers can be mounted into an API surface.

### Multi-tenant growth

Client-scoped data already exists under `src/data/clients/`, which is a natural starting point for stronger multi-tenant behavior.

### Storage evolution

Because persistence is centralized through run store and event tracking, local JSON storage can eventually be swapped or mirrored to cloud storage without rewriting the command layer.

## 14. Future Architecture Considerations

Several future directions are compatible with the current design:

- Multi-tenancy: stronger client isolation, policy overrides, and client-specific routing.
- Remote execution: execution agent and publish router can be extended to support remote workers.
- Distributed workers: orchestration and execution could eventually be split across separate processes or nodes.
- API layer: the existing pure handler pattern supports an eventual HTTP API without reworking the domain model.
- UI dashboard: the observability services already provide the read models needed for a future web interface.
- Queue system: explicit persisted runs and state transitions provide a good base for introducing a formal queue later.

These are future considerations, not current capabilities. The current architecture remains local-first, file-based, approval-gated, and terminal-operable.
