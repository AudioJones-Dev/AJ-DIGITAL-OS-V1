---
name: prune-coverage
description: Correlate pruning candidates with tests, coverage, runtime evidence, telemetry artifacts, documentation, configuration, and Git history without treating non-execution as proof of dead code. Use after reachability review.
---

# Trigger

Use after `prune-reachability` when candidates need evidence from tests, coverage, runtime behavior, documentation, configuration, or history before planning deletion.

# Inputs

- Candidate paths/symbols or reachability report from `$ARGUMENTS`.
- Existing test and coverage configuration.
- Existing coverage reports or runtime/telemetry artifacts that are safe to inspect.
- Docs, configs, feature flags, changelog, Git history, and incident/runbook references.

# Procedure

1. Identify tests that reference or exercise each candidate.
2. Inspect existing coverage reports where available; run only repository-approved coverage/test commands and do not add tooling.
3. Search runtime artifacts, logs, traces, metrics, or telemetry only when repository policy permits access to them.
4. Search docs, runbooks, config, feature flags, integration notes, release notes, and migration history for operational intent.
5. Inspect relevant Git history when it clarifies introduction, deprecation, or ownership.
6. Record evidence that supports retention, deletion planning, or uncertainty.
7. Reconcile evidence with the reachability decision; downgrade confidence when evidence conflicts.

# Safety gates

- Read/test/report only. Do not edit or delete code.
- Lack of test execution, coverage, telemetry, or recent Git activity never proves a candidate is dead.
- Do not inspect secrets, protected client data, or production telemetry outside repository policy.
- Do not install coverage or analysis dependencies without approval.

# Output contract

For each candidate report:

- Candidate
- Prior reachability decision
- Test evidence
- Coverage evidence
- Runtime/telemetry evidence
- Documentation/config evidence
- Git-history evidence
- Contradictions or missing evidence
- Revised confidence: HIGH / MEDIUM / LOW
- Decision: SAFE TO PLAN / NEEDS OWNER CONFIRMATION / RETAIN / INSUFFICIENT EVIDENCE
- Recommended next action

End with commands run, skipped evidence sources and why, and an explicit statement that no code modifications were made.
