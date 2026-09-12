# AJ Digital OS Claude Instructions

## Canonical policy

Follow root `AGENTS.md` as the canonical repository safety, governance, approval, documentation, and code-pruning policy.

Before implementation work, also read the canonical policy documents and the nearest path-scoped `AGENTS.md` files identified by the root instructions.

## Working mode

For cleanup and pruning tasks:

- Diagnose before editing.
- Use the specialist pruning skills rather than a one-shot cleanup prompt.
- Inventory before judging reachability.
- Treat routes, webhooks, jobs, queues, callbacks, feature flags, dynamic imports, registries, public exports, configuration, and tenant-specific behavior as indirect entry points.
- Use tests and coverage as evidence, not as proof that unexecuted code is dead.
- Present a ranked deletion plan before any deletion.
- Make narrow, atomic changes.
- Do not mix refactors or feature work into pruning.
- Run repository verification after edits.

## Pruning skill sequence

Use these project skills in order when applicable:

1. `/prune-inventory`
2. `/prune-reachability`
3. `/prune-coverage`
4. `/prune-plan`
5. `/prune-apply` — manual invocation only after explicit batch approval
6. `/prune-verify`

`/prune-apply` must never be inferred from a general cleanup request. The operator must explicitly identify the approved batch.

## Output discipline

Every pruning response must preserve the output contract in `AGENTS.md`: confidence, evidence, dynamic checks, files changed, validation, remaining risk, and rollback.
