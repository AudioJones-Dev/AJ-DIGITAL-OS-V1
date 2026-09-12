# aj-prune

Evidence-driven code-pruning pipeline, packaged so the skills are available in
every repository on every machine.

## Install

On each machine:

```
claude plugin marketplace add AudioJones-Dev/AJ-DIGITAL-OS-V1
claude plugin install aj-prune@aj-digital-os
```

Skills are namespaced once installed: `/aj-prune:prune-inventory`, etc.

## The pipeline

Run in order. Each stage consumes the previous stage's report.

| Stage | Skill | Purpose |
|-------|-------|---------|
| 1 | `prune-inventory` | Find candidates. Never edits files. |
| 2 | `prune-reachability` | Test candidates against imports, routes, jobs, webhooks, registries, dynamic dispatch. |
| 3 | `prune-coverage` | Correlate with tests, coverage, runtime, telemetry, docs, config, Git history. |
| 4 | `prune-plan` | Convert verified candidates into small, independently reversible batches. |
| 5 | `prune-apply` | Apply exactly one approved batch. Manual invocation only. |
| 6 | `prune-verify` | Residual-reference checks, lint, types, tests, build, diff, rollback. |

`repo-pruner` is a separate detection-only evidence emitter for DMAIC
Measure/Analyze, not part of the six-stage sequence.

## Caveats when used outside AJ-DIGITAL-OS

**`prune-apply` gating.** The skill requires the operator to approve a batch with
the literal token `proceed <Batch ID>`. That token is defined in AJ-DIGITAL-OS's
root `AGENTS.md`. In a repository without an `AGENTS.md` defining an approval
word, the gate has no definition to point at and degrades to ordinary
confirmation. The skill still cannot self-trigger — it carries
`disable-model-invocation: true` and only runs on explicit `/prune-apply`
invocation — but treat the approval step as weaker there, and prefer supplying an
`AGENTS.md` approval convention in repos where you intend to use it.

**`prune-inventory`, `prune-reachability`, `prune-verify`** also read root
`AGENTS.md` / `CLAUDE.md` for path-scoped policy. Absent those files they fall
back to general judgement rather than failing.

**`repo-pruner` needs its dependencies installed.** Plugin installation does not
run `npm install`. Before first use:

```
npm install --prefix <plugin-dir>/skills/repo-pruner
```

It has 9 dependencies (eslint, knip, madge, jscpd, typescript, …) and targets
Node 24.18.0. It only produces meaningful output on TypeScript/JavaScript
repositories, and its own fixture/parity gates prevent it running against a live
repository before those gates pass.

**`repo-pruner` dev scripts are repo-coupled.** `test:p2`/`test:p3`/`test:p4` and
part of `validate:syntax` in its `package.json` reference `../../tests/` and
`../../scripts/` inside AJ-DIGITAL-OS and will not resolve from the plugin copy.
The runtime scripts (`scripts/run-pruner.mjs`, `run-adapters.mjs`, `reverify.mjs`)
are self-contained and unaffected. `package.json` is left byte-identical to
canonical deliberately, so the copy can be hash-compared against
`skills/repo-pruner`.

## Provenance and drift

This directory is a **copy**, not a symlink — AJ-DIGITAL-OS's
`scripts/sync-agent-skill.mjs` rejects symlinks, and Claude Code needs real
directories.

Sources as of v0.1.0:

- `prune-*` (six) — copied from `.claude/skills/`, the only existing copies.
- `repo-pruner` — copied from canonical `skills/repo-pruner` (v0.4.2-p4),
  **not** from `.claude/skills/repo-pruner`, which is a stale v0.4.1-p4 mirror.

These skills are not yet wired into `sync-agent-skill.mjs`, so this copy can
drift. Until that is fixed, re-copy on change and bump `version` in
`.claude-plugin/plugin.json`.
