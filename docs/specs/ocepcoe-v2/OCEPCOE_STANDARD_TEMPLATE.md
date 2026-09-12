# O-C-E-P-C-O-E Standard Template

## Template Control

| Field | Entry |
| --- | --- |
| Status | Candidate template |
| OCEPCOE version | 2.0 Phase 1 draft |
| Task | `<task name>` |
| Requesting operator or role | `<name or role>` |
| Decision owner | `<name or role>` |
| Date | `<YYYY-MM-DD>` |
| Profile decision | `Standard because <reason>` |
| Current gate | `<analysis, planning, implementation, validation, or other>` |
| Authority source | `<operator instruction or applicable non-gated policy basis>` |

## Profile Check

Use Standard for bounded, reversible work with multiple steps, material evidence, scope boundaries, and validation. Upgrade to [Governed](./OCEPCOE_GOVERNED_TEMPLATE.md) before continuing if any of these conditions appears:

- The work is destructive, difficult to reverse, production-impacting, or externally visible.
- It touches secrets, credentials, client data, permissions, money, legal commitments, public communications, deployments, releases, or external integrations.
- It changes repo governance, agent behavior, hooks, CI/CD, MCP or vault access, runtime core, protected paths, or approval enforcement.
- It requires a human approval gate.
- Multiple owners, agents, systems, or handoffs create material coordination risk.
- Decision-critical evidence is materially conflicting or unresolved, too stale for the consequence of the decision, sensitive, or incomplete enough that an assumption could alter the outcome.
- Multiple authorities supply decision-critical evidence and their precedence or interpretation is unresolved.
- The result could be mistaken for merge, release, deployment, legal, commercial, or activation authority.
- Rollback, escalation, or readiness classification is material to safe completion.

These are profile-selection rules for a task that adopts this candidate standard; they do not make the unratified standard binding elsewhere. See the [Governed profile definition](./OCEPCOE_V2_GIT_SPEC.md#governed) for the controlling rationale.

## Objective

### Problem

`<What is wrong, missing, uncertain, or required?>`

### Desired Outcome

`<What observable artifact or state must exist?>`

### Success Criteria

- `<measurable criterion 1>`
- `<measurable criterion 2>`
- `<measurable criterion 3>`

## Context

### Current Verified State

- `<repository, branch, worktree, environment, process, or artifact state>`

### Relevant Architecture and Prior Decisions

- `<precise file, standard, decision, or none>`

### Dependencies and Adjacent Systems

- `<dependency and why it matters>`

### Truth Classification

| Class | Statement | Effect on task |
| --- | --- | --- |
| Known | `<directly evidenced fact>` | `<effect>` |
| Inferred | `<reasoned conclusion>` | `<effect>` |
| Assumed | `<temporary assumption>` | `<effect and how to verify>` |
| Unknown | `<unresolved information>` | `<blocker, limitation, or none>` |

Do not promote an inference, assumption, speculation, or opinion to a fact.

## Evidence

| Evidence | Location or identifier | Provenance | Freshness | Supports | Limitation |
| --- | --- | --- | --- | --- | --- |
| `<artifact>` | `<path, URL, command, or ID>` | `<direct, primary, secondary, operator statement>` | `<date, version, or current observation>` | `<claim>` | `<limitation or none known>` |

Evidence rules:

- Prefer current direct observation and primary sources.
- Connect each decision-critical claim to evidence.
- Report missing or conflicting evidence.
- Never reproduce secrets, credentials, or restricted client data.

## Procedure

1. **Diagnose:** `<inspect current state and applicable instructions>`
2. **Confirm scope:** `<identify files, systems, and excluded actions>`
3. **Execute:** `<perform the authorized bounded work>`
4. **Validate:** `<run exact checks and capture results>`
5. **Evaluate:** `<apply acceptance criteria and critical failures>`
6. **Handoff:** `<report artifacts, evidence, risks, and next decision>`

### Decision Points and Stop Conditions

- If `<condition>`, then `<action or escalation>`.
- Stop if `<missing authority, evidence, capability, or safety condition>`.
- Upgrade to Governed if any governed trigger appears.

## Constraints

### In Scope

- `<specific included work>`

### Out of Scope

- `<specific excluded work>`

### Authorized Mutations

- Authority basis: `<where the permission comes from; this template records but does not grant authority>`
- Mutations: `<none, or exact files/systems authorized by that source>`

### Prohibited Actions

- `<for example: no secrets, external writes, stage, commit, push, merge, deploy, or activation>`

### Operational Boundaries

- Time or budget: `<limit or none>`
- Tools or dependencies: `<limit or approved set>`
- Security or privacy: `<requirement>`
- Required human action: `<action or none>`

## Output Contract

Return these items in this order:

1. Outcome and current status.
2. Artifact paths or response content.
3. Facts, inferences, assumptions, and unknowns material to the decision.
4. Validation commands or checks and exact results.
5. Commands intentionally not run and why.
6. Changed scope and confirmed untouched scope.
7. Remaining risks, blockers, and limitations.
8. Required next operator decision.

Required format: `<Markdown, table, Git Spec, review findings, patch, or other>`

Required detail level: `<concise, operational, comprehensive, or bounded length>`

## Evaluation

### Acceptance Criteria

- [ ] The Objective and Success Criteria are satisfied.
- [ ] Material claims are evidence-bound and correctly classified.
- [ ] Scope and constraints were respected.
- [ ] Required validation ran and results are reported honestly.
- [ ] The Output Contract is complete.
- [ ] No later approval gate is represented as complete or authorized.

### Critical Failures

- Unauthorized or out-of-scope action.
- Invented, concealed, or materially misclassified evidence.
- Secret, credential, or restricted-data exposure.
- False validation or readiness claim.
- Missing required limitation, blocker, or operator decision.

### Verdict

Use one: `PASS`, `PASS_WITH_LIMITATIONS`, `REVISE`, or `BLOCKED`.

Passing evaluation confirms conformity to this task contract only. It does not authorize commit, push, merge, deploy, migration, release, or activation.

## Recursive Improvement

When evaluation fails:

1. Name the failed OCEPCOE section.
2. Repair the smallest responsible layer.
3. Re-run affected validation.
4. Re-check for consequential side effects.
5. Stop and report `BLOCKED` when authority or evidence is insufficient.

## Final Handoff

- Result: `<complete, complete with limitations, revise, or blocked>`
- Evidence: `<key locations or command results>`
- Validation: `<passed, failed, partial, or not run>`
- Remaining risk: `<risk or none known>`
- Next gate: `<named gate>`
- Decision owner: `<name or role>`
