---
name: repo-pruner
description: >-
  Produce deterministic, detection-only repository health evidence for DMAIC
  Measure and Analyze. Use for approved TypeScript or JavaScript repository
  pruning audits covering duplication, dead code, unused dependencies, import
  cycles, complexity, and oversized modules. Never use it to delete, refactor,
  install packages, mutate governance, open a PR, or scan a live repository
  before the fixture, parity, and installation gates documented by the owning
  Git Spec pass.
---

# Repo Pruner

## Hard authority boundary

This skill does not build, delete, refactor, migrate, install, commit, publish,
or modify source. It does not edit `.dmaic/**`, open a charter, or change a
component status. It may write generated evidence only under `.pruner/`.
Producing findings and stopping is the successful outcome.

Stop before any remediation. Hand confirmed evidence to DMAIC Analyze; route
any separately approved Improve work through `/goal`.

## P4 ratified state

This package contains the deterministic P1 safety shell, P2 adapters for jscpd,
Knip, Madge, and ESLint, the P3 classification pipeline, and P4 Measure and
Sprint -1 evidence emitters. P4 passed actual byte-parity certification under
the exact Windows v1 matrix and is installed in the approved repo-local agent
discovery paths.

`liveRepositoryRunAuthorized: true` means the core runner is eligible for a
separately approved non-fixture run. It is not blanket scan authority:

- Require the operator to name the exact repository and portfolio/component
  scope before each non-fixture run.
- Invoke a non-fixture run only with explicit `--repo`, `--scope`, and
  `--live-repository` arguments. Require `--repo` to resolve to the Git root.
- Do not scan AJ Digital OS, ResponseOS, or another live repository merely
  because this skill is installed or invoked implicitly.
- Preserve the clean-baseline, output-boundary, protected-path, and fail-closed
  rules for every run.
- Treat Linux, macOS, ARM64, different Windows builds, and runtime/version drift
  as uncertified until a separately ratified parity expansion passes.
- A non-fixture scan never authorizes remediation, registry mutation, external
  publication, CI integration, or P5 work.

## Scope contract

| Scope | Analysis context | Emission filter |
|---|---|---|
| Portfolio | Whole repository and valid component registry | All normalized findings plus an incomplete Sprint -1 evidence draft |
| Component | Whole repository graph | Emit only findings with a primary location in `git diff <base>...HEAD`; retain unchanged context locations |

Never run graph detectors against changed files alone.

## Run order

1. Read applicable `AGENTS.md`, `.pruner.yml`, and the configured DMAIC
   registry without modifying them.
2. Resolve the scope, repository containment, base reference, and committed
   diff. Reject dirty source state before detector execution.
3. Resolve every enabled detector from the skill-local pinned installation.
   Never invoke a download-capable fallback such as bare `npx`.
4. Capture a path/content snapshot outside `.git/` and `.pruner/`.
5. Run detectors with whole-repository context. Record `tsc --noEmit`, read-only
   lint, and explicitly configured read-only tests as health evidence; failing
   health commands do not become pruning findings. Never run a build, fix mode,
   coverage generation, snapshot update, or code generator.
6. Normalize detector records, classify paths, resolve registry protection,
   calculate the full-graph blast radius, and classify through deterministic
   rules only. An agent never assigns confidence or selects a canonical owner.
7. Filter component output after full-graph analysis.
8. Write only the generated artifacts allowed below.
9. Re-capture the source snapshot. Any change outside `.pruner/` invalidates
   the run; report the paths and do not revert them.
10. Report the evidence and stop.

## Fail-closed rules

- Missing or invalid portfolio registry: write a blocked manifest, emit no
  inventory or actionable findings, and exit non-zero.
- A registry path that resolves or links outside the repository is invalid and
  must fail closed before its contents are read.
- Missing or invalid component registry: evidence-only output may continue,
  but every otherwise-actionable result becomes `needs-decision`, statuses are
  `null`, and the run is incomplete.
- Missing enabled detector, unresolved base ref, ambiguous component mapping,
  dirty baseline, malformed config, or output-boundary violation: emit no
  actionable finding and exit non-zero.
- Missing `.pruner.yml` alone may use documented defaults with a notice.

## Generated output boundary

The runner may create or replace only:

```text
.pruner/findings.jsonl
.pruner/run-manifest.json
.pruner/measure.md
.pruner/sprint-minus-1-inventory.md
.pruner/raw/**
```

Promotion into `.dmaic/**` is a separate human/DMAIC action.

## Protection invariants

- Any location outside `code` or `test` forces the whole finding to
  `excluded`.
- Any protected location forces the whole finding to `excluded`.
- Duplication is always `needs-decision`, never `actionable`.
- Tests are never `actionable` in v1.
- Auth, billing, public API, environment contracts, schema/migrations, and
  deployment domains are `needs-decision` with
  `blast_radius.public_api_touched: true` unless an earlier exclusion wins.
- `@pruner-ignore` requires a substantive `reason:` clause. Invalid
  annotations emit `kind: invalid-annotation`. A valid annotation applies only
  to a duplicate range overlapping the annotated declaration.

Read `references/protected.md` before classification and
`references/classify.md` before interpreting a normalized record.

## Determinism and verification

- Use the schema in `schemas/finding.schema.json`.
- Normalize paths to repository-relative forward-slash form.
- Generate IDs and confidence from documented deterministic inputs.
- Serialize fields and records in stable order without timestamps, host names,
  usernames, absolute paths, agent names, or process IDs.
- Every emitted finding requires a re-runnable `verify_cmd` through
  `scripts/reverify.mjs`; drop and count records that cannot be reverified.
- Keep runtime and host diagnostics in `.pruner/run-manifest.json`, which is
  outside the byte-parity assertion.
- Certify host parity with `tests/repo-pruner/parity-harness.mjs` only under
  the exact Windows, Node, npm, Git, PowerShell, and host-version matrix in the
  canonical spec. A harness unit test is not parity certification.

## References

| File | Read when |
|---|---|
| `references/detectors.md` | Implementing or running approved detector adapters |
| `references/protected.md` | Resolving path classes, registry protection, and never-touch domains |
| `references/classify.md` | Applying deterministic classification and confidence rules |
| `references/emit-measure.md` | Emitting component-scope evidence |
| `references/emit-inventory.md` | Emitting portfolio Sprint -1 evidence |

## Fixture commands

Run only from the canonical skill package with its pinned local dependencies:

```text
node scripts/run-adapters.mjs --repo ../../fixtures/pruner-lab
```

This command emits raw normalized records under the fixture's `.pruner/raw/**`
and never emits classifications or final findings.

Run the complete core workflow against a clean standalone fixture repository:

```text
node scripts/run-pruner.mjs --repo <path-to-clean-pruner-lab>
```

Portfolio scope also emits `.pruner/sprint-minus-1-inventory.md`; component
scope emits `.pruner/measure.md`. Both are incomplete evidence artifacts and
never governance decisions.

For an explicitly approved non-fixture target, use:

```text
node scripts/run-pruner.mjs --repo <absolute-repository-root> --scope <portfolio|component> --live-repository
```

Omitting any authorization argument must stop before detector execution.
