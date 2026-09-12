# O-C-E-P-C-O-E Lite Template

## Template Control

| Field | Entry |
| --- | --- |
| Status | Candidate template |
| OCEPCOE version | 2.0 Phase 1 draft |
| Task | `<short task name>` |
| Owner | `<requesting operator or role>` |
| Date | `<YYYY-MM-DD>` |
| Profile decision | `Lite because <why all Lite conditions are satisfied>` |
| Authority source | `<operator instruction or applicable non-gated policy basis>` |

## Use This Profile Only When

- The task is low risk, small, and readily reversible.
- No approval-gated, destructive, production, external, secret, credential, client-data, financial, legal, permission, governance, or runtime-core action is involved.
- Evidence is simple and unlikely to be disputed.
- Failure has a small blast radius.

If any condition is false or uncertain, use the [Standard](./OCEPCOE_STANDARD_TEMPLATE.md) or [Governed](./OCEPCOE_GOVERNED_TEMPLATE.md) template.

## Objective

`<State the observable outcome, not just the activity.>`

Success means:

- `<measurable completion condition>`

## Essential Context

- Current state: `<verified state that affects the task>`
- Relevant convention or prior decision: `<reference or none>`
- Assumption, if required: `<label it explicitly or none>`

## Evidence Basis

- Source: `<local file, supplied text, command output, or primary source>`
- Supports: `<claim or decision>`
- Limitation: `<freshness, completeness, or none known>`

## Procedure

1. `<inspect or verify>`
2. `<perform the bounded authorized work>`
3. `<check the result>`

Stop and upgrade the profile if the task expands, evidence conflicts, a consequential action appears, or an approval becomes necessary.

## Constraints

- In scope: `<exact boundary>`
- Out of scope: `<exact exclusions>`
- Authority basis: `<where the permission comes from; this template does not grant it>`
- Allowed changes: `<none or exact reversible mutation authorized by that source>`
- Prohibited actions: `<for example: no stage, commit, push, deploy, or external writes>`

## Output Contract

Return:

- `<artifact or answer>`
- `<evidence or file location>`
- `<validation result>`
- `<remaining limitation or state none>`
- `<next operator decision, if any>`

## Evaluation

The task passes when:

- `<acceptance condition 1>`
- `<acceptance condition 2>`
- No scope or authority boundary was crossed.
- Facts, assumptions, and unknowns are not conflated.

Allowed verdicts: `PASS`, `PASS_WITH_LIMITATIONS`, `REVISE`, or `BLOCKED`.

If evaluation fails, repair the smallest responsible section, re-run the affected check, and disclose any remaining limitation.

## Final Completion Check

- [ ] The result matches the Objective.
- [ ] Evidence supports the material claims.
- [ ] The task remained eligible for Lite.
- [ ] The Output Contract is complete.
- [ ] No later gated action is represented as authorized.
