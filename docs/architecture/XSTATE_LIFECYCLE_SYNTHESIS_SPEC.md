# XState Lifecycle Synthesis Specification

**Version:** 0.1

**Date:** 2026-08-19

**Owner:** AJ Digital LLC / Audio Jones

**Status:** Phase 0 architecture specification; documentation only

**Decision record:** `docs/decisions/ADR-001-XSTATE-LIFECYCLE-SYNTHESIS-BOUNDARY.md`

**Implementation authority:** None

## 1. Executive Decision

AJ Digital OS will treat XState as a candidate statechart modeling and verification dependency for one canonical run lifecycle. XState is not approved as a runtime orchestrator, persistence authority, policy engine, approval authority, BEL replacement, CRM truth source, deliverable lifecycle owner, or platform-wide state container.

The first required work is semantic synthesis. AJ Digital OS currently maintains multiple run lifecycle contracts with overlapping names and different transition rules. Adding XState before reconciling those contracts would create another representation without resolving ownership.

This specification therefore defines:

- the intended bounded role for XState;
- the authority boundaries XState must not cross;
- the lifecycle contracts that require reconciliation;
- the target canonical vocabulary;
- a non-authoritative mapping model;
- the gates for any later test-only proof;
- the evidence required before runtime integration can be proposed.

No dependency, source, test, runtime, manifest, lockfile, BEL, Hermes, database, dashboard, or deployment change is authorized by this document.

## 2. Problem

AJ Digital OS has formal state-transition logic, approval gates, policy enforcement, idempotency, event history, workflow persistence, and BEL DAG execution. These capabilities are distributed across bounded contexts that do not currently share one complete lifecycle contract.

The primary problem is not the absence of a state-machine library. The primary problem is semantic duplication:

1. the legacy workflow run lifecycle uses `RunStatus`;
2. the Operating Core declares `RunState` canonical across modules;
3. the control plane independently declares `RunControlState` with the same labels as `RunState` but different transitions;
4. BEL declares separate DAG run and node statuses;
5. CRM, deliverable, project, and approval objects have their own legitimate domain lifecycles.

Without an explicit ownership and projection model, a runtime library could amplify drift, bypass governance, or create competing sources of truth.

## 3. Desired Outcome

Produce an architecture contract that allows a later implementation team to evaluate XState without guessing:

- which lifecycle is being modeled;
- which vocabulary is canonical;
- who authorizes transitions;
- where current state is persisted;
- where audit and replay truth lives;
- how legacy and BEL statuses relate to the canonical lifecycle;
- what XState may decide;
- what XState may never execute or own;
- which tests must pass before any runtime adoption decision.

## 4. Phase 0 Success Criteria

Phase 0 is complete when the specification and ADR:

- inventory the current lifecycle contracts and identify semantic conflicts;
- choose a target canonical process vocabulary without silently changing runtime behavior;
- preserve control-plane, enforcement, approval, tenant, idempotency, audit, and persistence authority;
- define XState as non-authoritative in the next phase;
- keep BEL DAG execution independent;
- define explicit entry and exit gates for a test-only proof;
- record open decisions that implementation may not infer;
- provide acceptance criteria and rollback boundaries;
- remain documentation-only.

Phase 0 does not certify that current lifecycle implementations are equivalent, correct, or production-ready.

## 5. Scope

### 5.1 In Scope

- XState significance for AJ Digital OS lifecycle modeling.
- Canonical run lifecycle vocabulary selection.
- Lifecycle ownership and projection boundaries.
- Transition-event naming guidance.
- Pure guards and effect boundaries.
- Reachability, liveness, invalid-transition, and compatibility test requirements.
- Gates for a later test-only proof.
- Risks, rollback, and unresolved decisions.

### 5.2 Out of Scope

- Installing `xstate` or any `@xstate/*` package.
- Editing `package.json` or any lockfile.
- Vendoring `xstate-main.zip` or copying XState source into the repo.
- Adding an XState machine, actor, adapter, test, or persisted snapshot.
- Replacing or modifying BEL, Hermes, the control plane, Operating Core, approval enforcement, idempotency, event ledger, CRM, deliverables, dashboards, or APIs.
- Changing existing transition rules.
- Migrating persisted run records or DAG records.
- Activating Stately Studio, Stately Sky, inspection tooling, or external services.
- Claiming production or deployment readiness.

## 6. Evidence Base

### 6.1 Current Repository Evidence

The architecture decision is grounded in these current surfaces:

- `src/types/run.types.ts` and `src/core/constants.ts` define the legacy workflow lifecycle.
- `src/core/state/run-state-types.ts` and `src/core/state/run-state-machine.ts` define the Operating Core lifecycle.
- `src/control-plane/run-registry/run-control-types.ts` and `control-actions.ts` define and enforce control-plane actions.
- `src/bel/dag/dag-types.ts` and `dag-runtime.ts` define DAG node and run execution.
- `src/security/permissions/enforced-execution.ts` remains the enforcement boundary.
- `src/security/approvals/approval-service.ts` remains the approval authority.
- `src/core/idempotency/` remains the command idempotency boundary.
- `src/core/events/event-ledger.ts` remains the append-only system event and replay boundary.
- `docs/architecture/aj-digital-os-v0.2.md` requires additive integration that preserves approval-safe lifecycle behavior.
- `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` identifies the control plane as the state and enforcement authority.

### 6.2 XState Reference Evidence

The reviewed archive was `C:\Users\tyron.AUDIOJONES\Downloads\xstate-main.zip`.

Observed reference capabilities include:

- typed finite state machines and statecharts;
- event-driven transitions;
- guards, actions, delays, and invoked actors;
- actor creation and subscription;
- persisted actor snapshots and restoration;
- graph traversal and model-based path testing;
- hierarchical, parallel, and history states.

The archive's package metadata declares XState `5.32.5` and the MIT license. The archive did not establish immutable commit provenance. It is reference material, not an approved dependency source.

## 7. Facts, Inferences, Assumptions, and Unknowns

### 7.1 Facts

- AJ Digital OS has multiple lifecycle type definitions and transition maps.
- `RunState` and `RunControlState` use the same nine state labels.
- Their transition maps are not equivalent.
- The control plane wraps state mutation with tenant, approval, enforcement, audit, and attribution behavior.
- The legacy workflow lifecycle contains domain milestones not represented in the nine-state Operating Core vocabulary.
- BEL represents DAG execution and node scheduling separately.
- XState is not currently declared as a repository dependency.

### 7.2 Inferences

- A shared statechart could reduce lifecycle drift if it is introduced behind existing authorities.
- Graph and path testing may provide earlier value than runtime actors.
- The nine-state Operating Core vocabulary is the strongest current candidate for canonical process state because it is already labeled canonical and is used by CLI and Hermes surfaces.
- Legacy workflow statuses are likely a mixture of process state, work milestones, approval decisions, and observability milestones rather than one clean process lifecycle.

### 7.3 Assumptions

- A future proof can be isolated to tests and pure modeling without changing production behavior.
- Existing APIs can eventually use an adapter instead of a flag-day migration.
- The control-plane execution path should remain authoritative even if transition calculation is later delegated to a statechart.

These assumptions require proof before implementation authority is granted.

### 7.4 Unknowns

- Which existing persisted store should own canonical current run state after consolidation.
- Whether `closed`, `logged`, and `executed` are terminal process states, milestones, or reporting projections.
- Whether approval rejection should produce `failed`, `cancelled`, or a separate outcome.
- Whether cancellation should be allowed from every non-terminal state.
- Whether a failed run may return to `queued`, and under which explicit authorization event.
- Whether snapshot persistence is needed before distributed or long-running workers exist.

## 8. Current Lifecycle Inventory

### 8.1 Legacy Workflow Run Lifecycle

**Types:** `RunStatus`, `RunRecord`

**Transition map:** `RUN_STATE_TRANSITIONS`

**Primary mutation surface:** `RunManager`

States:

```text
queued
context_loaded
in_progress
draft_complete
validation_passed
validation_failed
pending_approval
approved
rejected
revision_requested
executed
logged
closed
```

This lifecycle captures workflow milestones, validation outcomes, approval decisions, execution, logging, and closure in one status field.

### 8.2 Operating Core Run Lifecycle

**Type:** `RunState`

**Transition map:** `VALID_RUN_STATE_TRANSITIONS`

**Transition function:** `transitionRunState`

States:

```text
queued
planning
running
waiting_for_approval
retrying
escalated
completed
failed
cancelled
```

The module describes this as the canonical lifecycle shared across the control plane, BEL, DAG, Hermes, and other modules. It is a pure transition validator with no I/O.

### 8.3 Control-Plane Lifecycle

**Type:** `RunControlState`

**Transition map:** `VALID_TRANSITIONS`

**Mutation authority:** `executeControlAction`

The state labels are identical to `RunState`, but the transition rules are not. Examples:

- control-plane `queued` allows `planning` or `cancelled`; Operating Core `queued` allows only `planning`;
- control-plane `planning` allows approval, failure, and cancellation paths; Operating Core `planning` allows only `running`;
- control-plane `failed` allows `queued`; Operating Core treats `failed` as terminal unless a separate function is called with `force=true` and targets `queued`;
- control-plane cancellation is allowed from several active states; Operating Core cancellation is only modeled directly from `waiting_for_approval`.

This is a semantic conflict, not merely duplicate typing.

### 8.4 BEL DAG Lifecycle

**Types:** `BelDagRunStatus`, `BelDagNodeStatus`

**Runtime:** `dag-runtime.ts`

**Persistence:** BEL DAG stores

BEL owns scheduling concerns that a canonical run lifecycle should not absorb:

- graph dependency readiness;
- node attempts and retry budgets;
- failed-parent propagation;
- skipped nodes;
- approval-gate nodes;
- node outputs;
- cache hooks;
- DAG-level status derivation.

BEL run status may project into a canonical parent run state, but BEL node state remains BEL-owned.

### 8.5 Domain Lifecycles

CRM objects, deliverables, approvals, projects, and publication records have domain-specific states. They must not be collapsed into the process lifecycle merely because statechart tooling is available.

## 9. Semantic Conflict Matrix

| Concern | Legacy workflow | Operating Core | Control plane | BEL DAG |
| --- | --- | --- | --- | --- |
| Initial state | `queued` | `queued` | `queued` | `pending` |
| Preparation | `context_loaded` | `planning` | `planning` | input nodes pending/ready |
| Active work | `in_progress` | `running` | `running` | nodes `running` |
| Approval pause | `pending_approval` | `waiting_for_approval` | `waiting_for_approval` | gate node/run waiting |
| Approval granted | `approved` | returns to `running` | action maps to `running` | external resume required |
| Approval rejected | `rejected` then `closed` | no explicit rejected state | action maps to `failed` | not represented as a distinct run state |
| Retry | validation failure or revision returns to work | `retrying` then `running` | `retrying` then `running` | per-node retry policy |
| Escalation | not explicit | `escalated` | `escalated` | not a distinct run state |
| Success | `executed`, `logged`, `closed` | `completed` | `completed` | `completed` |
| Failure | `validation_failed` or downstream errors | `failed` terminal | `failed`, then optionally `queued` | `failed` |
| Cancellation | no run status | limited transition | allowed from several states | `cancelled` |
| Rerun | not a first-class event | `force=true` terminal escape | governed `rerun` action | force/retry behavior is runtime-specific |

The matrix is descriptive. It does not authorize automatic mappings.

## 10. Target Canonical Model

### 10.1 Canonical Process Vocabulary

The target canonical process vocabulary is the existing nine-state `RunState` vocabulary:

```text
queued
planning
running
waiting_for_approval
retrying
escalated
completed
failed
cancelled
```

This is a vocabulary decision only. The authoritative transition graph is not finalized by Phase 0 because the Operating Core and control-plane transition maps conflict.

### 10.2 Authority Model

| Responsibility | Authority retained during any future proof |
| --- | --- |
| Permission and execution authorization | `executeWithEnforcement` and control-plane policy surfaces |
| Human approval truth | Approval service and persisted approval records |
| Tenant boundary | Existing tenant resolution and enforcement checks |
| Current control-plane record | Existing run-control store |
| Legacy workflow record | Existing `RunStore` / `RunManager` lifecycle |
| DAG execution and node state | BEL DAG runtime and stores |
| Command deduplication | Operating Core idempotency store |
| Audit and event replay | Existing audit logs and system event ledger |
| Attribution | Existing attribution hooks |
| XState Phase 1 role | Pure, non-authoritative model and test oracle |

XState must receive already-resolved facts or pure inputs. It must not perform permission checks, create approvals, read secrets, call connectors, write records, publish outputs, or mutate runtime state during the test-only phase.

### 10.3 Projection Rule

The canonical process lifecycle describes high-level run progression. Other statuses remain projections or bounded-context state:

- legacy workflow milestones describe how content/work moved through the current workflow pipeline;
- control-plane records describe governed operational control;
- BEL describes DAG and node execution;
- CRM and deliverable lifecycles describe business objects.

Consolidation must use explicit adapters. Shared strings do not prove shared semantics.

## 11. Candidate Event Contract

A later statechart should be event-driven. Direct target-state mutation should not be its public contract.

Candidate events:

```text
PLAN_REQUESTED
START_REQUESTED
APPROVAL_REQUIRED
APPROVAL_GRANTED
APPROVAL_REJECTED
RETRY_REQUESTED
RETRY_EXHAUSTED
ESCALATION_REQUESTED
RESUME_REQUESTED
COMPLETION_RECORDED
FAILURE_RECORDED
CANCEL_REQUESTED
ADMIN_RERUN_REQUESTED
```

Each event must carry only the minimum typed evidence needed for a pure transition decision. High-risk events such as `CANCEL_REQUESTED`, `ESCALATION_REQUESTED`, and `ADMIN_RERUN_REQUESTED` require authorization evidence from the existing control plane before the event is accepted.

`force=true` should not become the statechart API. If rerun behavior is retained, it should be represented as an explicit, audited, high-risk event with an authorization guard.

## 12. Guard and Effect Boundary

### 12.1 Pure Guard Inputs

Candidate pure guard facts include:

- `tenantResolved`;
- `policyDecision`;
- `approvalStatus`;
- `retryBudgetAvailable`;
- `rerunAuthorized`;
- `currentEnvironment`;
- `actorType`;
- `expectedVersion`.

The statechart may evaluate those facts. It must not obtain or mutate them during a transition.

### 12.2 Effects Outside the Machine

The following remain external effects:

- creating an approval request;
- sending a message;
- executing a command or connector;
- persisting current state;
- appending event or audit records;
- emitting attribution;
- saving a DAG run or node output;
- publishing a deliverable;
- retry scheduling or backoff timing;
- loading secrets or client data.

Future adapters may translate an accepted transition into these effects through existing governed services. The machine must not become a policy-blind shortcut around those services.

## 13. Candidate Compatibility Mapping

This table is a starting hypothesis for Phase 1 tests, not an approved migration map.

| Source status | Candidate canonical projection | Disposition |
| --- | --- | --- |
| legacy `queued` | `queued` | direct candidate |
| legacy `context_loaded` | `planning` | candidate; confirm whether context load is a state or milestone |
| legacy `in_progress` | `running` | direct candidate |
| legacy `draft_complete` | `running` | milestone candidate, not necessarily state |
| legacy `validation_passed` | `running` | milestone candidate before approval/execute branch |
| legacy `validation_failed` | `retrying` or `failed` | unresolved; depends on retry eligibility |
| legacy `pending_approval` | `waiting_for_approval` | direct candidate |
| legacy `approved` | `running` | candidate approval outcome, not durable process state |
| legacy `rejected` | `failed` or `cancelled` | operator decision required |
| legacy `revision_requested` | `retrying` | candidate |
| legacy `executed` | `completed` | candidate if execution is the terminal business outcome |
| legacy `logged` | `completed` | observability milestone candidate |
| legacy `closed` | `completed`, `failed`, or `cancelled` | cannot map without outcome context |
| BEL `pending` | `queued` or `planning` | depends on parent run phase |
| BEL `running` | `running` | direct candidate |
| BEL `waiting_for_approval` | `waiting_for_approval` | direct candidate |
| BEL `completed` | `completed` | only if the DAG defines the parent run outcome |
| BEL `failed` | `failed` or `retrying` | depends on node/run retry policy |
| BEL `cancelled` | `cancelled` | direct candidate |

## 14. Phase 1 Entry Gates

No Phase 1 work may begin until all of the following are true:

1. Audio separately says `proceed` for the exact dependency and lockfile mutation.
2. The dependency diff is reviewed before Audio separately says `proceed` for test/prototype source changes. One approval does not implicitly cover both gates.
3. Work occurs on an attached, isolated feature branch or approved worktree.
4. The exact package source and version are selected through the repository-selected package manager evidenced by the active lockfile at that time; the reviewed ZIP is not vendored.
5. Package and lockfile changes are explicitly scoped and reviewed.
6. Existing dependencies are installed through the repo-approved dependency workflow applicable at that time.
7. Baseline lifecycle, Operating Core, and BEL tests run successfully or failures are documented before prototype work.
8. The authoritative transition graph is ratified where Operating Core and control-plane semantics conflict.
9. Legacy-to-canonical mapping decisions required by the test fixture are closed.
10. Files to create or modify are declared before editing.
11. No runtime wiring, actor startup, snapshot serialization, or persisted snapshot path is included.

### 14.1 Ratification Evidence

The transition graph is ratified only when all of the following exist:

- a versioned transition reconciliation artifact under `docs/architecture/`;
- an accepted ADR or equivalent decision record under `docs/decisions/`;
- a corresponding accepted entry in `docs/decisions/DECISION_LOG.md`;
- Audio identified as the approving owner;
- explicit dispositions for Open Decisions 1 through 7 in Section 19.

Chat assent, an unversioned diagram, passing tests, or a draft document does not satisfy this gate.

Open Decisions 8 through 10 are later-phase decisions unless the proposed Phase 1 scope would touch concurrency, snapshots, or runtime actors. If it would, the affected decision becomes mandatory and requires a scope update before approval.

### 14.2 Verifiable Environment Terms

- **Attached branch:** `git symbolic-ref --short HEAD` succeeds and reports the approved feature branch.
- **Isolated worktree:** the worktree is dedicated to the approved XState proof and contains no unrelated intended changes in the declared file scope.
- **Repository-selected package manager:** the manager and version are determined from the repository manifest and active lockfile at Phase 1 diagnosis time.
- **Clean, reproducible baseline:** declared baseline commands can be rerun from the recorded commit with the recorded dependency state and produce the reported outcome.
- **Repo-approved dependency workflow:** the install command, manifest effect, lockfile effect, registry source, and validation plan are declared before the dependency approval gate.

## 15. Phase 1 Test-Only Proof

### 15.1 Proposed Scope

The smallest acceptable proof would:

- declare one pure XState machine for the ratified canonical process lifecycle;
- represent transitions through typed events;
- contain no I/O actions or invoked services;
- run only from targeted tests;
- compare its decisions with the ratified transition contract;
- use graph utilities where supported to test state reachability and event paths;
- leave all runtime imports and public execution paths unchanged.

### 15.2 Required Tests

- Every canonical state is reachable from the initial state or is explicitly exceptional.
- Every non-terminal state has an allowed path to a terminal state.
- Terminal states reject ordinary continuation events.
- Administrative rerun requires an explicit authorized event.
- Approval cannot be bypassed by completion, resume, retry, or rerun events.
- Missing tenant or policy evidence fails closed where required.
- Rejected and expired approvals produce ratified outcomes.
- Retry exhaustion reaches the ratified failure or escalation path.
- Cancellation paths match the ratified transition graph.
- Legacy and control-plane compatibility fixtures expose all divergences.
- BEL projection tests do not mutate BEL node or run state.

Snapshot serialization is excluded from the baseline Phase 1 proof. A later request to evaluate it requires an explicit scope update and separate approval. Any approved serialization-only test must remain in memory and may not create a fixture, snapshot file, runtime record, or other filesystem artifact.

### 15.3 Phase 1 Exit Criteria

Phase 1 may be called complete only when:

- targeted tests pass in a clean, reproducible environment;
- every divergence from existing transition behavior is listed and classified;
- no unexplained divergence remains;
- no runtime module imports XState;
- no runtime state or snapshots are written;
- the diff contains only approved dependency, prototype, and test files;
- a separate operator decision accepts, rejects, or extends the proof.

Passing Phase 1 does not authorize runtime integration.

## 16. Later-Phase Boundaries

### Phase 2 — Compatibility Adapter

Possible only after a successful Phase 1 decision. Existing public APIs would remain stable while an adapter compares or delegates pure transition decisions. Shadow evaluation must not mutate state twice.

### Phase 3 — Runtime Actor Evaluation

Possible only after demonstrated requirements for long-running flows, recovery, concurrency, distributed workers, or parent/child run coordination. Persistence and recovery would require a separate design and migration plan.

### Phase 4 — Runtime Authority Migration

Not planned or authorized. Any proposal would require production-relevant migration, rollback, idempotency, concurrency, audit, and compatibility evidence.

## 17. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A fourth state representation is added | More drift and contradictory behavior | Ratify vocabulary and transition semantics before prototype |
| XState guards are mistaken for security enforcement | Approval or policy bypass | Existing enforcement remains authoritative; guards consume resolved facts only |
| Actor snapshots become a second source of truth | Recovery and audit ambiguity | No snapshot persistence in Phase 1 |
| BEL is collapsed into statechart logic | Loss of DAG scheduling semantics | Keep BEL independent; project only parent run status |
| Legacy states are mapped by string similarity | Silent semantic loss | Use explicit, tested adapters and operator decisions |
| Generic forced transitions survive | Unaudited terminal escape | Replace with explicit governed rerun event in the target model |
| Package behavior changes across upgrades | Runtime or typing drift | Pin and review an approved version; read release notes before upgrades |
| ZIP archive is treated as dependency provenance | Supply-chain and reproducibility risk | Use package-manager provenance; do not vendor the archive |
| Documentation is mistaken for implementation | False readiness claim | Maintain documentation-only status and implementation gates |

## 18. Rollback Boundaries

Phase 0 rollback is documentation-only:

- supersede or remove this specification through a reviewed documentation change;
- preserve the ADR history and mark it superseded rather than silently deleting the decision;
- leave all source and runtime behavior unchanged.

A later Phase 1 rollback must be defined before implementation and should remove the test-only prototype and dependency without changing existing runtime state.

At minimum, that rollback plan must identify:

- the exact prototype and test files that would be removed;
- the approved package-manager command or reviewed patch that would remove the dependency and its lockfile entries;
- the pre-proof manifest and lockfile baseline used for comparison;
- commands proving no XState imports remain in runtime source;
- commands proving package and lockfile references are removed;
- baseline lifecycle, Operating Core, and BEL tests to rerun;
- a Git diff check showing that runtime state, generated artifacts, policy files, and unrelated source remain unchanged.

Deletion or destructive rollback execution would still require the applicable operator approval at that time.

## 19. Open Decisions

The following require explicit operator or architecture approval before relevant implementation:

1. Which transition graph becomes authoritative where Operating Core and control-plane rules conflict?
2. May cancellation occur from `queued`, `planning`, `running`, `retrying`, and `escalated`, or only selected states?
3. Does approval rejection mean `failed`, `cancelled`, or a distinct terminal outcome?
4. Is `failed -> queued` valid only through `ADMIN_RERUN_REQUESTED` with high-risk authorization?
5. Are `context_loaded`, `draft_complete`, `validation_passed`, `approved`, `executed`, `logged`, and `closed` events/milestones, projections, or durable states?
6. Which store ultimately owns canonical current process state?
7. Which event record proves a transition was authorized and committed?
8. What concurrency or version check prevents two actors from committing conflicting transitions?
9. What evidence would justify snapshot persistence?
10. What evidence would justify runtime actors instead of pure transition calculation?

## 20. Recommended Next Decision

Do not begin implementation yet.

The next architecture task should be a read-only transition reconciliation packet that:

- compares every edge in `RUN_STATE_TRANSITIONS`, `VALID_RUN_STATE_TRANSITIONS`, and control-plane `VALID_TRANSITIONS`;
- identifies actual callers and persisted records for each lifecycle;
- classifies each legacy status as canonical state, event, milestone, projection, or deprecated concept;
- proposes one authoritative transition graph;
- resolves Open Decisions 1 through 7 above;
- records Open Decisions 8 through 10 as deferred unless Phase 1 would touch their concerns;
- defines exact Phase 1 files and tests;
- ends at separate sequential `proceed` gates for the dependency/lockfile mutation and the test-only prototype changes.

## 21. Handoff Contract

```text
Review/Diagnosis owner: Codex architecture review
Actionable AI Assistant Task owner: Codex, after separate operator approval
Execution location/tool: AJ-DIGITAL-OS isolated feature branch or approved worktree
Human/operator role: Ratify transition semantics and approve any dependency/test changes
Copy/paste destination: Current AJ Digital OS Codex task
```

No action described in this specification should be interpreted as permission to install, implement, commit, push, merge, deploy, migrate, or activate XState.
