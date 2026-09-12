---
name: prune-apply
description: Apply exactly one explicitly approved code-pruning batch, make only directly necessary cleanup, run required verification, and report rollback. Manual invocation only.
---

# Trigger

Use only when the operator explicitly invokes this skill and identifies an approved batch from a current `prune-plan` output.

# Inputs

- Approved batch ID from `$ARGUMENTS`.
- Current `prune-plan` output.
- Root/path-scoped `AGENTS.md` policy.
- Current Git status and diff.

# Preconditions

Proceed only when all are true:

1. The batch exists in the current pruning plan.
2. The operator approved that exact batch with the literal token `proceed <Batch ID>`, the operator approval word defined in root `AGENTS.md`. Approval phrased any other way is not authorization.
3. The working tree state is understood.
4. Unrelated changes can be preserved without interference.

If any precondition fails, stop without editing.

# Procedure

1. Re-read applicable `AGENTS.md` instructions and the approved batch.
2. Inspect Git status and identify unrelated changes.
3. Restate the exact approved scope before editing.
4. Make only the approved deletions and directly necessary reference cleanup.
5. Do not refactor surrounding code or change behavior beyond the approved scope.
6. Run repository-required type checks, lint, tests, and build commands where available and applicable.
7. Search for residual references introduced by the deletion.
8. Review the final diff for scope creep and accidental behavior changes.

# Safety gates

- Never act on an unnumbered or ambiguous approval, or on any approval that omits the literal `proceed` token.
- Never expand the batch to fix unrelated failures.
- Do not touch protected paths or gated behavior outside the approved plan.
- Do not merge, rebase, push, deploy, release, or rewrite history.
- If validation exposes a new architectural or dynamic-reachability risk, stop and report it.

# Output contract

Return:

- Approved batch applied.
- Exact deleted/edited files and symbols.
- Diff summary.
- Verification commands and exact results.
- Failed or skipped checks and why.
- Remaining risks.
- Rollback path using a non-history-rewriting Git operation.
- Recommendation to run `prune-verify` independently before merge.
