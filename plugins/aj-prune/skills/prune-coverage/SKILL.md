---
name: prune-coverage
description: Correlate pruning candidates with tests, coverage, runtime evidence, telemetry artifacts, documentation, configuration, and Git history without treating non-execution as proof of dead code. Use after reachability review.
argument-hint: "[candidate-list-or-report]"
---

# Trigger

Use after `prune-reachability` when candidates need tests, coverage, runtime, documentation, configuration, or history evidence before deletion planning.

# Inputs

- Candidate paths/symbols or reachability report from `$ARGUMENTS`.
- Existing test and coverage configuration.
- Existing coverage reports or runtime/telemetry artifacts safe to inspect.
- Docs, configs, feature flags, changelog, Git history, and runbook references.

# Procedure

1. Identify tests that reference or exercise each candidate.
2. Inspect existing coverage reports; run only repository-approved coverage/test commands and do not add tooling.
3. Search runtime artifacts, logs, traces, metrics, or telemetry only when repository policy permits access.
4. Search docs, runbooks, config, feature flags, integration notes, release notes, and migration history for operational intent.
5. Inspect relevant Git history when it clarifies introduction, deprecation, or ownership.
6. Record evidence supporting retention, planning, or uncertainty.
7. Reconcile evidence with reachability findings and downgrade confidence when evidence conflicts.

# Safety gates

- Read/test/report only. Do not edit or delete code.
- Lack of tests, coverage, telemetry, or recent Git activity never proves a candidate is dead.
- Do not inspect secrets, protected client data, or production telemetry outside repository policy.
- Do not install coverage or analysis dependencies without approval.

# Output contract

For each candidate report prior decision, test evidence, coverage evidence, runtime evidence, docs/config evidence, Git-history evidence, contradictions/missing evidence, revised confidence, final decision, and recommended next action.

Use only these decisions: SAFE TO PLAN / NEEDS OWNER CONFIRMATION / RETAIN / INSUFFICIENT EVIDENCE.

End with commands run, skipped evidence sources and why, and an explicit statement that no code modifications were made.
