# Component Measure emitter

Write `.pruner/measure.md`; never write or paste directly into `.dmaic/**`.

1. Resolve `base_ref` and the merge base.
2. Capture the committed changed surface with
   `git diff --name-only --diff-filter=ACMR <base_ref>...HEAD`.
3. Run approved detectors against the whole repository graph.
4. Normalize complete graphs and dependent counts.
5. Emit only findings with at least one primary location intersecting the
   changed surface; retain unchanged context locations such as the other side
   of a cycle.
6. Include repository commit, base ref, changed-surface command, detector
   versions, health evidence, finding IDs, re-run command, and explicit blocked
   or incomplete conditions.

Record `tsc --noEmit`, read-only lint, and explicitly configured read-only test
results when available. Do not require them to be green and do not run builds,
coverage, snapshot updates, fix modes, or generators.

The artifact supplies Measure evidence only. It does not contain Analyze
conclusions, proposed remediation, effort estimates, canonical nominations, or
an Improve plan.
