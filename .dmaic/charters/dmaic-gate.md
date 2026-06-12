# Charter: dmaic-gate

- Component: dmaic-gate
- Mode: improvement
- Owner: dev@audiojones.com
- Status: warn-mode bootstrap (2026-06-12)

## Define

The DMAIC gate is the repository's change-governance control: it inspects the
files a commit or PR touches, maps them to governed components in
`.dmaic/components.yaml`, and requires a governing charter (this file family)
plus, for improvement-mode changes, a regression test. The problem it solves is
ungoverned, untested change landing on `main` without a recorded quality
rationale. This charter governs the gate's own tooling (`tools/dmaic_gate/**`,
`.dmaic/**`, the CI workflow, docs, and hooks) so the control that governs the
codebase is itself governed. Scope for v1 is deliberately the gate only; broad
adoption across `src/**` is a separate, later decision.

## Measure

Success is measured by: (1) the gate runs on every PR via
`.github/workflows/dmaic-gate.yml` and writes a telemetry event per evaluation
to `memory/dmaic/telemetry/gate-events.jsonl`; (2) in the current **warn** mode
the gate never hard-fails CI — it logs "would block" findings (ungoverned
components, missing charters) as visible warnings while exiting 0, so adoption
friction is observable before it is enforced; (3) the gate's own acceptance
suite `tests/test_dmaic_gate.py` passes. The promotion metric for flipping to
`enforce` is: zero unexplained "would block" findings across a representative
sample of PRs, confirming the component registry and charter coverage are
complete enough to enforce without blocking legitimate work.

## Analyze

The known failure mode — and the reason this charter exists — is that under
`mode: enforce` with `CI=true`, the gate blocks **every** PR: any source file
outside the registry reads as "ungoverned component", and any commit without a
`Charter:` trailer reads as "no governing charter". That is correct end-state
behavior but wrong for a control with near-zero registry coverage, so it would
have attached an always-failing required check to the repo. Root cause: the gate
was merged enforce-first instead of warn-first. Countermeasure: `mode: warn`
until the registry and charters cover enough of the codebase to enforce
meaningfully, governed by the Measure promotion metric above. Flipping back to
`enforce` is an explicit, approved decision, not a default.
