---
name: prune-plan
description: Convert verified pruning candidates into small, safe, independently reversible deletion batches. Use only after reachability and coverage/runtime review.
---

# Trigger

Use after candidates have completed reachability and evidence review and are ready for deletion planning.

# Inputs

- Verified candidate list or report from `$ARGUMENTS`.
- Prior `prune-reachability` and `prune-coverage` decisions.
- Applicable repository validation commands and protected-surface policy.

# Procedure

1. Include only candidates currently marked `SAFE TO PLAN` with HIGH confidence.
2. Group candidates into coherent batches with one purpose each.
3. Separate source deletion, dependency removal, feature-flag retirement, public API deprecation, migration work, and behavior changes into distinct batches.
4. Exclude any candidate requiring owner confirmation or with contradictory evidence.
5. Rank batches by safety, reversibility, dependency order, and blast radius.
6. Define exact files/symbols, expected behavioral impact, validation, monitoring, and rollback for each batch.
7. Produce a diff outline without editing files.

# Safety gates

- Plan only. Do not modify files.
- Do not include MEDIUM or LOW confidence candidates.
- Do not combine unrelated cleanup or feature work.
- Public contracts, migrations, auth, billing, deployment, webhooks, tenant boundaries, and external integrations require separate explicit approval even if a future plan includes them.

# Output contract

For each batch provide:

1. Batch ID/title.
2. Exact files and symbols proposed for removal.
3. Evidence supporting safety.
4. Expected behavior impact.
5. Risk level and blast radius.
6. Validation commands.
7. Post-deployment monitoring signals where applicable.
8. Rollback procedure.
9. Diff outline.
10. Dependencies or required merge order.

End with the exact approval request:

```text
Awaiting explicit approval to apply <Batch ID>.
Reply exactly: proceed <Batch ID>
```

Approval phrased any other way (for example "approve <Batch ID>" or "looks good") is not authorization; `prune-apply` must refuse it.

Do not make edits.
