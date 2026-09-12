---
name: prune-verify
description: Independently verify an applied pruning batch with residual-reference checks, lint, types, tests, build, diff review, and rollback assessment. Use after prune-apply or before merge.
---

# Trigger

Use after a pruning batch has been applied or when reviewing a pruning diff before merge.

# Inputs

- Applied batch ID, commit, branch, or diff from `$ARGUMENTS`.
- Approved `prune-plan` scope.
- Applicable `AGENTS.md` validation requirements.
- Current repository status and diff.

# Procedure

1. Compare the actual diff against the approved batch scope.
2. Search for residual imports, exports, calls, registrations, config references, tests, docs, and dynamic entry points related to deleted items.
3. Run the repository's required lint, typecheck, targeted tests, full tests, and build commands where available and policy requires them.
4. Verify dependency manifests and lockfiles are internally consistent if the approved batch changed dependencies.
5. Check public exports, docs, schemas, generated declarations, or integration manifests affected by the deletion.
6. Identify unrelated failures separately from pruning-caused failures.
7. Determine whether the batch is merge-ready, requires repair, or should be rolled back.

# Safety gates

- Read/test/report only by default. Do not repair or expand the diff during verification.
- Do not excuse failed validation because the deleted code looked unused.
- Do not claim production safety from local checks alone.
- If a repair is required, return to planning/apply with a newly approved scope.

# Output contract

Return:

- Batch/diff verified.
- Scope match: PASS / FAIL.
- Residual-reference checks and results.
- Validation commands and exact results.
- Failed/skipped checks and why.
- Unexpected behavior or risk findings.
- Verdict: MERGE-READY / REPAIR REQUIRED / ROLLBACK RECOMMENDED / INSUFFICIENT EVIDENCE.
- Rollback path.

Do not make edits unless a separate approved task authorizes them.
