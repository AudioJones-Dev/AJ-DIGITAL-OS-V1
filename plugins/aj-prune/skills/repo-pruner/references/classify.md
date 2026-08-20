# Deterministic classification contract

The P3 classifier implements these rules as a pure normalized-record pipeline.
An agent never assigns confidence, chooses a canonical owner, or rewrites
normalized output.

## Precedence

Apply in this order and stop when a terminal rule wins:

1. Normalize repository-relative paths and prove containment.
2. Apply secret, generated-output, and protected-path exclusions.
3. Resolve registry protection and component ambiguity.
4. Assign every location one class: `code`, `test`, `doc`, `prompt`, `config`,
   or `generated`.
5. If any location is protected, excluded, or outside `code|test`, classify the
   entire finding `excluded`. When a non-code location is the only exclusion
   reason, record `non-code-location-exclusion` so every emitted finding names
   at least one deterministic rule.
6. Apply never-touch domain rules. These produce `needs-decision` and set
   `public_api_touched: true` unless exclusion already won.
7. Validate `@pruner-ignore`. Bind it to the next parsed declaration or statement;
   it applies only when every duplicated range overlaps its annotated
   declaration. A substantive reason produces `intentional`; a missing,
   placeholder, unsupported, or unbound annotation produces
   `invalid-annotation`.
8. Any duplication produces `needs-decision`.
9. Dynamic import, configured entry-point, plugin, route-convention, or string
   reference signals downgrade dead-code evidence to
   `probable-false-positive`.
10. Compute the full-graph blast radius. Dependents above the configured
    threshold produce `needs-decision`.
11. Apply deterministic confidence and emission threshold.
12. Only a dead-code or unused-dependency record with zero dependents, no
    dynamic/config/public signal, valid governance, and unprotected code may
    become `actionable`.
13. Cycles, complexity, oversized modules, tests, and unresolved cases produce
    `needs-decision`.

## Confidence inputs

Define confidence as a pure function over normalized evidence flags. The P3
table is:

| Evidence | Confidence |
|---|---:|
| Duplication | 0.94 |
| Duplication with valid reasoned annotation | 0.88 |
| Dead code, one static signal | 0.90 |
| Dead code corroborated by Madge orphan evidence | 0.93 |
| Dead code with dynamic/configured-use ambiguity | 0.64 |
| Unused dependency | 0.91 |
| Cycle | 0.97 |
| Complexity | 0.90 |
| Oversized | 1.00 |
| Invalid annotation | 1.00 |

The implementation must not accept a free-form agent score. Required
behaviors:

- identical normalized evidence always returns identical confidence;
- corroborated static signals may raise confidence;
- dynamic/config/framework ambiguity lowers confidence;
- confidence never overrides protection, never-touch, duplication, or blast
  radius rules;
- records below `min_confidence_to_emit` are dropped and counted.

## DMAIC recommendations

| Classification | Deterministic condition | Recommendation |
|---|---|---|
| `actionable` | proven dead code or unused dependency under rule 12 | `Delete Candidate` only; no deletion authority |
| `actionable` | explicit supersession metadata names a registered canonical component | `Deprecated`; migration remains external |
| `needs-decision` | duplication, cycle, complexity, oversized, test, ambiguity | `Needs Refactor` |
| `needs-decision` | named missing dependency or owner blocker | `Blocked` |
| `intentional` | valid reasoned annotation | current status |
| `probable-false-positive` | downgrade signal | current status |
| `excluded` | protected or non-code location | current status or `null` |

Never nominate a canonical implementation from heuristics. Analyze owns that
judgment.

## Component emission

Resolve `git diff --name-only --diff-filter=ACMR <base_ref>...HEAD` before
detectors run. Analyze the complete repository graph, then filter normalized
records by changed primary location. Retain every unchanged context location
on an emitted record. Classifier-generated annotation findings obey the same
changed-surface filter.
