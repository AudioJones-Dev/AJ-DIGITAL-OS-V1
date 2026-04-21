# Applied Intelligence System (AIS) v1

## Purpose

AIS is an internal, extractable reasoning subsystem for AJ Digital OS. In v1, it provides deterministic, schema-first reasoning to classify operational problems, generate interventions, and track prediction-error/token efficiency without external model dependencies.

## Module Map (Current In-Repo Placement)

`src/intelligence-layer/`

- `shared-types/`
  - Stable contracts for requests, responses, structural abstractions, archetype classification, prediction error, token telemetry, and compact case memory.
- `archetype-library/`
  - Archetype dataset and deterministic routing score heuristics.
- `prediction-error/`
  - Metric-level and aggregate prediction error calculations plus convergence notes.
- `token-governance/`
  - Token usage recording, budget checks, and error-reduction-per-1k-token utility.
- `ais-core/`
  - Structural reduction, archetype classification orchestration, intervention planning, case compression, and outcome update flow.

## Stable Interfaces for Future Extraction

To maximize extraction-readiness, treat these as stable public interfaces:

1. `shared-types/index.ts` exported domain contracts.
2. `archetype-library/index.ts` exports for `archetypeLibrary`, `scoreArchetypes()`, and `getArchetypeById()`.
3. `prediction-error/index.ts` export `computePredictionError()`.
4. `token-governance/index.ts` exports for recording/summarizing/budgeting usage.
5. `ais-core/index.ts` exports for `diagnoseSystem()`, `updateOutcome()`, `classifyArchetype()`, and `compressCase()`.

These can be moved to standalone packages with minimal API breakage if import paths are remapped.

## Request / Response Contracts

### Diagnose System
- Contract: `DiagnoseSystemRequest` -> `DiagnoseSystemResponse`
- Entrypoint: `diagnoseSystem(input)`
- Includes:
  - structural abstraction output
  - archetype classification
  - intervention plan
  - prediction model
  - validation shape
  - compact case object
  - token telemetry

### Update Outcome
- Contract: `UpdateOutcomeRequest` -> `UpdateOutcomeResponse`
- Entrypoint: `updateOutcome(input)`
- Includes:
  - prediction error by metric
  - aggregate error and delta
  - lightweight lessons
  - reuse eligibility

Sample payloads:
- `docs/examples/ais/diagnose-system.request.json`
- `docs/examples/ais/update-outcome.request.yaml`

## Archetype List (v1)

- bottleneck_constraint
- transformation_failure
- signal_degradation
- feedback_delay
- incentive_misalignment
- capacity_mismatch
- coordination_breakdown
- compounding_decay

Routing is deterministic and scores keyword/signature overlap in the structural abstraction.

## Reasoning Flow (v1)

1. Intake request normalization.
2. Rule-based structural reduction to nodes, relations, constraints, feedback loops, uncertainty points.
3. Archetype scoring and primary/secondary selection.
4. Deterministic intervention plan generation from archetype defaults.
5. Mock prediction model assignment.
6. Compact case compression for reusable memory object.
7. Token telemetry creation + budget-policy check.
8. Outcome update compares predicted/actual values with aggregate error and convergence notes.

## Token Efficiency Logic

- Each stage records prompt/completion tokens and total tokens.
- Case summaries aggregate totals by stage and by agent.
- Budget policy enforces hard limits and soft-threshold warnings.
- Efficiency metric:

`(error_before - error_after) / total_tokens * 1000`

## Test Coverage (v1)

Fixture-driven tests cover:
- archetype routing for 3 diagnostic cases
- prediction error math and error delta
- compact case object compression
- token efficiency calculation
- validation result shape from `diagnoseSystem()`

Fixtures:
- `tests/fixtures/ais/signal-degradation.json`
- `tests/fixtures/ais/transformation-failure.json`
- `tests/fixtures/ais/bottleneck.json`

## Known Limitations / Deferred Work

- Analogical reasoning and deeper causal validation engines are intentionally deferred.
- Prediction model is deterministic placeholder logic, not learned.
- API route wiring (`POST /diagnose-system`, `POST /update-outcome`) is deferred; internal handlers already match contracts.

## Recommended Next Milestone

Add dedicated `analogical-engine` and `validation-engine` modules with deterministic transfer checks first, then wire optional API handlers that call `diagnoseSystem()` / `updateOutcome()` without changing shared contracts.
