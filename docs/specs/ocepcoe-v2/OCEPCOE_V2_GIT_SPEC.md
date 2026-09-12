# Git Spec: O-C-E-P-C-O-E v2 Task Contract Standard

## Document Control

| Field | Value |
| --- | --- |
| Status | Candidate; documentation-only |
| Version | 2.0 Phase 1 draft |
| Owner | AJ Digital LLC operator |
| Repository | AJ Digital OS |
| Scope | Prompt and task-contract framing |
| Authority level | Advisory; does not grant execution authority |
| Current phase | Phase 1 specification and templates |
| Ratification state | Not ratified |

## Purpose

O-C-E-P-C-O-E (OCEPCOE) is a reusable task-contract standard for turning an operator's intent into an auditable instruction set. It gives a human or agent a common structure for stating what must be achieved, which context and evidence control the work, how the work should proceed, what boundaries apply, what must be returned, and how the result will be evaluated.

This specification evolves the original seven-part prompt lens into three proportional profiles and a governed overlay for consequential work. It is designed to improve task clarity without creating a parallel authority, approval, workflow, or runtime system.

## Problem

Unstructured prompts regularly leave one or more of these questions implicit:

- What outcome is actually required?
- Which facts, sources, and repository state are authoritative?
- Which actions are authorized, and which require a separate approval?
- What sequence should be followed?
- What must not change?
- What evidence must be returned?
- What qualifies as complete, validated, merge-ready, deployable, or activated?
- What should happen when evidence conflicts or the first result fails?

The original OCEPCOE structure addresses many of these gaps, but a single template can be too heavy for low-risk work and too thin for high-risk work. In particular, consequential tasks need explicit authority, provenance, ownership, rollback, conflict resolution, readiness, and definition-of-done controls.

## Desired Outcome

Phase 1 establishes a candidate documentation package that:

1. Preserves the OCEPCOE acronym and its seven core sections.
2. Introduces Lite, Standard, and Governed profiles.
3. Defines selection and escalation rules.
4. Separates task framing from authority, execution state, and runtime enforcement.
5. Makes facts, inferences, assumptions, unknowns, and opinions distinguishable.
6. Makes validation and readiness claims evidence-bound.
7. Provides reusable templates and an evaluation checklist.
8. Creates a reversible basis for later pilot testing and ratification.

## Core Model

| Letter | Section | Required question |
| --- | --- | --- |
| O | Objective | What exact outcome must be achieved? |
| C | Context | What background, current state, and system relationships matter? |
| E | Evidence | What sources support the work, and how trustworthy and current are they? |
| P | Procedure | What sequence, decision points, and checks should govern execution? |
| C | Constraints | What boundaries, permissions, exclusions, and risk limits apply? |
| O | Output Contract | What exact artifact, format, evidence, and handoff must be returned? |
| E | Evaluation | How will correctness, completeness, safety, and readiness be judged? |

OCEPCOE is a task contract, not merely a writing pattern. Each section should constrain interpretation or execution. Empty ceremonial sections add noise and should be removed or replaced by a more suitable profile.

## Evidence Snapshot

### Known

- AJ Digital OS already has canonical repository safety, implementation-gate, handoff, delegation, verification, and workflow-constitution documents.
- Those documents control repo-local authority and execution behavior.
- The original OCEPCOE lens contains seven sections plus truth-seeking, execution, and recursive-improvement rules.
- Different risk levels require different amounts of task-contract detail.
- Phase 1 is limited to documentation and templates.

### Inferred

- A profile system will reduce over-specification on small tasks while improving control on consequential tasks.
- Explicit precedence and readiness rules will reduce accidental overclaiming.
- A shared evaluation checklist will make pilots comparable.

### Assumed

- Initial users are AJ Digital OS operators and AI agents working under existing repository policy.
- The templates will be copied into prompts, task specs, handoffs, or planning documents.
- Phase 1 pilots can remain read-only until a later approval defines otherwise.

### Unknown

- Which profile will provide the best time-to-quality ratio across real task classes.
- Whether OCEPCOE should eventually become a ratified repo-wide standard.
- Whether future tooling should generate, validate, or persist OCEPCOE task contracts.
- Which quantitative thresholds should become release gates after pilots.

## Authority and Precedence

OCEPCOE never creates authority. It records and clarifies authority granted elsewhere.

When instructions conflict, apply this order:

1. Applicable law, platform safety controls, and binding organizational policy.
2. The operator's most recent explicit instruction within their authority.
3. Repository `AGENTS.md` files and canonical repo policy documents.
4. Approved workflow constitutions, implementation gates, and task-specific approvals.
5. The OCEPCOE task contract.
6. Supporting plans, examples, preferences, and non-authoritative notes.

The nearest applicable repository instruction may refine local workflow, but OCEPCOE cannot weaken a safety, secret, protected-path, approval, or validation rule. If a task contract conflicts with a higher authority, stop the conflicting action, identify the exact conflict, and request resolution when it materially affects the outcome.

An OCEPCOE document may say that an action is requested. It must not represent that request as authorization unless the controlling policy and approval record prove it.

## Relationship to Existing AJ Digital OS Standards

| Existing standard | Primary role | OCEPCOE relationship |
| --- | --- | --- |
| Root and child `AGENTS.md` files | Repository-local operating instructions and safety boundaries | OCEPCOE inherits them and cannot override them. |
| Operating and repository safety policies | Canonical risk and execution rules | OCEPCOE cites applicable constraints; it does not restate or replace the policies. |
| Implementation gates | Approval boundaries between planning, implementation, commit, push, merge, deploy, and activation | OCEPCOE records the current gate and required next approval. |
| Workflow Constitution | Workflow-level roles, permissions, routing, retries, approvals, evidence, and completion contract | OCEPCOE frames a specific task inside the constitution. |
| Agent Delegation and Verification Standard | Worker/checker roles, delegation, evidence, retries, and escalation | OCEPCOE supplies the bounded task contract passed into that execution model. |
| Agent Operations Control Plane specification | Lifecycle, state, registry, orchestration, and runtime behavior | OCEPCOE may describe intended state but does not persist or enforce it. |

If an existing workflow constitution already supplies a field, the task contract may reference that field rather than duplicate it. The reference must be precise enough for the executor and evaluator to locate the controlling text.

## Operating Profiles

### Lite

Use Lite only when all of these conditions are true:

- The task is low risk and readily reversible.
- The task is bounded to one small outcome.
- No secret, credential, client data, production, financial, legal, public communication, destructive, or approval-gated action is involved.
- Evidence is simple, local, and unlikely to be disputed.
- Failure has a small blast radius.
- The output can be evaluated with a short completion check.

Lite should usually contain a compact Objective, Essential Context, Evidence Basis, Constraints, Output Contract, and Completion Check. The Procedure may be a short sequence.

### Standard

Use Standard for ordinary research, review, planning, documentation, or bounded implementation when:

- The work has multiple steps or dependencies.
- Evidence must be compared or qualified.
- Scope boundaries matter.
- Validation is required.
- The task remains reversible and does not cross a high-consequence approval boundary.

Standard uses all seven OCEPCOE sections and the truth-seeking, execution, and recursive-improvement rules.

### Governed

Within a task, pilot, or workflow that explicitly adopts this candidate standard, the Governed profile is required when any of these conditions apply. This selection rule governs use of OCEPCOE; it does not make the unratified standard binding on repository work that has not adopted it.

- The work is destructive, difficult to reverse, production-impacting, or externally visible.
- It touches secrets, credentials, client data, permissions, money, legal commitments, public communications, deployments, releases, or external integrations.
- It changes repo governance, agent behavior, hooks, CI/CD, MCP access, vault access, runtime core, protected paths, or approval enforcement.
- It requires a human approval gate.
- Multiple owners, agents, systems, or handoffs create material coordination risk.
- Decision-critical evidence is materially conflicting or unresolved, too stale for the consequence of the decision, sensitive, or incomplete enough that an assumption could alter the outcome.
- Multiple authorities supply decision-critical evidence and their precedence or interpretation is unresolved.
- The result could be mistaken for merge, release, deployment, legal, commercial, or activation authority.
- Rollback, escalation, or readiness classification is material to safe completion.

Governed includes every Standard section plus the governed overlays defined below.

### Profile Escalation Rule

When uncertain, select the higher profile. A task may move from Lite to Standard or from Standard to Governed at any time. Within an OCEPCOE task, it must be upgraded before continuing if a governed trigger is discovered.

A profile must not be downgraded to avoid evidence, validation, approval, rollback, or reporting requirements. If only one segment is consequential, isolate that segment under a Governed contract or use Governed for the entire task when isolation would obscure ownership or risk.

## Core Section Requirements

### Objective

The Objective states the observable end condition, not just an activity.

It should include:

- The problem to resolve.
- The artifact or state to produce.
- The intended beneficiary or system.
- The measurable success condition.
- The current approval boundary when execution is involved.

Weak: `Review the documentation.`

Stronger: `Classify every uncommitted documentation unit as merge-ready, revision-required, or blocked, with file-level evidence and no repository mutations.`

### Context

Context contains only information that materially changes interpretation or execution:

- Current repository, branch, worktree, environment, or workflow state.
- Relevant architecture, naming, and prior decisions.
- Applicable authorities and stakeholders.
- Dependencies and adjacent systems.
- Known conflicts, deferred work, and current blockers.

Context should distinguish current verified state from historical notes or intended future state.

### Evidence

Evidence identifies what supports a claim or decision and how it was obtained.

For each material source, record as appropriate:

- Source or artifact.
- Location or stable identifier.
- Date or observed state.
- Provenance: direct observation, primary source, secondary source, operator statement, or inference.
- Freshness and limitations.
- Which claim it supports.

No quantity of low-quality evidence can convert an assumption into a fact. Missing evidence should be reported as an unknown, limitation, or blocker.

### Procedure

The Procedure states the execution sequence, not merely a list of topics.

It should include:

- Initial diagnosis and scope confirmation.
- Ordered actions.
- Decision points and stop conditions.
- Validation points.
- Approval gates.
- Escalation and repair loops.
- Final handoff.

Consequential actions should be separated into independently approved phases. Planning, implementation, staging, commit, push, merge, deploy, migration, and activation are distinct unless higher authority explicitly combines them.

### Constraints

Constraints define boundaries such as:

- In scope and out of scope.
- Authorized mutations.
- Protected files, systems, and data.
- Time, cost, tool, and dependency limits.
- Security, privacy, compliance, and brand rules.
- Required human approvals.
- Prohibited claims and operations.
- Reversibility and rollback conditions.

A constraint should be testable. `Be careful` is not a useful boundary; `Do not modify, stage, commit, push, merge, deploy, or change external state` is.

### Output Contract

The Output Contract defines what the receiver must get:

- Required artifact or response type.
- Structure and level of detail.
- File paths or delivery location.
- Claims that require citations or command evidence.
- Validation results.
- Changed and unchanged scope.
- Remaining risks, blockers, and limitations.
- Required next operator decision.

An output contract should be sufficient for another authorized human or agent to continue without the original conversation.

### Evaluation

Evaluation defines how the work will be judged. It should include:

- Acceptance criteria.
- Critical failure conditions.
- Required validation evidence.
- Reviewer or decision owner.
- Allowed verdicts.
- Repair instructions when criteria fail.

Evaluation is not approval. A passing evaluation demonstrates conformity to the stated contract; it does not authorize a later gated action.

## Cross-Cutting Rules

### Truth-Seeking Rule

Every material conclusion should be classified where ambiguity could affect a decision:

| Classification | Meaning |
| --- | --- |
| Known | Directly supported by current, inspectable evidence. |
| Inferred | Reasoned from known evidence; the reasoning can be explained. |
| Assumed | Temporarily accepted to continue; not yet proven. |
| Unknown | Information needed or relevant but not currently established. |
| Speculation | A possibility with insufficient supporting evidence. |
| Opinion | A preference or judgment, including its criteria and tradeoffs. |

The executor must not silently promote an inference, assumption, speculation, or opinion to a fact. Material uncertainty must appear in the output.

### Execution Rule

Treat the operator's request and the OCEPCOE contract as the execution specification within the applicable authority boundary. Do not merely rewrite the prompt. Inspect available evidence, perform authorized work, validate the result, and return the required artifact.

If the contract authorizes analysis only, execution means completing the analysis; it does not imply permission to mutate a repository or external system.

### Recursive Improvement Rule

When evaluation fails:

1. Identify the failed section or governed overlay.
2. Determine whether the cause is missing evidence, ambiguous context, weak procedure, violated constraint, deficient output, or invalid evaluation.
3. Repair the smallest responsible layer.
4. Re-run the affected validation.
5. Re-evaluate the whole contract for consequential side effects.
6. Record unresolved limitations and stop when authority or evidence is insufficient.

Do not restart the entire task automatically when a bounded repair is adequate. Do not continue an unsafe action merely because a retry budget remains.

## Governed Overlays

### 1. Authority

Record:

- Requesting operator or role.
- Decision owner.
- Execution owner.
- Verification owner.
- Exact authorized action.
- Explicitly excluded actions.
- Approval phrase or record when applicable.
- Approval scope and expiration condition.
- Current gate and next gate.

Authority must be evidenced, not inferred from urgency, prior approvals, or a general request to continue.

### 2. Evidence Provenance and Freshness

For each decision-critical claim, identify the source, acquisition method, timestamp or version, authority level, supported claim, and limitation. Cheaply verifiable drift-prone facts should be refreshed before consequential decisions.

Sensitive evidence must be referenced without reproducing secrets, credentials, private client data, or restricted content.

### 3. Execution State and Ownership

Record:

- Current lifecycle state.
- Work already completed.
- Work currently active.
- Work not started.
- Current owner.
- Required verifier.
- Blocking dependency.
- Next authorized transition.

Narrative descriptions do not create persisted runtime state. When a control-plane or workflow registry exists, its current authoritative state should be referenced separately.

### 4. Risk and Rollback

For each material risk, record likelihood, impact, trigger, mitigation, rollback, and residual risk. State what is reversible, what is not, and who can authorize rollback or recovery.

If rollback is impossible or unproven, treat that as a constraint and raise the required approval level.

### 5. Conflict Resolution

Record known conflicts between instructions, evidence, owners, or systems. Apply the precedence hierarchy, preserve the higher-authority constraint, and surface unresolved conflicts before they affect a consequential action.

### 6. Definition of Done

Definition of Done must be observable and should cover:

- Required artifact exists.
- Scope is correct.
- Acceptance criteria pass.
- Required validation ran and results are recorded.
- No critical failure remains.
- Changes, side effects, risks, and limitations are disclosed.
- Ownership and next gate are clear.
- Required approval has been obtained only for the actions actually performed.

### 7. Readiness Classification

Use explicit classifications rather than a generic `ready` claim:

| Classification | Meaning |
| --- | --- |
| Draft-ready | The artifact is coherent enough for review; not approved. |
| Review-ready | Required evidence is assembled for the named reviewer. |
| Implementation-ready | The task is specified and approved for implementation only. |
| Validation-ready | Implementation or artifact is ready for the named checks. |
| Merge-ready | Local review criteria pass; merge still requires its governing approval. |
| Deploy-ready | Release evidence is assembled; deployment still requires its governing approval. |
| Activation-ready | Technical, operational, legal, commercial, and human gates explicitly required by the task are satisfied. |
| Blocked | A required fact, approval, capability, dependency, or safety condition is missing. |

Every readiness claim must name its scope, evidence, limitations, and decision owner. One classification does not imply another. Local build success alone does not establish merge, deploy, production, commercial, legal, or activation readiness.

## Clarification Threshold

Ask a clarifying question only when the missing answer would materially change one of these:

- The objective or success condition.
- The authorized action or approval boundary.
- The target repository, system, audience, or environment.
- A protected path, sensitive data boundary, or irreversible operation.
- The governing profile.
- The output contract or decision owner.

Before asking, inspect available local context and authoritative documents. When a low-risk assumption permits safe progress, label it, explain its effect, and continue. When an assumption would expand authority or materially change the outcome, stop and request direction.

## Success Criteria

Phase 1 succeeds when:

- The three profiles and their escalation rules are unambiguous.
- Each of the seven OCEPCOE sections has a defined purpose.
- Governed overlays address authority, provenance, state, risk, conflict, completion, and readiness.
- Existing AJ Digital OS standards retain precedence.
- The templates can be used without requiring the original conversation.
- The evaluation checklist detects critical safety and truth failures.
- The package makes no claim of runtime enforcement or ratification.
- Documentation validation passes and only the declared files are changed.

## Scope

### In Scope for Phase 1

- This candidate Git Spec.
- Lite, Standard, and Governed Markdown templates.
- A common evaluation checklist.
- Profile-selection and escalation rules.
- Truth, execution, recursive-improvement, readiness, and precedence guidance.
- A proposed pilot and measurement plan for later approval.

### Out of Scope for Phase 1

- Changing canonical repository policy.
- Changing `AGENTS.md` behavior.
- Implementing a prompt compiler, validator, CLI, schema, hook, MCP server, agent runtime, control-plane registry, or automation.
- Persisting task or approval state.
- Modifying existing workflows or workflow constitutions.
- Approving implementation, staging, commit, push, merge, deploy, migration, release, or activation.
- Running consequential live pilots.
- Declaring OCEPCOE ratified, mandatory, or production-ready.

## Constraints

- Keep the documentation local-first and evidence-bound.
- Preserve the existing OCEPCOE acronym.
- Avoid duplicating canonical policy text when a precise reference is sufficient.
- Never include secrets, tokens, private client data, or credential values in a task contract.
- Do not treat historical context as verified current state without checking it.
- Do not use an evaluation score to override a critical failure or approval gate.
- Prefer the smallest profile that safely captures the work, with required upward escalation inside an OCEPCOE task when triggered.
- Keep templates usable as standalone Markdown.

## Anti-Patterns

- Filling every field with generic prose that does not constrain the task.
- Using Lite for work that requires approval, rollback, or sensitive evidence.
- Treating a requested action as an authorized action.
- Reporting a build, test, or review result as production readiness.
- Listing evidence without connecting it to a claim.
- Hiding assumptions inside Context.
- Writing a Procedure that omits stop conditions and validation.
- Defining Evaluation only as subjective satisfaction.
- Using recursive improvement as permission for unlimited retries or scope expansion.
- Copying secrets into an Evidence table.
- Duplicating a workflow constitution in every task prompt.
- Treating the OCEPCOE document as persisted workflow or control-plane state.

## Phase Roadmap

### Phase 1: Candidate Documentation

Produce this Git Spec, three templates, and the evaluation checklist. Validate structure, scope, links, and repository state. No commit, push, policy change, or runtime behavior is included by default.

### Phase 2: Read-Only Pilots

After separate approval, run a small pilot set across representative low-, medium-, and high-governance tasks. Keep pilots read-only unless a later task receives its own execution approval.

Suggested pilot classes:

- Lite: summarize a bounded local document.
- Standard: review a small uncommitted documentation unit.
- Standard: prepare an implementation-ready task spec without editing code.
- Governed: assess deployment readiness without deploying.
- Governed: prepare a secret-rotation plan without viewing or changing secret values.

### Phase 3: Measurement and Refinement

Compare profiles and baseline prompts using:

- Missed requirements.
- Unsupported or misclassified claims.
- Clarifying questions required.
- Operator interventions.
- Correction loops.
- Validation completeness.
- Approval-boundary violations.
- Time to acceptable output.
- Total operator and agent effort.

### Phase 4: Ratification Decision

Decide whether to adopt, revise, narrow, or reject OCEPCOE v2. Ratification should name the controlling scope, owners, versioning process, and relationship to canonical policy.

### Phase 5: Tooling Consideration

Only after measured need and explicit approval, consider schemas, linters, prompt generators, agent integrations, hooks, or runtime persistence. Tooling must not be inferred from the existence of these documents.

## Pilot Evaluation Design

Each pilot should record:

- Task class and risk level.
- Profile selected and why.
- Baseline instruction used for comparison.
- Time to produce the task contract.
- Clarifications requested.
- Missed requirements.
- Unsupported claims.
- Corrections and their failed layer.
- Validation evidence supplied.
- Readiness claim accuracy.
- Operator intervention count.
- Evaluator verdict.
- Qualitative burden or friction.

Do not optimize solely for the fewest tokens or fastest first response. The relevant measure is total effort to reach a safe, correct, usable result.

## Validation Plan

Phase 1 validation should verify:

1. Exactly the approved documentation files changed.
2. Every template identifies its appropriate profile and escalation triggers.
3. Internal file references resolve.
4. No template claims authority, ratification, or runtime enforcement.
5. No secret-like values or private data were introduced.
6. Markdown contains no trailing whitespace or malformed required tables.
7. A fresh reader can select a profile, identify authority boundaries, understand readiness, and apply the repair loop.
8. Git reports no staged changes, commits, or pushes from this work.

## Risks and Tradeoffs

| Risk | Tradeoff or mitigation |
| --- | --- |
| Template overhead discourages use | Use proportional profiles and permit precise references to existing contracts. |
| Users select Lite to move faster | Make escalation triggers mandatory and test profile choice during evaluation. |
| OCEPCOE duplicates governance | Define it as task framing and preserve canonical-policy precedence. |
| Structured prompts create false certainty | Require truth classifications, evidence provenance, unknowns, and limitations. |
| Evaluation becomes box-checking | Treat critical failures as gates and require claim-linked evidence. |
| Readiness terms are overclaimed | Define scoped classifications and keep approval separate. |
| Templates become stale | Ratify an owner and review cadence only after pilots demonstrate value. |
| Future tooling overreaches | Keep runtime implementation outside Phase 1 and behind a separate spec and approval. |

## Open Questions for Ratification

- Should OCEPCOE remain an optional method or become required for defined task classes?
- Which documents, systems, or teams would own the ratified standard?
- What pilot sample size is sufficient for adoption?
- Which metrics should become hard acceptance thresholds?
- Should a machine-readable companion schema be created after pilots?
- How should OCEPCOE versions be referenced in workflow constitutions and handoffs?
- What review cadence should apply after ratification?

These questions do not block Phase 1 documentation. They must be resolved before any claim of repo-wide mandate or runtime enforcement.

## Rollback and Reversibility

Phase 1 is documentation-only and reversible by removing or revising this isolated documentation package before ratification. No runtime, policy, external system, or persisted workflow state depends on it.

If pilots show that the framework adds more burden than value, retain the evidence, mark the candidate rejected or superseded, and avoid integrating it into canonical policy or tooling.

## Approval Matrix

| Action | Phase 1 status | Required next decision |
| --- | --- | --- |
| Draft and locally validate the five documents | Authorized for this phase | None beyond current task scope |
| Stage or commit | Not authorized in this phase | Separate explicit operator approval |
| Push or open a pull request | Not authorized in this phase | Separate explicit operator approval |
| Ratify as canonical policy | Not authorized | Owner review and explicit ratification |
| Run read-only pilots | Proposed only | Separate pilot approval and task list |
| Run mutating or external pilots | Not authorized | Task-specific governed approval |
| Build tooling or runtime enforcement | Not authorized | New approved spec and implementation gate |

## Definition of Ready for Phase 2

The package is ready to propose for read-only pilots when:

- Phase 1 success criteria pass.
- A human reviewer accepts the profile rules and authority boundary.
- The pilot tasks, evaluators, baseline method, and measures are named.
- Each pilot has its own bounded task contract.
- No pilot requires an unapproved mutation or external action.
- Known limitations and open ratification questions remain visible.

This status would mean `pilot-review-ready`, not ratified, implemented, merge-ready, deploy-ready, or activation-ready.

## Phase 1 Artifacts

- [OCEPCOE Lite Template](./OCEPCOE_LITE_TEMPLATE.md)
- [OCEPCOE Standard Template](./OCEPCOE_STANDARD_TEMPLATE.md)
- [OCEPCOE Governed Template](./OCEPCOE_GOVERNED_TEMPLATE.md)
- [OCEPCOE Evaluation Checklist](./OCEPCOE_EVALUATION_CHECKLIST.md)
