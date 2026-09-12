# O-C-E-P-C-O-E Evaluation Checklist

## Purpose

Use this checklist to evaluate an OCEPCOE task contract or the result produced from it. It supports comparison and repair; it does not grant approval for implementation, commit, push, merge, deployment, release, or activation.

## Evaluation Record

| Field | Entry |
| --- | --- |
| OCEPCOE version | `2.0 Phase 1 draft` |
| Task | `<task name>` |
| Profile | `<Lite, Standard, or Governed>` |
| Contract location | `<path, URL, or response>` |
| Result location | `<path, URL, or response>` |
| Evaluator | `<name or role>` |
| Evaluation date | `<YYYY-MM-DD>` |
| Evaluation record ID | `<stable local or workflow identifier>` |
| Current gate | `<gate>` |

## Scoring Method

For each quality item, use:

- `2` — Complete, specific, and evidenced.
- `1` — Partially complete or limited, but usable with disclosed risk.
- `0` — Missing, contradictory, unsupported, or unusable.
- `N/A` — Demonstrably not applicable to the selected profile and task.

The numeric score supports diagnosis only. No score can override a critical failure, higher-authority instruction, or approval gate.

Map scores to verdicts consistently:

- `PASS` requires every applicable item to score `2` and the critical gate to be `CLEAR`.
- `PASS_WITH_LIMITATIONS` permits one or more scores of `1` only when the result remains safe and usable for the stated Objective, every limitation is explicit, no applicable item scores `0`, and the critical gate is `CLEAR`.
- `REVISE` applies when any applicable item scores `0`, or when a score of `1` materially defeats the Objective or Output Contract, unless the cause is a blocker.
- `BLOCKED` applies when missing authority, evidence, capability, ownership, dependency, or safety prevents responsible repair or continuation.
- Every `N/A` must include a reason tied to the selected profile and task.

An evaluator may apply a stricter governing standard but must not relax these mappings.

## Profile Selection Gate

- [ ] The selected profile matches task complexity, reversibility, evidence, and risk.
- [ ] Lite is used only for a small, low-risk, readily reversible task.
- [ ] Standard is not used when a Governed trigger is present.
- [ ] Consequential segments are isolated under Governed or the whole task is Governed.
- [ ] The profile was not downgraded to avoid evidence, approval, rollback, or reporting requirements.

Profile verdict: `<PASS, REVISE, or BLOCKED>`

Reason: `<evidence-bound explanation>`

## Critical Failure Gate

Mark `YES` if present. Any `YES` prevents `PASS` and `PASS_WITH_LIMITATIONS`.

| Critical failure | YES/NO | Evidence |
| --- | --- | --- |
| Unauthorized, out-of-scope, or approval-bypassing action | `<YES/NO>` | `<evidence>` |
| Invented, concealed, or materially misclassified evidence | `<YES/NO>` | `<evidence>` |
| Stale evidence represented as verified current state | `<YES/NO>` | `<evidence>` |
| Secret, credential, private client data, or protected-information exposure | `<YES/NO>` | `<evidence>` |
| Destructive or difficult-to-reverse action without required authority and recovery boundary | `<YES/NO>` | `<evidence>` |
| Unresolved high-impact safety, legal, financial, permission, production, or external-system risk | `<YES/NO>` | `<evidence>` |
| False validation, completion, readiness, or activation claim | `<YES/NO>` | `<evidence>` |
| Material conflict, side effect, limitation, or blocker concealed | `<YES/NO>` | `<evidence>` |

Critical gate verdict: `<CLEAR or FAILED>`

Critical-failure disposition:

- A `YES` records that the failure occurred in this evaluated run. This evaluation record remains `FAILED` and must not be rewritten as passing.
- First contain, roll back, or remediate the failure when authorized and safe to do so.
- After verified remediation, create a new evaluation record that references the failed record and supplies remediation and verification evidence.
- In the new record, the verification owner may mark the current condition `CLEARED`; the historical failure remains part of the audit trail.
- If impact is unresolved, remediation is unverified, or safe recovery requires new authority, the new verdict remains `BLOCKED`.

## Section Evaluation

### Objective

| Check | Score | Evidence or note |
| --- | --- | --- |
| States an observable outcome rather than a vague activity | `<0/1/2/N/A>` | `<note>` |
| Identifies the problem and intended beneficiary or system | `<0/1/2/N/A>` | `<note>` |
| Includes measurable success conditions | `<0/1/2/N/A>` | `<note>` |
| Distinguishes the current phase from later gates | `<0/1/2/N/A>` | `<note>` |

Objective subtotal: `<score>/<applicable maximum>`

### Context

| Check | Score | Evidence or note |
| --- | --- | --- |
| Records current verified state | `<0/1/2/N/A>` | `<note>` |
| Includes only material background and prior decisions | `<0/1/2/N/A>` | `<note>` |
| Identifies dependencies, owners, and adjacent systems when relevant | `<0/1/2/N/A>` | `<note>` |
| Separates current state from historical or intended future state | `<0/1/2/N/A>` | `<note>` |

Context subtotal: `<score>/<applicable maximum>`

### Evidence

| Check | Score | Evidence or note |
| --- | --- | --- |
| Connects decision-critical claims to evidence | `<0/1/2/N/A>` | `<note>` |
| Identifies source, provenance, freshness, and limitations proportionally | `<0/1/2/N/A>` | `<note>` |
| Prefers current direct observation and primary sources where practical | `<0/1/2/N/A>` | `<note>` |
| Reports missing or conflicting evidence | `<0/1/2/N/A>` | `<note>` |
| Protects secret, credential, client, and restricted values | `<0/1/2/N/A>` | `<note>` |

Evidence subtotal: `<score>/<applicable maximum>`

### Procedure

| Check | Score | Evidence or note |
| --- | --- | --- |
| Provides an executable sequence | `<0/1/2/N/A>` | `<note>` |
| Includes diagnosis, scope confirmation, validation, and handoff | `<0/1/2/N/A>` | `<note>` |
| Defines decision points and stop conditions | `<0/1/2/N/A>` | `<note>` |
| Separates consequential phases and approval gates | `<0/1/2/N/A>` | `<note>` |
| Defines retry, repair, and escalation proportionally | `<0/1/2/N/A>` | `<note>` |

Procedure subtotal: `<score>/<applicable maximum>`

### Constraints

| Check | Score | Evidence or note |
| --- | --- | --- |
| Defines exact in-scope and out-of-scope boundaries | `<0/1/2/N/A>` | `<note>` |
| Identifies authorized and prohibited mutations | `<0/1/2/N/A>` | `<note>` |
| Protects sensitive files, systems, data, and external state | `<0/1/2/N/A>` | `<note>` |
| States required human approvals | `<0/1/2/N/A>` | `<note>` |
| Makes limits testable rather than aspirational | `<0/1/2/N/A>` | `<note>` |

Constraints subtotal: `<score>/<applicable maximum>`

### Output Contract

| Check | Score | Evidence or note |
| --- | --- | --- |
| Specifies the exact artifact, format, and location | `<0/1/2/N/A>` | `<note>` |
| Requires validation results and supporting evidence | `<0/1/2/N/A>` | `<note>` |
| Requires changed and untouched scope where mutations occur | `<0/1/2/N/A>` | `<note>` |
| Requires risks, blockers, limitations, and next decision | `<0/1/2/N/A>` | `<note>` |
| Enables continuation without the original conversation | `<0/1/2/N/A>` | `<note>` |

Output Contract subtotal: `<score>/<applicable maximum>`

### Evaluation

| Check | Score | Evidence or note |
| --- | --- | --- |
| Defines objective acceptance criteria | `<0/1/2/N/A>` | `<note>` |
| Defines critical failures | `<0/1/2/N/A>` | `<note>` |
| Names the evaluator or decision owner where required | `<0/1/2/N/A>` | `<note>` |
| Defines allowed verdicts and repair behavior | `<0/1/2/N/A>` | `<note>` |
| Keeps evaluation separate from approval | `<0/1/2/N/A>` | `<note>` |

Evaluation subtotal: `<score>/<applicable maximum>`

## Cross-Cutting Evaluation

### Truth Seeking

- [ ] Facts are directly supported by current evidence.
- [ ] Inferences include explainable reasoning.
- [ ] Assumptions are labeled and have a verification or limitation statement.
- [ ] Unknowns and conflicting evidence are visible.
- [ ] Speculation and opinion are not represented as fact.

Score: `<0/1/2>`

### Execution

- [ ] The executor performed the authorized task rather than merely restating it.
- [ ] Analysis-only authority did not become mutation authority.
- [ ] Work stopped or escalated when evidence or authority became insufficient.
- [ ] The result reports actions performed and consequential actions not performed.

Score: `<0/1/2>`

### Recursive Improvement

- [ ] A failed result identifies the responsible section or overlay.
- [ ] Repair targets the smallest responsible layer.
- [ ] Affected validation is re-run.
- [ ] Consequential side effects are re-evaluated.
- [ ] Retry does not expand scope or bypass approval.

Score: `<0/1/2/N/A>`

## Governed Overlay Evaluation

Complete for Governed tasks. For Lite or Standard, mark `N/A` only after confirming no Governed trigger applies.

| Overlay | Required check | Score | Evidence or note |
| --- | --- | --- | --- |
| Authority | Exact action, owner, approval evidence, scope, expiration, current gate, and next gate are explicit | `<0/1/2/N/A>` | `<note>` |
| Evidence provenance | Decision-critical evidence has source, acquisition method, version or timestamp, authority, claim, and limitation | `<0/1/2/N/A>` | `<note>` |
| Execution state and ownership | Completed, active, blocked, unstarted, owner, verifier, and next transition are clear | `<0/1/2/N/A>` | `<note>` |
| Risk and rollback | Likelihood, impact, trigger, mitigation, reversibility, recovery, and residual risk are stated | `<0/1/2/N/A>` | `<note>` |
| Conflict resolution | Material conflicts use the precedence model and unresolved effects are visible | `<0/1/2/N/A>` | `<note>` |
| Definition of Done | Completion is observable and covers validation, disclosure, ownership, and next gate | `<0/1/2/N/A>` | `<note>` |
| Readiness classification | Readiness is scoped, evidenced, limited, owner-bound, and separate from approval | `<0/1/2/N/A>` | `<note>` |

Governed overlays subtotal: `<score>/<applicable maximum>`

## Original Lens Questions

Use these ten questions as a final coherence check:

1. Is the Objective exact and outcome-based?
2. Does the Context include the material current state without burying the task?
3. Does Evidence support the claims and expose its limitations?
4. Is the Procedure executable, ordered, and bounded by stop conditions?
5. Are Constraints explicit, testable, and authority-aware?
6. Does the Output Contract define a usable artifact and handoff?
7. Does Evaluation distinguish conformity from approval?
8. Are facts, inferences, assumptions, unknowns, speculation, and opinions separated?
9. Did execution complete the authorized work rather than merely rewrite the prompt?
10. Can a failed result be repaired at the smallest responsible layer and revalidated?

## Readiness Claim Audit

If any readiness term is used, complete this section:

- Artifact or system: `<item>`
- Classification: `<draft-ready, review-ready, implementation-ready, validation-ready, merge-ready, deploy-ready, activation-ready, or blocked>`
- Scope: `<exact boundary>`
- Evidence: `<evidence>`
- Limitations: `<limitations>`
- Decision owner: `<role>`
- Later gates not authorized: `<list>`

- [ ] The readiness evidence matches the classification.
- [ ] Local validation is not presented as remote, production, legal, commercial, or operational proof.
- [ ] One readiness classification is not used to imply another.
- [ ] A readiness claim is not used as an approval record.

## Failed-Layer Repair Map

| Symptom | Likely failed layer | First repair |
| --- | --- | --- |
| Correct work delivered for the wrong outcome | Objective | Rewrite the observable end condition and success criteria. |
| Executor lacks essential system understanding | Context | Add only the missing current state, architecture, or dependency. |
| Claim is unsupported or disputed | Evidence | Add, refresh, qualify, or downgrade the claim. |
| Work is incomplete or out of order | Procedure | Add the missing action, decision point, or validation step. |
| Action crosses a boundary | Constraints or Authority | Restore the boundary, roll back if authorized, and escalate. |
| Result cannot be reviewed or continued | Output Contract | Add artifact, evidence, validation, limitation, and handoff requirements. |
| Review is subjective or passes unsafe work | Evaluation | Add measurable criteria and critical failures. |
| Owner or next state is unclear | Execution State and Ownership | Name the current owner, verifier, blocker, and next transition. |
| Failure has no safe recovery | Risk and Rollback | Define recovery or stop and raise the approval level. |
| `Ready` is overstated | Readiness Classification | Narrow the classification, scope, evidence, and limitations. |

## Final Verdict

Allowed verdicts:

- `PASS` — All applicable acceptance criteria pass and no critical failure exists.
- `PASS_WITH_LIMITATIONS` — The result is usable within explicitly stated limitations; no critical failure exists.
- `REVISE` — A repairable contract or output deficiency prevents acceptance.
- `BLOCKED` — Authority, evidence, capability, ownership, dependency, or safety prevents responsible progress.

Apply the deterministic score mapping in `Scoring Method`. A remediated critical failure requires a new evaluation record; it cannot convert the original failed record into a passing one.

Verdict: `<PASS, PASS_WITH_LIMITATIONS, REVISE, or BLOCKED>`

Total quality score: `<score>/<applicable maximum>`

Critical gate: `<CLEAR or FAILED>`

Failed sections or overlays: `<list or none>`

Required repair: `<smallest responsible change or none>`

Validation to re-run: `<checks or none>`

Remaining limitations: `<list or none known>`

Next decision and owner: `<decision; role>`

Approval boundary reminder: `<state which later actions remain unauthorized>`
