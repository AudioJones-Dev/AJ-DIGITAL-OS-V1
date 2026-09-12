# AJ Digital OS Agent Operations Control Plane Specification

**Status:** Candidate
**Type:** Documentation-only architecture specification
**Owner:** AJ Digital LLC / Audio Jones
**Scope:** Governed scheduling, routing, execution, verification, and observability across AJ Digital OS agent workflows
**Decision authority:** Audio

This document is a Candidate specification. It proposes semantics and implementation targets but does not supersede canonical governance or claim current runtime implementation. Where this Candidate specification conflicts with `AGENTS.md`, `docs/REPO_SAFETY_POLICY.md`, or other canonical repository governance, canonical governance controls.

## 1. Purpose

This specification defines a candidate operating model for coordinating Obsidian,
Claude, Codex, ChatGPT, Hermes, n8n, GitHub automation, native schedulers, and future
executors through AJ Digital OS.

The intended outcome is one governed system for work identity, scheduling, execution,
verification, approval, and measurement. Individual agents remain replaceable
executors. They do not become independent control planes.

This document does not:

- implement or activate a scheduler
- migrate or alter any existing schedule
- create a runtime registry or database schema
- authorize autonomous execution
- change model-routing, approval, permission, or tenant-isolation behavior
- modify Obsidian or declare a new Obsidian folder structure
- claim that n8n or Postgres currently controls all AJ Digital OS runs

## 2. Problem

AJ Digital OS has multiple capable execution surfaces. Without a shared authority,
each surface can accumulate its own schedules, prompts, task definitions, memory,
retry behavior, and success criteria.

The resulting failure modes include:

- duplicate or conflicting jobs
- hidden native cron schedules
- stale workflow definitions
- inconsistent source-of-truth decisions
- simultaneous edits to the same repository or document
- model routing based on brand preference instead of task requirements
- worker self-certification
- missing cost, quality, and outcome evidence
- behavior that drifts from approval and governance policy

## 3. Governing Principle

The existing layer model states:

> Agents are processes. Workflows are programs. The control plane is the scheduler.

This specification extends that principle:

```text
AJ Digital OS governs work.
Agents execute bounded roles.
Workflows define dependencies.
Schedulers initiate eligible work.
Registries preserve state and ownership.
Verification establishes evidence.
Human approval authorizes consequential action.
```

No agent, model, scheduler, or integration may infer authority from convenience or
technical capability.

## 4. Evidence-Based Current State

### 4.1 Implemented or scaffolded surfaces

The repository currently contains:

- a control-plane run registry and state-transition model under
  `src/control-plane/run-registry/`
- an in-memory workflow registry in `src/workflows/workflow-registry.ts`
- policy-based model routing under `src/model-routing/`
- a tool and capability registry under `src/tools/`
- approval and permission enforcement under `src/security/`
- file-backed run events under `src/services/observability/run-tracker.ts`
- an interval-based Hermes scheduler with configured default schedules under
  `src/hermes/`
- persisted client-schedule support through the current Hermes/Supabase path
- an n8n API client and health-check/trigger commands
- approval, observability, worktree, architecture, and agent-runtime documentation

### 4.2 Material gaps

The repository does not currently prove:

- one durable schedule registry for every recurring job
- one Postgres-backed run registry used by every executor
- n8n as the active central scheduler for all AJ Digital OS work
- adapters that invoke Claude, Codex, ChatGPT, and Hermes from one orchestrator
- a universal resource-lock service
- one normalized task, result, verification, and schedule schema across all runtimes
- complete cross-executor cost and quality telemetry
- automatic synchronization between repo policy and Obsidian

These are candidate target capabilities, not current-state claims.

## 5. Relationship To Existing Standards

This specification coordinates existing standards rather than replacing them.

| Existing source | Authority retained | This specification adds |
| --- | --- | --- |
| `docs/OPERATING_POLICY.md` | Human instruction, diagnosis, scoped execution, honest validation | Cross-executor operating boundary |
| `docs/REPO_SAFETY_POLICY.md` | Protected paths, secret handling, destructive-action gates | Scheduler and adapter compliance boundary |
| `docs/IMPLEMENTATION_GATES.md` | Diagnosis through handoff gates | Required gates within recurring workflows |
| `docs/system/AGENT_RUNTIME_STANDARD.md` | Agent behavior and runtime authority | Stable operational roles across runtimes |
| `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md` | Worker/checker separation, evidence, retry, adjudication | Placement inside the control-plane lifecycle |
| `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md` | Workflow-specific objective and acceptance contract | Registry linkage requirement |
| `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` | One task, branch, worktree, and owner | Repository lock semantics |
| Approval and permission specs | Risk classification and authorization | Required integration for every execution path |
| Layer model and module traceability | Layer ownership and explicit workflow execution | Cross-tool scheduler and registry target |
| Observability and attribution docs | Run, cost, failure, and outcome measurement | Cross-executor telemetry requirements |

If this candidate conflicts with a canonical policy or implemented security boundary,
the canonical policy or security boundary controls until Audio ratifies a replacement.

## 6. Candidate Authority Model

The following target model requires ratification before implementation:

```text
Human / Audio
  -> ratifies policy, roles, schedules, and consequential actions

AJ Digital OS Control Plane
  -> owns run identity, run state, authorization, approvals, locks, and audit history

Workflow Orchestrator
  -> evaluates triggers, dependencies, retries, timeouts, and failure routing

Executor Adapters
  -> invoke a bounded role through Claude, Codex, ChatGPT, Hermes, or deterministic tools

Verification Layer
  -> checks primary evidence independently

Observability Layer
  -> records cost, duration, quality, failures, approvals, and outcomes
```

### Candidate platform assignments

| Surface | Candidate responsibility | Explicit boundary |
| --- | --- | --- |
| AJ Digital OS | Authorization, run state, policy, locks, audit, registry contracts | Must not delegate authority to a model or scheduler |
| n8n | Initial schedule and workflow coordination adapter | Does not become durable business or approval truth |
| Postgres | Candidate durable run, schedule, workflow, and evidence store | Requires an approved schema and migration; not current universal truth |
| Obsidian | Human-readable doctrine, SOPs, constitutions, decisions, and operational memory | Not a live queue, lock manager, or approval database |
| Git | Version and change history for governed source artifacts | Not live execution state |
| Hermes | `operator_shell`, intake, notifications, briefings, and approved low-risk tasks | Native scheduling remains subordinate and registered |
| Claude | Architecture, specification, complex review, and adjudication | No authority to ratify, merge, deploy, or bypass checks |
| Codex | Repository implementation, testing, repair, and diff-grounded validation | Requires scoped worktree, contract, and approval gates |
| ChatGPT | Research, synthesis, connected-workspace tasks, and draft communications | External actions remain approval-gated |
| Deterministic tools | Tests, schemas, static checks, and other reproducible verification | Preferred checker when they can test the real requirement |

## 7. Mechanism Definitions

| Mechanism | Purpose | Must not be used as |
| --- | --- | --- |
| Hook | React to a specific event | A hidden recurring schedule |
| Cron or schedule | Initiate work at a defined time | A workflow definition or approval decision |
| Loop | Repeat a bounded step until a condition or limit | An unlimited autonomous process |
| Workflow or DAG | Coordinate dependent tasks and state transitions | An opaque prompt chain |
| Agent | Perform a bounded role | A source of policy or execution authority |
| Model | Supply reasoning or generation capability | A role, workflow, checker, or ratifier by itself |

## 8. Stable Role Contracts

Executor products are not roles. A role may be served by different executors when
their capabilities, permissions, evidence access, and cost are appropriate.

| Role | Purpose | Allowed tools | Forbidden actions | Memory scope | Preferred / fallback executors | Input / output | Approval boundary | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Operator Shell (`operator_shell`) | Intake, status, notifications, and approval collection | Read status, create governed intake, notify | Self-approve, deploy, merge, mutate credentials | Current operator and approved workflow context | Hermes or ChatGPT / human interface | Operator request / normalized intake or status | Consequential commands require Audio | Intake schema and authorization check |
| Orchestrator | Decompose and coordinate a ratified workflow | Registry, router, policy, state transitions | Perform uncontracted work or bypass gates | Workflow constitution and current run | AJ control plane / approved orchestration adapter | Workflow constitution / task graph | Graph or policy changes require Audio | Graph and contract validation |
| Researcher | Gather source-backed information | Approved web, document, or data retrieval | Fabricate sources or cross tenant boundaries | Bounded research context | ChatGPT / Claude or approved research tool | Research question / evidence packet | Restricted sources require approval | Citation and source checks |
| Architect | Define requirements, boundaries, and specifications | Repo/docs read, modeling tools | Implement unapproved architecture | Approved doctrine and relevant system context | Claude / ChatGPT or Codex | Problem contract / candidate specification | Architecture ratification requires Audio | Independent architecture and conflict review |
| Builder | Implement an approved contract | Scoped repo and deterministic build tools | Expand scope, self-merge, deploy, or alter protected systems | Assigned repo/worktree and task contract | Codex / approved coding agent | Approved spec / patch and evidence | Merge, push, deploy, secrets, and protected runtime remain gated | Tests plus independent review |
| Checker | Evaluate output against acceptance criteria | Primary evidence and deterministic checks | Accept worker narrative as proof or broaden permissions | Output, criteria, and necessary source evidence | Deterministic tools / independent model | Candidate output / verification record | A passing check never grants consequential authority | Criterion-level evidence required |
| Adjudicator | Resolve worker-checker or specification disputes | Governing docs and both evidence sets | Invent authority or silently change requirements | Dispute packet only | Claude / independent senior reviewer or Audio | Appeal packet / adjudication record | High or critical `ActionRisk`, or philosophical disputes, go to Audio | Decision and rationale audit |
| Publisher | Persist or deliver an approved artifact | Approved destination adapter | Publish unapproved external or client-facing content | Approved artifact and destination | Hermes or ChatGPT / deterministic publisher | Approved artifact / publication receipt | Public/client delivery requires applicable approval | Destination and content checksum |
| Compliance Auditor (`compliance_auditor`) | Review compliance, cost, quality, and drift | Read-only registries, logs, metrics, and policy | Mutate runs or certify missing evidence | Bounded audit window | Deterministic reporting / ChatGPT or Claude | Audit scope / findings and evidence | Remediation actions are separate gated tasks | Reproducible query and evidence references |

No role assignment changes existing tool permissions. The effective permission is the
intersection of role allowance, executor capability, tenant scope, environment policy,
and current human approval.

### 8.1 Runtime Role Compatibility

Candidate role: `operator_shell`

- Purpose: intake, status, notification, approval collection, and lightweight workflow launch.
- Existing runtime term: `operator`.
- Existing runtime meaning: executor.
- Compatibility rule: `operator_shell` does not replace or redefine the implemented `operator` role.

Candidate role: `compliance_auditor`

- Purpose: governance and compliance review.
- Existing runtime term: `auditor`.
- Existing runtime meaning: validator.
- Compatibility rule: `compliance_auditor` does not replace or redefine the implemented `auditor` role.

The implemented planner, executor, validator, and monitor role types remain unchanged.

## 9. Routing Policy

The routing decision should evaluate:

```text
task type
x complexity
x ambiguity
x risk
x context requirement
x tool access
x evidence availability
x verification strength
x latency
x cost
```

Routing order:

1. Determine whether deterministic software can complete the task.
2. Resolve required permissions and evidence access.
3. Exclude executors that cannot satisfy tenant, environment, or approval policy.
4. Select the least-cost capability tier expected to meet the contract.
5. Assign an independent checker appropriate to the failure risk.
6. Record the decision, fallback, and reason.

Vendor identity alone is not a routing policy. Model reputation does not substitute
for observed task performance.

## 10. Candidate Registry Model

Every recurring job should ultimately resolve to exactly one governed workflow record
and one current schedule record. Native scheduler entries are execution details, not
parallel sources of truth.

### 10.1 Workflow record

Required fields:

```yaml
workflow_id: string
version: semver
owner: string
status: draft | candidate | active | paused | retired
objective: string
constitution_ref: string
trigger_types: []
stages: []
input_schema_ref: string
output_schema_ref: string
permission_level: 0 | 1 | 2 | 3 | 4 | 5
action_risk: low | medium | high | critical
approval_policy_ref: string
retry_policy_ref: string
escalation_policy_ref: string
observability_policy_ref: string
```

### 10.2 Schedule record

Required fields:

```yaml
schedule_id: string
workflow_id: string
version: semver
owner: string
status: candidate | active | paused | retired
trigger: string
timezone: string
execution_mode: central | delegated_native_cron | event
native_owner: string | null
preferred_executor: string
fallback_executor: string | null
checker: string
approval_policy_ref: string
retry_policy_ref: string
escalation_policy_ref: string
output_destination: string
observability_policy_ref: string
```

### 10.3 Compliance rule

A recurring job is not compliant unless it has one workflow ID, one owner, one current
version, one schedule owner, an explicit timezone, an executor, a checker, bounded
retry, escalation, approval, destination, observability, and lifecycle status.

Registry presence documents a job. It does not activate the job. Activation is a
separate approved runtime action.

`PermissionLevel` governs authorization scope. `ActionRisk` classifies the consequence
of an action. These are separate dimensions and must not be conflated.

## 11. Shared Execution Contracts

Future implementation should normalize these contracts without duplicating existing
runtime types:

- task contract: objective, inputs, constraints, tools, risks, outputs, and checks
- run result: status, outputs, evidence, errors, cost, duration, and executor identity
- verification record: criterion results, evidence, verdict, checker, and cost
- schedule record: trigger, timezone, workflow, owner, executor, and lifecycle
- resource lock: resource identity, run identity, owner, acquisition, and expiry
- approval reference: risk decision and durable approval record

`AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md` defines Candidate semantics for worker,
checker, evidence, retry, and adjudication behavior during this Candidate phase.

### 11.1 CLI-First Execution State Model

After approval and decomposition, the control plane should route executable work to
machine-operable interfaces before creating a human administrative handoff.

```text
plan
-> approve where required
-> attempt through deterministic script, CLI, tool, API, MCP, or connector
-> detect missing capability
-> create and authorize environment-enablement task
-> install, configure, or repair where permitted
-> verify the capability
-> resume the original task
-> independently validate
-> request only irreducibly human action
-> complete
-> identify repeated manual residue for automation
```

Candidate task states:

```text
blocked_missing_capability
environment_enablement_pending
environment_enablement_running
environment_enablement_failed
awaiting_human_access
awaiting_human_approval
resuming_original_task
```

These states are proposed semantics only. They do not alter the implemented run-state
machine until a separately approved runtime task maps them onto existing state types.

```ts
interface TaskExecutionPolicy {
  cliFirst: boolean;
  preferredInterfaces: string[];
  fallbackInterfaces: string[];
  allowEnvironmentEnablement: boolean;
  operatorMinimizationRequired: boolean;
  humanOnlyActions: string[];
  supplementalTaskIds?: string[];
}

interface HumanEscalation {
  reason:
    | "credential_required"
    | "approval_required"
    | "physical_access_required"
    | "strategic_decision_required"
    | "security_sensitive"
    | "no_machine_interface"
    | "enablement_failed"
    | "permission_exceeded";
  requestedAction: string;
  whyAgentCannotPerform: string;
  evidenceRefs: string[];
  resumeCondition: string;
}
```

Environment enablement remains subordinate to the original task contract. Credentials,
privileged operating-system changes, paid services, external account creation,
production infrastructure, firewall or network-policy changes, destructive actions,
security-sensitive configuration, merge, push, deployment, release, and external
communication retain unconditional canonical approval gates.

The operator should approve, review, resolve ambiguity, provide controlled access, and
make consequential decisions. The `operator_shell` and execution agents should handle
routine inspection, administration, validation, evidence collection, and environment
preparation where authorized.

## 12. Native Scheduler Rule

Native scheduling may remain for:

- local health and recovery checks
- tool-specific maintenance
- temporary experiments
- approved low-risk personal reminders
- execution when the central scheduler is unavailable and a recovery policy permits it

Every retained native schedule must declare:

```yaml
execution_mode: delegated_native_cron
native_owner: hermes | chatgpt | github | codex | other
workflow_registry_id: string
```

Until a central registry exists, current schedules remain unchanged. The migration
inventory must record them before any disablement, transfer, or re-creation.

## 13. Collision Prevention

### Repository work

The existing worktree protocol controls:

```text
One task
-> one branch
-> one worktree
-> one active implementation owner
```

A future resource-lock record may make this machine-readable, but it must not weaken
Git/worktree ownership or human merge authority.

### Documents and Obsidian

Candidate write flow:

```text
agent draft
-> agent-owned intake location
-> link, schema, source, and contradiction checks
-> human review where required
-> canonical promotion
```

No agent receives unrestricted permission to rewrite canonical notes. Obsidian sync
direction, conflict handling, and promotion authority remain unresolved until separately
ratified.

## 14. Verification And Approval

Every significant workflow requires an independent check. Deterministic verification
is preferred when it can test the actual requirement.

Worker output plus a worker completion claim is not completion. Eligible completion
requires:

```text
worker output
+ primary evidence
+ checker verdict
+ acceptance-test result
+ required approval
= eligible completed run
```

Passing verification does not authorize a merge, push, deploy, publication, client
message, payment, credential change, destructive action, or other approval-gated event.

Human approval is unconditionally required for all merge actions, push actions,
deployment actions, release actions, and external communications. Workflow-specific
constitutions may add stricter gates but may not weaken canonical repository policy.

## 15. Failure, Retry, Timeout, And Escalation

Each workflow constitution must define:

- retryable and non-retryable failure classes
- maximum attempts
- backoff behavior
- time ceiling
- critical halt conditions
- checker dispute process
- escalation destination
- stale-run policy
- compensation or rollback requirements

Candidate default:

```yaml
automatic_retries: 2
third_failure: adjudicator_review
specification_conflict: human_review
critical_failure: halt_immediately
timeout: workflow_defined
```

Blind or unlimited regeneration is prohibited.

## 16. Observability And Model Audition

Each governed run should record, where available:

- workflow, schedule, run, task, tenant, and executor identifiers
- route decision and fallback reason
- model and tool cost by role
- duration by stage
- first-pass result and retry count
- failure category
- checker verdict and reversal
- human escalation and approval
- evidence references
- accepted output
- business outcome or attribution reference
- human interventions and requested actions
- administrative actions delegated to humans
- environment-enablement attempts, outcomes, and duration
- time blocked on human access or approval
- repeated manual steps detected and later automated
- percentage of tasks completed without operator administration

Models should be promoted or retired for a task class only after representative,
versioned auditions compare quality, cost, latency, failure handling, and checker
results. Benchmark reputation alone is insufficient.

## 17. Registry and Scheduling Pilot

The Registry and Scheduling Pilot validates workflow registration, scheduling
ownership, run tracking, and recurring execution. The following are candidate workflows
for that pilot, not activated schedules:

1. Monday AI Operations Brief.
2. Daily AJ Operator Brief.
3. Repository Health and Governance Scan.

These workflows are recommended because they can be reviewed without granting
production mutation, credential, financial, or client-communication authority.

No time, timezone, executor, or publication destination becomes active through this
document.

The Registry and Scheduling Pilot is separate from the Delegation Verification Pilot
defined in `AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md`. The latter validates worker,
checker, adjudicator, evidence, and retry behavior through documentation/specification
production. Neither pilot is required to finish before the other unless an approved
implementation plan establishes a dependency.

## 18. Migration Plan

### Phase 1 - Inventory

Discover and record every existing hook, cron job, loop, automation, Claude command,
Codex task, Hermes schedule, ChatGPT automation, n8n workflow, and GitHub Action.

Capture owner, trigger, timezone, inputs, outputs, permissions, state store, checker,
approval, retry, cost visibility, and lifecycle status.

### Phase 2 - Reconcile authority

Identify duplicate schedules, conflicting owners, hidden execution state, and jobs
without approval or verification. Do not disable anything during diagnosis.

### Phase 3 - Resolve ADRs And Ratify Contracts

Audio decides scheduler authority, runtime source of truth, Obsidian boundary, role
assignments, risk gates, registry paths, and pilot selection.

Implementation or canonical promotion requires ADR resolution for scheduler authority,
runtime state authority, and artifact authority and synchronization boundaries.

### Phase 4 - Define schemas

Map proposed task, result, verification, schedule, and lock contracts onto existing
TypeScript types and stores. Extend only where a measured gap exists.

### Phase 5 - Registry and Scheduling Pilot

Register one low-risk recurring workflow without changing unrelated schedules. Keep
activation separate from registration.

### Phase 6 - Adapter pilot

Connect one approved executor and deterministic checker through the existing control
plane. Preserve approval and tenant enforcement.

### Phase 7 - Evaluate

Compare reliability, duplicate prevention, cost, human review effort, and evidence
quality against the prior workflow.

### Phase 8 - Expand or roll back

Promote only if evidence supports the model. Otherwise disable the pilot adapter,
preserve the audit trail, and leave legacy schedules unchanged.

## 19. Proposed Canonical Paths After Ratification

Reuse existing ownership boundaries:

| Artifact | Proposed path | Phase |
| --- | --- | --- |
| Control-plane architecture | `docs/system/AGENT_OPERATIONS_CONTROL_PLANE_SPEC.md` | Current candidate |
| Delegation and verification | `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md` | Current candidate |
| Workflow constitution | `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md` | Current candidate |
| Workflow registry schema | `src/schemas/` or existing workflow type owner, selected after type audit | Future |
| Schedule registry schema | Existing Hermes/workflow type owner or `src/schemas/`, selected after type audit | Future |
| Tool capability registry | Existing `src/tools/` | Existing owner; extend only if needed |
| Model routing policy | Existing `src/model-routing/` and architecture docs | Existing owner; no duplicate YAML yet |
| Run registry | Existing `src/control-plane/run-registry/` | Existing owner; persistence decision pending |
| Observability | Existing `src/services/observability/` and `src/core/observability/` | Existing owner |
| Worktree collision policy | Existing worktree protocol | Existing owner |

Do not create a parallel `00-CONTROL/AGENT-OPS/` tree in this repo unless a later
ratified migration proves the existing ownership boundaries cannot support the system.

## 20. ADR-Required Unresolved Architecture Decisions

Audio must decide:

1. Whether n8n becomes the initial central scheduler or remains workflow glue beside an AJ Digital OS scheduler.
2. Whether Postgres becomes the universal run and schedule store, and which existing store is migrated first.
3. Whether Obsidian or the repo is canonical for each class of human-readable artifact, including synchronization direction.
4. Whether the stable role assignments are defaults, requirements, or merely routing preferences.
5. Which actions remain human-gated regardless of checker confidence.
6. Whether native Hermes schedules remain active during the Registry and Scheduling Pilot.
7. Which one of the three candidate workflows becomes the Registry and Scheduling Pilot.
8. Where verification evidence lives before durable Postgres evidence storage exists.
9. What lock expiry and recovery policy applies to abandoned runs.
10. What quality and cost thresholds permit model or workflow promotion.

## 21. Acceptance Criteria For Ratifying This Specification

- Existing policy and approval authority is preserved.
- Existing runtime contracts are reused rather than duplicated.
- Current capabilities and target capabilities are clearly separated.
- Every recurring workflow has one proposed registry identity and schedule owner.
- Native cron remains subordinate and discoverable.
- Every role has bounded tools, memory, approval, and verification requirements.
- Repository and document collision controls are explicit.
- The Registry and Scheduling Pilot is low risk and reversible.
- Runtime implementation remains separately approved.

## 22. Exact Next Codex Build Prompt

```text
Review/Diagnosis owner: Codex
Actionable AI Assistant Task owner: Codex
Execution location/tool: AJ-DIGITAL-OS isolated worktree
Human/operator role: Audio - review inventory and ratify architecture decisions
Copy/paste destination: Codex

/goal

Perform Phase 1 of the candidate AJ Digital OS Agent Operations Control Plane:
create a read-only inventory of existing recurring and event-driven automation.

Inspect hooks, cron or interval schedules, loops, workflow definitions, Claude commands,
Codex tasks, Hermes schedules, ChatGPT automations documented in the repo, n8n workflows
or adapters, and GitHub Actions.

For each item record:

- identifier and current owner
- implementation or documentation path
- trigger and timezone
- enabled, disabled, candidate, or unknown status
- inputs and outputs
- state and persistence location
- executor and checker
- permissions and approval boundary
- retry, timeout, and escalation behavior
- observability and cost visibility
- duplicate or collision risk
- confidence and evidence reference

Return only:

1. Repo and branch state
2. Automation inventory
3. Duplicate schedule matrix
4. Authority conflicts
5. Capability gaps
6. Unsupported assumptions in the candidate architecture
7. Ratification decisions required from Audio
8. Proposed Registry and Scheduling Pilot

Constraints:

- Read-only
- No schedule changes
- No runtime code
- No new dependencies
- No Obsidian changes
- No registry creation
- No activation or deactivation
- Do not claim external tool state unless verified from an authoritative source
- Stop after the inventory report
```

## 23. Candidate Decision Summary

The proposed direction is:

```text
One control-plane authority
+ one workflow identity per recurring job
+ one schedule owner
+ multiple bounded executors
+ independent verification
+ explicit human approval
+ measured outcomes
```

This direction remains Candidate until Audio resolves the decisions in Section 20.
