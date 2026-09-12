# Workflow Constitution Template

**Status:** Candidate template
**Scope:** Governed AJ Digital OS workflows that use delegated agents, independent verification, or bounded retry loops
**Owner:** AJ Digital LLC / Audio Jones
**Related standard:** `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md`

This document is a Candidate template. It proposes workflow semantics but does not supersede canonical governance or claim current runtime implementation. Where this Candidate template conflicts with `AGENTS.md`, `docs/REPO_SAFETY_POLICY.md`, or other canonical repository governance, canonical governance controls.

## Identity

- Workflow name:
- Workflow ID:
- Owner:
- Tenant scope:
- Version:
- Status:
- Permission level: 0 | 1 | 2 | 3 | 4 | 5
- Action risk: low | medium | high | critical

`PermissionLevel` governs authorization scope. `ActionRisk` classifies the consequence of an action. These are separate dimensions and must not be conflated.

## Objective

What business or operational outcome must this workflow produce?

## Authoritative Inputs

List the approved sources the workflow may rely on.

Examples:

- source documents
- source code paths
- specifications
- decision records
- approved briefs
- database records
- issue or ticket references

## Protected Material

Identify content that must remain verbatim or cannot be altered without approval.

Examples:

- quoted source text
- legal or compliance language
- customer-provided facts
- approved brand copy
- credentials or secret references
- client-private data

## Required Outputs

Define each required artifact and its expected format.

| Output | Format | Owner | Required Evidence |
| --- | --- | --- | --- |
|  |  |  |  |

## Quality Standard

State what "done right" means across:

- accuracy
- completeness
- usability
- accessibility
- security
- brand fit
- business value
- source traceability
- tenant isolation
- approval compliance

## Prohibited Shortcuts

Examples:

- fabricated evidence
- hidden content
- placeholder output
- padding to satisfy length
- skipped routes or records
- cross-tenant retrieval
- unsupported claims
- tests modified merely to force a pass
- worker self-report treated as proof
- checker accepting the worker narrative without primary evidence

## Acceptance Criteria

Each criterion must include an ID, requirement, verification method, required evidence, severity, and remediation rule.

| Criterion ID | Requirement | Verification Method | Required Evidence | Severity | Remediation Rule |
| --- | --- | --- | --- | --- | --- |
| AC-001 |  |  |  | error |  |

## Agent Roles

| Role | Assigned Agent Or Model | Responsibility | Notes |
| --- | --- | --- | --- |
| Orchestrator |  | Decompose and coordinate workflow. |  |
| Worker |  | Execute bounded task. |  |
| Checker |  | Verify against evidence. |  |
| Adjudicator |  | Resolve disputes. |  |
| Human approver | Audio | Approve consequential actions. |  |

## Routing Policy

Define which task classes require high-capability models and which may use lower-cost workers.

| Task Class | Complexity | Ambiguity | Permission Level | Action Risk | Evidence Availability | Routing Rule |
| --- | --- | --- | --- | --- | --- | --- |
|  | low / medium / high | low / medium / high | 0-5 | low / medium / high / critical | strong / partial / weak |  |

## Tool Permissions

### Allowed

-

### Forbidden

-

### Approval-Gated

-

## Execution And Operator-Minimization Policy

### Primary Execution Interface

- Preferred CLI or executable interface:
- Fallback CLI or interface:
- Deterministic scripts available:
- Required environment capabilities:
- Required credentials or approvals:

### CLI-First Requirement

The assigned agent must attempt the approved task through the preferred
machine-operable interface before requesting routine administrative action from the
human operator. Deterministic software should be used before model-driven execution
where it can satisfy and verify the requirement.

CLI-first execution does not override tool permissions, approval gates, credentials,
tenant isolation, security controls, or repository-safety policy.

### Missing Capability Handling

When a required capability is unavailable:

1. Record the missing capability and blocked task.
2. Determine whether it can be installed, configured, or repaired within approved scope.
3. Create a supplemental environment-enablement task.
4. Classify its `PermissionLevel`, `ActionRisk`, reversibility, and approval requirement.
5. Execute and verify the supplemental task where authorized.
6. Resume the original task.
7. Escalate only the smallest irreducibly human action.

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

No field value authorizes execution by itself. Actual values must follow the implemented
`PermissionLevel` and `ActionRisk` types and canonical approval policy.

### Human-Only Actions

List only actions that genuinely require the operator:

- Credentials or authentication:
- Explicit approvals:
- Physical access:
- Strategic or business decisions:
- Security-sensitive changes:
- External, legal, or financial actions:

For every human escalation, record:

- requested action
- why the agent cannot perform it
- evidence references
- condition for agent execution to resume

### Repeated Administration Review

At workflow completion, identify any manual operator action that should become a script,
hook, connector, CLI wrapper, workflow, health check, or bootstrap task before the next
run.

## Evidence Requirements

Every pass or failure must reference evidence.

Required evidence surfaces:

-

Evidence may include source files, rendered pages, test output, API responses, schema validation, database state, screenshots, checksums, citations, audit records, or human approvals.

## Verification Plan

| Check | Checker | Evidence Source | Pass Condition | Failure Escalation |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Retry Policy

- Automatic retry limit:
- Escalation threshold:
- Critical halt conditions:
- Blind regeneration allowed: yes / no

Default recommendation:

```yaml
retry_policy:
  automatic_retries: 2
  third_failure: adjudicator_review
  unresolved_spec_conflict: human_review
  critical_failure: halt_immediately
```

## Dispute Policy

When a worker challenges a checker failure, record:

- worker evidence
- checker evidence
- governing requirement
- adjudicator decision
- whether the worker, checker, or specification needs correction

## Human Approval Gates

List actions requiring explicit approval regardless of checker outcome.

Canonical repository gates that must always be included:

- all merge actions
- all push actions
- all deployment actions
- all release actions
- all external communications

Additional examples:

- payments or financial changes
- legal representations
- privileged operating-system changes
- paid services, purchases, or external account creation
- production infrastructure or production data
- firewall or network-policy changes
- production database mutation
- credential or permission changes
- security-sensitive configuration
- destructive actions
- tenant-wide configuration changes

Workflow-specific gates may be stricter but may not weaken canonical repository policy.

## Budget

- Maximum model cost:
- Maximum tool cost:
- Maximum execution time:
- Maximum retries:
- Maximum human review time:

## Observability

Define required records:

- run record
- task records
- worker model and cost
- checker model and cost
- retry count
- failure categories
- checker reversals
- human escalations
- evidence references
- accepted output
- business outcome where measurable
- human interventions per workflow
- administrative actions delegated to humans
- environment-enablement attempts and outcomes
- time blocked on human access
- repeated manual steps detected
- manual steps automated
- percentage of tasks completed without operator administration

## Definition Of Complete

The workflow is complete only when:

- all required tasks pass independent verification
- evidence records exist for every pass or failure
- retry or dispute loops are closed
- required approvals are recorded
- artifacts are persisted in the approved location
- final integration verification passes
- audit, attribution, and observability records are complete where applicable

## Final Handoff

Use this after workflow completion or stop:

```txt
Review/Diagnosis owner:
Actionable AI Assistant Task owner:
Execution location/tool:
Human/operator role:
Copy/paste destination:

Facts:
Inferences:
Assumptions:
Risks:
Open questions:
Files changed:
Sources read:
Validation run:
Evidence records:
Approval records:
Recommended next action:
```
