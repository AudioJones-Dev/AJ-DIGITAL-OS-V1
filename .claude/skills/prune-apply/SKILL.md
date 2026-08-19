---
name: prune-apply
description: Apply exactly one explicitly approved code-pruning batch, make only directly necessary cleanup, run required verification, and report rollback. Manual invocation only.
argument-hint: "[approved-batch-id]"
disable-model-invocation: true
---

# Trigger

Use only when the operator explicitly invokes `/prune-apply` and identifies an approved batch from the current `prune-plan` output.

# Inputs

- Approved batch ID from `$ARGUMENTS`.
- Current `prune-plan` output.
- Root `AGENTS.md`, `CLAUDE.md`, and path-scoped policy.
- Current Git status and diff.

# Preconditions

Proceed only when all are true:

1. The batch exists in the current pruning plan.
2. The operator explicitly approved that exact batch.
3. The working tree state is understood.
4. Unrelated changes can be preserved without interference.

If any precondition fails, stop without editing.

# Procedure

1. Re-read applicable instructions and the approved batch.
2. Inspect Git status and identify unrelated changes.
3. Restate the exact approved scope before editing.
4. Make only the approved deletions and directly necessary reference cleanup.
5. Do not refactor surrounding code or change behavior beyond the approved scope.
6. Run repository-required type checks, lint, tests, and build commands where available and applicable.
7. Search for residual references introduced by the deletion.
8. Review the final diff for scope creep and accidental behavior changes.

# Safety gates

- Never act on an unnumbered or ambiguous approval.
- Never expand the batch to fix unrelated failures.
- Do not touch protected paths or gated behavior outside the approved plan.
- Do not merge, rebase, push, deploy, release, or rewrite history.
- If validation exposes a new architectural or dynamic-reachability risk, stop and report it.

# Output contract

Return approved batch, exact deleted/edited files and symbols, diff summary, verification commands/results, failed or skipped checks, remaining risk, rollback path, and a recommendation to run `/prune-verify` independently before merge.
