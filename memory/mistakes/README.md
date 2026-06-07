# Mistake Memory

## Purpose

Stores recurring errors, failed assumptions, and corrective patterns so agents do not repeat known operational mistakes.

## What Belongs Here

- Mistake summaries
- Trigger symptoms
- Root causes
- Corrective actions
- Validation steps that proved the fix

## What Does Not Belong Here

- Blame-oriented notes
- Unverified speculation
- One-off runtime failures with no reusable lesson
- Secrets or client-private details unless redacted and tenant-scoped

## Write Access

Human operators and agents may write mistake records after the failure pattern is understood and sourced.

## Agent Read Access

Agents may read mistake memory through the Memory Router when the symptom, repo, subsystem, or task type matches.

## Promotion Path

Repeated mistake fixes become SOPs in `memory/sops/`. Policy-level prevention rules become decision records in `memory/decisions/`.
