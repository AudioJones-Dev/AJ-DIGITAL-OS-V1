# Agent Delegation And Verification Standard

**Status:** Candidate
**Scope:** AJ Digital OS agent runtime and governed workflows
**Owner:** AJ Digital LLC / Audio Jones
**Version:** 0.1
**Related standards:**
- `docs/system/AGENT_RUNTIME_STANDARD.md`
- `docs/system/CODEX_ITERATIVE_REPAIR_LOOP_STANDARD.md`
- `docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
- `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
- `docs/architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`

## 1. Purpose

This candidate standard defines how AJ Digital OS should delegate complex work across AI agents while controlling quality, cost, risk, and traceability.

AJ Digital OS must not treat model output, model confidence, agent role, premium-model identity, or worker completion claims as proof of correctness.

Reliability must come from approved specifications, bounded delegation, independent evidence-based verification, controlled retries, dispute adjudication, observability, and human approval where required.

This document is documentation-only. It does not implement runtime code, change model routing, change approval behavior, create schemas, install tools, or authorize autonomous execution.

This document is a Candidate standard. It proposes semantics and implementation targets but does not supersede canonical governance or claim current runtime implementation. Where this Candidate standard conflicts with `AGENTS.md`, `docs/REPO_SAFETY_POLICY.md`, or other canonical repository governance, canonical governance controls.

## 2. Core Principle

```text
Trust the process boundary, not the model identity.
```

No worker, orchestrator, reviewer, checker, adjudicator, high-capability model, or final integrator is exempt from verification.

Operating principle:

```text
Expensive models reason.
Appropriately capable models execute.
Independent systems verify.
The control plane coordinates and records adjudication.
Humans approve consequential actions.
```

## 3. What This Standard Is Not

This standard is not a multi-agent swarm doctrine.

It explicitly rejects these interpretations:

- more agents are inherently better
- agent count is a success metric
- expensive models should perform all work
- automated verification replaces approval
- a checker is automatically authoritative
- worker output can validate itself
- literal test passage is sufficient when business intent is violated

## 4. Authority And Placement

Recommended authority chain:

```text
AJ Digital OS Governance
-> Agent Runtime Standard
-> Agent Delegation And Verification Standard
-> Workflow-specific constitutions and check suites
```

This standard extends existing AJ Digital OS doctrine:

- the Control Plane / Kernel Layer controls execution authority
- Agent Permission Enforcement classifies allow, block, and approval-required actions
- the Approval System preserves human authorization for high-risk work
- Client Isolation keeps tenant-scoped work bounded
- Observability and Attribution record cost, failures, approvals, and outcomes
- the Codex Iterative Repair Loop provides a bounded review, repair, validate, repeat pattern for repo work

## 5. Required Runtime Roles

### Orchestrator

The orchestrator:

- interprets the approved project or workflow constitution
- decomposes work into bounded tasks
- defines dependencies
- selects workers and checkers according to routing policy
- manages execution state
- sends failures for remediation
- escalates unresolved disputes

The orchestrator should not perform worker tasks when an appropriate bounded worker is available and verification is strong.

### Worker

The worker:

- receives one bounded task
- operates only within supplied context and permissions
- returns structured output
- attaches required evidence
- does not self-certify completion

### Checker

The checker:

- evaluates output against explicit acceptance criteria
- inspects primary evidence independently
- ignores unsupported worker completion claims
- returns pass, fail, or escalation
- provides criterion-specific failure details

### Adjudicator

The adjudicator:

- resolves worker-checker disputes
- checks governing specifications and primary evidence
- may uphold the checker, reverse the checker, reject the worker output, amend a checker rule, identify a defective specification, or escalate to a human
- records the decision and rationale

### Human Approver

The human approver:

- authorizes high-risk or externally consequential actions
- resolves irreducibly subjective or strategic disputes
- approves changes to governing constitutions
- may stop or override a workflow

## 6. Workflow Constitution Requirement

Every complex governed workflow must begin with a Workflow Constitution.

The constitution defines:

- objective
- authoritative inputs
- protected source material
- prohibited shortcuts
- quality constraints
- required outputs
- evidence requirements
- acceptance tests
- model-routing constraints
- retry limits
- escalation conditions
- approval boundaries
- risk classification
- cost ceiling
- time ceiling
- completion definition

A workflow may not enter autonomous or delegated execution without a resolvable definition of acceptable completion.

Template: `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md`

## 7. Task Contract

Every delegated task must contain a structured contract.

```ts
interface AgentTaskContract {
  taskId: string;
  runId: string;
  tenantId?: string;
  objective: string;
  inputs: EvidenceReference[];
  constraints: string[];
  protectedContent?: EvidenceReference[];
  expectedOutputSchema: string;
  acceptanceCriteria: AcceptanceCriterion[];
  evidenceRequirements: string[];
  permissionLevel: 0 | 1 | 2 | 3 | 4 | 5;
  actionRisk: "low" | "medium" | "high" | "critical";
  allowedTools: string[];
  forbiddenActions: string[];
  retryLimit: number;
  escalationPolicy: string;
}
```

The task contract must make hidden shortcuts invalid even when output shape appears correct.

## 8. Model Routing

Models must be selected by capability, risk, verification strength, and cost.

Routing should evaluate:

```ts
interface TaskRoutingDecision {
  taskType: string;
  complexity: "low" | "medium" | "high";
  ambiguity: "low" | "medium" | "high";
  permissionLevel: 0 | 1 | 2 | 3 | 4 | 5;
  actionRisk: "low" | "medium" | "high" | "critical";
  evidenceAvailability: "strong" | "partial" | "weak";
  requiredCapabilities: string[];
  candidateModels: string[];
  selectedModel: string;
  estimatedCost: number;
  routingReason: string;
}
```

`PermissionLevel` governs authorization scope. `ActionRisk` classifies the consequence of an action. These are separate dimensions and must not be conflated.

High-cost models should be reserved for work where stronger reasoning materially changes the expected outcome, including:

- decomposition
- specification
- architecture
- adjudication
- ambiguous synthesis
- high-risk review

Lower-cost models may perform bounded execution when:

- the task is explicit
- outputs are structured
- failure is recoverable
- correctness can be independently checked
- protected content and permissions are clear

## 8.1 CLI-First Execution And Operator Minimization

After an approved task chain is defined, the first reasonable execution attempt must
use an available machine-operable interface. The human operator must not receive
routine administration merely because an agent has not attempted the available
technical path.

Candidate execution priority:

```text
approved task contract
-> existing deterministic script or automation
-> existing CLI or local tool
-> existing API, MCP, or connector
-> agent-executed terminal workflow
-> supplemental environment-enablement task
-> minimal human escalation
```

Deterministic software remains preferred when it can satisfy and verify the task. A
CLI-first attempt does not bypass tool permissions, approval gates, credential policy,
tenant boundaries, or repository safety.

### Missing Environment Capability

When an approved task is blocked by a missing CLI, runtime, adapter, dependency,
service, PATH entry, hook, or other environment capability, the orchestrator should
create a supplemental environment-enablement task before assigning routine setup to
the human.

The supplemental task must remain within the original authorization, scope, cost,
tenant, and environment boundaries. It may install, configure, repair, or document a
capability only when canonical governance already permits that action. A supplemental
task never inherits authority merely because it unblocks another task.

```yaml
supplemental_task:
  blocked_task_id: string
  missing_capability: string
  required_for: string
  proposed_change: string
  execution_method: string
  files_or_environment_affected: []
  permissionLevel: 0 | 1 | 2 | 3 | 4 | 5
  actionRisk: low | medium | high | critical
  reversible: boolean
  verification: string
  approval_required: boolean
```

`permissionLevel`, `actionRisk`, and `approval_required` must reflect the actual task.
No field value authorizes execution by itself.

Supplemental environment enablement requires explicit human approval when it involves:

- credentials or authentication
- privileged operating-system changes
- paid services, purchases, or external account creation
- production infrastructure or production data
- firewall or network-policy changes
- destructive actions
- merge, push, deployment, or release
- external communication
- security-sensitive configuration
- changes outside the approved repository or environment boundary
- any action gated by `AGENTS.md`, `docs/REPO_SAFETY_POLICY.md`, or canonical governance

### Human Escalation

An agent may escalate execution only when at least one of these conditions is true:

1. Human credentials, authentication, physical access, or account ownership is required.
2. Canonical governance requires explicit approval.
3. The action is destructive, irreversible, external, financial, legal, or security-sensitive.
4. No approved machine-operable interface exists.
5. An authorized environment-enablement attempt failed with recorded evidence.
6. The decision requires human strategy, preference, ethics, or business judgment.
7. The task exceeds approved permission, scope, cost, tenant, or environment boundaries.
8. Bounded retry and adjudication did not resolve the task.

The escalation must request the smallest action only the human can perform and define
the condition that returns execution responsibility to the agent.

```ts
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

After the operator provides the required approval, credential access, or decision, the
agent resumes responsibility for the remaining machine-operable work.

### Administrative Task Elimination

Repeated operator administration is an automation signal. A workflow closeout should
identify repeated manual steps that may become a CLI wrapper, repository script,
bootstrap command, hook, connector, MCP integration, scheduled workflow, approval
action, health check, or reusable runbook.

The target is zero unnecessary human administration, not zero human governance. The
human operates the business and governs the system; the system operates the tools.

A chat-based assistant without the required execution environment should produce a
bounded task contract for an authorized executor instead of transferring routine
administration to the human.

A workflow is not operationally mature when its normal successful path depends on
repeated human administration. Operational maturity requires machine-operable routine
execution, documented or bootstrapped prerequisites, actionable failure evidence,
human intervention limited to approval or genuine exception handling, and an identified
automation path for repeated manual steps.

## 9. Worker Claims Are Not Evidence

A worker returning `done: true` must never satisfy completion by itself.

Required completion model:

```text
Worker output
+ verifier result
+ evidence artifacts
+ acceptance-test result
= eligible for completion
```

Worker explanations can be useful context, but they are not proof.

## 10. Independent Verification

Verification must inspect primary evidence. The checker should not merely critique the worker's explanation.

Valid verification mechanisms include:

- deterministic tests
- schema validation
- source comparison
- browser execution
- compilation
- static analysis
- database queries
- API inspection
- accessibility testing
- security checks
- policy evaluation
- tenant-boundary checks
- human review

The checker should use a different execution context, prompt, and where practical a different model or deterministic toolchain from the worker.

## 11. Checks Must Test Intent

Validators must test the real objective, not only literal compliance.

Checks should detect:

- hidden or inaccessible content
- placeholder elements
- padded or fabricated text
- passing tests that do not prove the requirement
- outputs that satisfy syntax but violate user intent
- source drift
- cross-tenant leakage
- destructive side effects
- unsupported factual claims

## 12. No Rank Escapes Verification

The following outputs require checks:

- worker output
- orchestrator-generated specifications
- reviewer decisions
- checker rules
- adjudicator outcomes
- final integration
- deployment results

High-capability model output can reduce uncertainty, but it cannot replace evidence.

## 13. Evidence Requirement

Every pass or failure must reference evidence.

Minimum verification record:

```ts
interface VerificationRecord {
  taskId: string;
  checkerId: string;
  verdict: "pass" | "fail" | "escalate";
  criteriaResults: CriterionResult[];
  evidenceRefs: string[];
  checkerModel?: string;
  verificationCost?: number;
  verifiedAt: string;
}
```

Evidence references may point to source files, rendered pages, logs, test output, API responses, screenshots, database records, checksums, citations, or human approval records.

## 14. Failure And Remediation

A failed task must return criterion-specific details.

```ts
interface VerificationFailure {
  criterionId: string;
  severity: "warning" | "error" | "critical";
  expected: string;
  observed: string;
  evidenceRefs: string[];
  remediation: string;
  retryable: boolean;
  requiresEscalation: boolean;
}
```

Do not issue vague retries such as:

```text
Try again.
Improve this.
Fix the output.
```

Retries must address identified defects. Blind regeneration is prohibited unless the output is fully disposable and the workflow constitution explicitly allows it.

## 15. Bounded Retry Loop

Recommended initial policy:

```yaml
retry_policy:
  automatic_retries: 2
  third_failure: adjudicator_review
  unresolved_spec_conflict: human_review
  critical_failure: halt_immediately
```

Runtime sequence:

```text
Constitution
-> task decomposition
-> model routing
-> worker execution
-> independent verification
-> pass or specific remediation
-> bounded retry
-> dispute adjudication
-> human approval where required
-> final integration verification
-> audit, attribution, and optimization
```

## 16. Dispute Resolution

A worker may challenge a checker result only when it can reference contradictory primary evidence or an inconsistency in the governing specification.

Dispute flow:

```text
Worker appeal
-> gather source evidence
-> adjudicator evaluates specification and evidence
-> uphold failure, reverse failure, amend checker, amend specification, or escalate
-> audit decision
```

The adjudicator evaluates:

1. original requirement
2. acceptance criterion
3. worker evidence
4. checker evidence
5. workflow constitution
6. business or user intent

## 17. Security And Tenant Isolation

All execution, verification, evidence, memory access, connector use, and audit events must remain tenant-scoped where tenant context applies.

A verifier must not receive broader permissions than necessary to inspect the task result.

Verification must never become a bypass around approval, access control, or data-isolation policy.

## 18. Approval Boundaries

Human approval is risk-based, not failure-based.

Passing automated checks does not authorize high-risk execution.

Human approval remains mandatory for:

- all merge actions
- all push actions
- all deployment actions
- all release actions
- all external communications
- payments or financial changes
- legal representations
- production database mutation
- credential or permission changes
- destructive actions
- tenant-wide configuration changes

Workflow-specific constitutions may add stricter approval gates but may not weaken canonical repository policy.

## 19. Observability And Cost Accounting

Every governed delegation run should record:

- orchestrator model and cost
- worker model and cost
- checker model and cost
- adjudicator model and cost, when used
- tasks attempted
- first-pass success rate
- retry count
- failure category
- checker reversal rate
- human escalation rate
- execution duration
- verification duration
- total cost
- estimated single-model baseline
- accepted output
- business outcome where measurable
- human interventions per workflow
- administrative actions delegated to humans
- environment-enablement attempts and success rate
- time blocked on human access
- repeated manual steps detected
- manual steps automated
- percentage of tasks completed without operator administration

## 20. Required Metrics

Initial candidate metrics:

```text
Cost per accepted task
First-pass acceptance rate
Defect detection rate
Escaped defect rate
False-failure rate
Checker reversal rate
Average retries per task
Human intervention rate
Time to accepted completion
High-cost model utilization
Percentage of tasks with valid evidence
Human interventions per workflow
Environment-enablement success rate
Time blocked on human access
Repeated manual steps detected
Manual steps automated
Percentage of tasks completed without operator administration
```

Metrics are not authorization. They inform optimization and promotion decisions.

## 21. Prohibited Patterns

Prohibited:

- one model writes and approves its own consequential work
- worker self-report treated as acceptance
- model selection based only on brand or benchmark rank
- high-cost model used indiscriminately
- checker evaluates only the worker narrative
- unlimited retries
- hidden shortcuts used to satisfy literal checks
- unverifiable output marked complete
- automated passing treated as authorization for high-risk action
- cross-tenant evidence or memory access
- agent count used as a success metric
- assigning terminal commands to a human before an authorized agent attempts them
- treating missing local setup as a permanent human responsibility
- asking a human to repeat deterministic administration
- creating one-off setup without a repeatable bootstrap path
- bypassing approval or permission policy in the name of operator minimization
- installing unapproved tools, dependencies, hooks, or integrations
- expanding an environment-enablement task beyond the approved contract
- concealing failed environment-enablement attempts

## 22. Delegation Verification Pilot

The Delegation Verification Pilot validates worker, checker, and adjudicator behavior; evidence and retry semantics; and independent verification. Its initial workflow is documentation and specification production.

Suggested workflow:

```text
Constitution agent
-> source-research workers
-> draft-section workers
-> citation checker
-> architecture-consistency checker
-> governance-language checker
-> final integration checker
-> adjudicator
-> human approval
```

Why this pilot:

- low destructive risk
- available source evidence
- machine-checkable structure
- citation validation
- architectural consistency checks
- meaningful cost and quality measurement

Do not pilot this first on:

- production CRM mutations
- billing
- outbound client communication
- deployments
- credential changes
- destructive repository actions

Initial pilot acceptance criteria:

| Metric | Initial target |
| --- | --- |
| Tasks with independent verification | 100% |
| Tasks with evidence references | 100% |
| Unsupported factual claims | 0 |
| Critical governance conflicts | 0 |
| Human review time reduction | Measure baseline versus pilot |
| Cost versus one-premium-model baseline | At least 30% lower or materially higher quality |
| Checker reversals | Recorded, not assumed to be zero |
| Escaped defects after human review | Fewer than baseline |

## 23. Implementation Sequence

This sequence is recommended only after Candidate standard review.

```text
Phase 1 - Standard
Create candidate doctrine and constitution template.

Phase 2 - Schemas
Add task contract, verification record, failure record, appeal, and adjudication schemas.

Phase 3 - Runtime
Add worker -> checker -> remediation -> retry -> adjudication transitions.

Phase 4 - Routing
Extend model router with capability, risk, verification-strength, and cost-aware selection.

Phase 5 - Evidence
Create evidence registry linking task outputs to files, tests, URLs, logs, and source records.

Phase 6 - Observability
Record cost per role, first-pass rate, retries, reversals, escalation, and accepted-result cost.

Phase 7 - Delegation Verification Pilot
Run documentation/specification workflow against a real AJ Digital OS deliverable.

Phase 8 - Evaluation
Compare against a single-agent baseline.

Phase 9 - Promotion
Ratify, revise, or reject the standard based on measured results.
```

## 24. Promotion Requirement

This standard may move from Candidate to Canonical only after at least two representative pilots demonstrate:

- equal or improved output quality
- lower or justified total cost
- measurable defect detection
- acceptable false-failure rate
- bounded retry behavior
- complete audit and evidence records
- no approval bypass
- no tenant-isolation bypass

## 25. Current Unresolved Decisions

Before implementation, Audio must approve:

1. Whether this remains an internal experimental runtime profile or becomes platform-wide doctrine.
2. Which actions remain human-gated regardless of automated verification.
3. The initial Delegation Verification Pilot workflow.
4. Whether routing/cost fields become formal schemas or remain workflow metadata in the Delegation Verification Pilot.
5. Where evidence records live before a runtime evidence registry exists.

## 26. Bottom Line

The defensible operating model is not a swarm recipe.

It is a verification-governed delegation runtime:

```text
Specification
+ economical task routing
+ independent evidence
+ bounded correction
+ dispute resolution
+ approval
+ observability
= scalable agent execution
```
