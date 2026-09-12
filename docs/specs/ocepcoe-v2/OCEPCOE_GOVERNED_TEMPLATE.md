# O-C-E-P-C-O-E Governed Template

## Template Control

| Field | Entry |
| --- | --- |
| Status | Candidate template |
| OCEPCOE version | 2.0 Phase 1 draft |
| Task | `<task name>` |
| Risk class | `<high, critical, or applicable organizational class>` |
| Requesting operator or role | `<name or role>` |
| Decision owner | `<name or role>` |
| Execution owner | `<name, role, agent, or unassigned>` |
| Verification owner | `<independent owner or role>` |
| Date | `<YYYY-MM-DD>` |
| Current lifecycle state | `<diagnosis, specified, awaiting approval, executing, validating, blocked, or complete>` |
| Readiness classification | `<draft-ready, review-ready, implementation-ready, validation-ready, merge-ready, deploy-ready, activation-ready, or blocked>` |

## Governing Authority

### Applicable Authorities

List controlling instructions in precedence order:

1. `<law, platform control, organizational policy, or none applicable>`
2. `<operator instruction>`
3. `<root and nearest AGENTS.md or repo policy>`
4. `<workflow constitution, implementation gate, or approval record>`
5. `This OCEPCOE task contract`

### Authorization Record

| Field | Entry |
| --- | --- |
| Exact authorized action | `<what may be done now>` |
| Explicitly excluded actions | `<what is not authorized>` |
| Approval evidence | `<exact operator phrase, record ID, or not yet approved>` |
| Approval scope | `<files, system, environment, phase, and risk boundary>` |
| Approval expiration | `<completion, state change, date, or other condition>` |
| Current gate | `<named gate>` |
| Next gate | `<named gate and required decision>` |

Never infer authority from urgency, a prior phase's approval, or a general request to continue. Planning, implementation, staging, commit, push, merge, deployment, migration, release, and activation remain separate unless controlling policy and explicit approval prove otherwise.

## Objective

### Problem

`<State the consequential problem or decision.>`

### Desired Outcome

`<State the exact observable artifact or authorized state change.>`

### Beneficiary and Decision Use

- Beneficiary: `<person, team, client, or system>`
- Decision enabled: `<what the result will and will not authorize>`

### Success Criteria

- `<measurable criterion 1>`
- `<measurable criterion 2>`
- `<measurable criterion 3>`

## Context

### Current Verified State

- Repository, branch, worktree, or environment: `<state>`
- Workflow or external system: `<state>`
- Current approval state: `<state>`
- Existing work and ownership: `<state>`

### Relevant Architecture and Prior Decisions

- `<precise source and effect>`

### Dependencies and Stakeholders

| Dependency or stakeholder | Role | Required input or decision | Current state |
| --- | --- | --- | --- |
| `<item>` | `<role>` | `<input>` | `<ready, missing, blocked, or not applicable>` |

### Truth Classification

| Class | Statement | Evidence or reasoning | Effect on decision |
| --- | --- | --- | --- |
| Known | `<directly supported fact>` | `<evidence>` | `<effect>` |
| Inferred | `<reasoned conclusion>` | `<reasoning>` | `<effect>` |
| Assumed | `<temporary assumption>` | `<verification path>` | `<effect>` |
| Unknown | `<unresolved information>` | `<why unknown>` | `<blocker or limitation>` |
| Speculation | `<possible scenario, if material>` | `<weak signal>` | `<do not treat as fact>` |
| Opinion | `<judgment or preference>` | `<criteria and tradeoff>` | `<effect>` |

## Evidence

### Provenance Register

| ID | Evidence | Location or stable identifier | Acquisition method | Observed at or version | Authority level | Supports | Limitation or sensitivity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-01 | `<artifact or observation>` | `<path, URL, command, SHA, or record ID>` | `<direct inspection, API, operator statement, etc.>` | `<timestamp or version>` | `<primary, secondary, advisory>` | `<claim>` | `<limitation; never paste secret values>` |

### Evidence Conflicts and Gaps

- Conflict: `<sources and conflicting claims, or none identified>`
- Resolution rule: `<precedence, refresh, verifier, or escalation>`
- Missing evidence: `<gap>`
- Consequence: `<blocker, limitation, or acceptable residual uncertainty>`

Refresh cheaply verifiable, drift-prone evidence before a consequential decision. Reference sensitive evidence without reproducing secret, credential, or private values.

## Procedure

### Execution Sequence

1. **Authority check:** Verify current instructions, approval, scope, and protected boundaries.
2. **State check:** Inspect current repository, worktree, workflow, system, and ownership state.
3. **Evidence check:** Collect and qualify decision-critical evidence.
4. **Risk check:** Confirm mitigations, rollback, stop conditions, and human gates.
5. **Execute authorized phase:** `<exact bounded action>`
6. **Independent verification:** `<checker, evidence, and commands>`
7. **Evaluation:** Apply acceptance criteria and critical-failure gates.
8. **Handoff:** Report state, evidence, side effects, limitations, and next decision.

### Decision Points

| Condition | Required response | Owner |
| --- | --- | --- |
| `<condition>` | `<continue, repair, escalate, roll back, or stop>` | `<role>` |

### Stop Conditions

- Approval is missing, expired, ambiguous, or outside scope.
- The target, environment, protected boundary, or rollback path cannot be established.
- Evidence required for a consequential action is missing or materially conflicting.
- A secret, credential, private-client-data, legal, financial, or permission risk exceeds the approved boundary.
- Validation fails in a way that makes continuation unsafe.
- The requested action conflicts with higher authority.

### Retry and Escalation

- Retry budget: `<number and type of retries>`
- Retry owner: `<role>`
- Escalation owner: `<role>`
- Escalation evidence: `<what must be supplied>`
- No retry may expand scope or bypass an approval gate.

## Constraints

### In Scope

- `<exact systems, files, actions, and phase>`

### Out of Scope

- `<excluded systems, files, actions, and later gates>`

### Protected Material and Systems

- `<secrets, client data, production, runtime core, policy, external service, or none>`

### Authorized Mutations

- `<exact mutation or none>`

### Prohibited Actions

- `<explicit prohibitions>`

### Operational Boundaries

- Time or budget: `<limit>`
- Tools or dependencies: `<approved set>`
- Environment: `<local, staging, production, or other>`
- Privacy or compliance: `<requirement>`
- Human-only actions: `<action>`

## Risk and Rollback

| Risk | Likelihood | Impact | Trigger | Mitigation | Rollback or recovery | Residual risk | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<risk>` | `<low, medium, high>` | `<low, medium, high>` | `<observable trigger>` | `<preventive action>` | `<exact reversible path or not available>` | `<remaining exposure>` | `<role>` |

### Reversibility Statement

- Reversible actions: `<list>`
- Irreversible or unproven actions: `<list>`
- Backup or recovery evidence: `<location or not established>`
- Rollback authority: `<role and approval>`

If rollback is unavailable or unproven, raise the approval level and state the limitation before execution.

## Conflict Resolution

| Conflict | Authorities or evidence involved | Precedence applied | Resolution | Unresolved effect |
| --- | --- | --- | --- | --- |
| `<conflict>` | `<sources>` | `<controlling rule>` | `<resolution>` | `<none, limitation, or blocker>` |

Do not silently choose the most convenient instruction. Preserve the higher-authority constraint and escalate unresolved material conflicts.

## Execution State and Ownership

| Work unit | State | Owner | Evidence | Blocker | Next authorized transition |
| --- | --- | --- | --- | --- | --- |
| `<unit>` | `<not started, active, validating, blocked, or complete>` | `<role>` | `<artifact or record>` | `<blocker or none>` | `<transition and required approval>` |

This table describes the task contract. It does not create persisted control-plane or workflow state. Reference the authoritative registry separately when one exists.

## Output Contract

Return these items in this order:

1. Outcome and exact lifecycle state.
2. Authorized actions actually performed.
3. Requested or implied actions not performed because they were outside the current gate.
4. Artifact paths, external record IDs, or response content.
5. Evidence register updates and material truth classifications.
6. Validation commands or checks and exact results.
7. Commands or checks intentionally not run and why.
8. Side effects and confirmed untouched scope.
9. Risk, rollback status, blockers, and limitations.
10. Scoped readiness classification with evidence.
11. Required next operator decision, decision owner, and approval boundary.

Required format: `<Markdown, Git Spec, review, runbook, patch, or other>`

Required retention or location: `<path, system, or response only>`

Sensitive-data rule: `<reference protected evidence; do not reproduce values>`

## Evaluation

### Acceptance Criteria

- [ ] The Objective and Success Criteria are satisfied within the authorized phase.
- [ ] Current authority and approval evidence are explicit.
- [ ] Decision-critical claims have adequate provenance and freshness.
- [ ] Facts, inferences, assumptions, unknowns, speculation, and opinions are not conflated.
- [ ] Procedure, stop conditions, retry limits, and escalation were followed.
- [ ] Scope, protected boundaries, and prohibited actions were respected.
- [ ] Risk, reversibility, and rollback status are disclosed.
- [ ] Required independent verification ran and is evidenced.
- [ ] The Output Contract and Definition of Done are complete.
- [ ] Readiness is scoped and does not imply a later approval.

### Critical Failures

Any one of these prevents a passing verdict:

- Unauthorized, out-of-scope, or approval-bypassing action.
- Invented, concealed, stale-as-current, or materially misclassified evidence.
- Secret, credential, private client data, or protected-information exposure.
- Destructive or difficult-to-reverse action without the required approval and recovery boundary.
- Unresolved high-impact safety, legal, financial, permission, production, or external-system risk.
- False validation, completion, readiness, or activation claim.
- Missing material side effect, limitation, conflict, or blocker.

### Evaluator and Verdict

- Evaluator: `<independent owner or role>`
- Evidence reviewed: `<IDs and validation results>`
- Verdict: `PASS`, `PASS_WITH_LIMITATIONS`, `REVISE`, or `BLOCKED`
- Reason: `<evidence-bound explanation>`

An evaluation verdict never substitutes for the next approval gate.

## Definition of Done

- [ ] Required artifact or authorized state change exists.
- [ ] Scope and ownership are correct.
- [ ] Acceptance criteria pass and no critical failure remains.
- [ ] Validation and independent verification evidence are recorded.
- [ ] Side effects, risk, rollback, and limitations are disclosed.
- [ ] Current lifecycle state and readiness classification are accurate.
- [ ] The next gate, decision owner, and required approval are explicit.
- [ ] No unperformed later action is represented as complete.

## Readiness Classification

Select exactly one and qualify its scope:

- `draft-ready`
- `review-ready`
- `implementation-ready`
- `validation-ready`
- `merge-ready`
- `deploy-ready`
- `activation-ready`
- `blocked`

Readiness statement:

`<Artifact or system> is <classification> for <scope>, based on <evidence>. This does not authorize <later gates>. Limitations: <limitations or none known>. Decision owner: <role>.`

## Recursive Improvement

When evaluation fails:

1. Name the failed OCEPCOE section or governed overlay.
2. Identify the evidence for failure.
3. Repair the smallest responsible layer within current authority.
4. Re-run affected validation and independent verification.
5. Re-check risk, scope, and readiness for consequential side effects.
6. Escalate when repair requires new authority, evidence, ownership, or capability.
7. Stop as `BLOCKED` when safe progress is no longer possible.

If a critical failure occurred, preserve the failed evaluation record. After authorized containment or remediation, create a new evaluation record that references the failure and includes independent verification evidence. Remediation may clear the current condition, but it does not erase the historical event.

## Final Governed Handoff

- Lifecycle state: `<state>`
- Verdict: `<verdict>`
- Readiness: `<scoped classification>`
- Actions performed: `<list>`
- Actions not authorized or not performed: `<list>`
- Evidence: `<register IDs and locations>`
- Validation: `<checks and results>`
- Side effects: `<list or none observed>`
- Rollback status: `<available, executed, unproven, or not applicable>`
- Remaining risks and limitations: `<list>`
- Next gate: `<gate>`
- Decision owner: `<role>`
- Required approval: `<exact action requiring approval>`
