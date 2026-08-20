# Portfolio Sprint -1 evidence emitter

Write `.pruner/sprint-minus-1-inventory.md`; never edit
`.dmaic/components.yaml` or write another `.dmaic/**` artifact.

Portfolio mode requires a valid registry and emits one row per registered
component with all ten fields:

1. Component.
2. Current state.
3. Intended state.
4. Gap analysis.
5. Risk level.
6. Broken dependencies.
7. Duplicate logic.
8. Required tests.
9. Stabilization actions.
10. Decision.

Copy `current_status` from the registry. Compute only deterministic evidence
and `recommended_status`. When static evidence cannot support intended state,
test requirements, canonical ownership, stabilization action, or decision,
emit `Unresolved — DMAIC Analyze input required` with provenance rather than
inventing a judgment.

The document must include:

```text
Inventory gate: INCOMPLETE — review and governance update required.
```

Never mark Sprint -1 passed, open a charter, choose a canonical owner, mutate a
status, or begin remediation. Promotion into governed DMAIC documentation is a
separate approved action.
