# Code Pruning Agent Workflow

**Status:** Proposed governed workflow  
**Scope:** AJ Digital OS repositories and reusable bootstrap standards  
**Canonical policy:** Root `AGENTS.md`

## Purpose

Turn code pruning into a repeatable, evidence-gated agent workflow rather than a one-shot deletion prompt.

The workflow separates discovery, reachability analysis, runtime/coverage evidence, planning, application, and independent verification so an agent cannot equate "not found in my search" with "dead in production."

## Pipeline

| Stage | Skill | Default action | Gate |
|---|---|---|---|
| 1 | `prune-inventory` | Read/report only | None |
| 2 | `prune-reachability` | Read/report only | Candidate list |
| 3 | `prune-coverage` | Read/report only | Reachability findings |
| 4 | `prune-plan` | Read/report only | Only SAFE TO PLAN candidates |
| 5 | `prune-apply` | Write | Explicit approved batch |
| 6 | `prune-verify` | Read/test/report | Applied batch/diff |

## Universal conversion formula

Every pruning method must define:

1. **Trigger** — when the workflow applies.
2. **Inputs** — files, commands, scope, candidates, and evidence it may inspect.
3. **Procedure** — ordered investigation or execution steps.
4. **Safety gates** — what cannot be deleted or changed automatically.
5. **Output contract** — exact findings, decisions, validation, and rollback information.

## Confidence model

- `HIGH` — private/unreachable candidate with no dynamic registration and positive static evidence.
- `MEDIUM` — internal candidate with no direct references but plausible indirect invocation.
- `LOW` — public API, route, webhook, job, callback, registry, migration, feature-flagged code, dynamic code, integration contract, or customer-facing surface.

Only `HIGH` candidates may advance to `SAFE TO PLAN`, and only after reachability and coverage/runtime review find no contradictory evidence.

## Decision vocabulary

Reachability and evidence review must use one of these decisions:

- `SAFE TO PLAN`
- `NEEDS OWNER CONFIRMATION`
- `RETAIN`
- `INSUFFICIENT EVIDENCE`

A candidate does not advance to deletion planning unless it is `SAFE TO PLAN`.

## Cross-runtime implementation

### Codex

Codex uses root and nested `AGENTS.md` instructions plus repository skills under `.agents/skills/`.

Invoke explicitly when desired:

```text
$prune-inventory src/
$prune-reachability <candidate-or-report>
$prune-coverage <candidate-or-report>
$prune-plan <verified-candidates>
$prune-apply Batch-1
$prune-verify Batch-1
```

`prune-apply` must disable implicit invocation in its OpenAI skill metadata.

### Claude Code

Claude Code follows `CLAUDE.md`, root/path-scoped `AGENTS.md`, and project skills under `.claude/skills/`.

Invoke explicitly when desired:

```text
/prune-inventory src/
/prune-reachability <candidate-or-report>
/prune-coverage <candidate-or-report>
/prune-plan <verified-candidates>
/prune-apply Batch-1
/prune-verify Batch-1
```

`prune-apply` must set `disable-model-invocation: true` so Claude cannot decide to run the write-capable workflow on its own.

## Coverage and runtime evidence rule

No-test, no-coverage, or no-runtime-observation is not proof of dead code.

Coverage/runtime evidence can:

- increase confidence when it corroborates static and reachability evidence;
- lower confidence when contradictory execution evidence exists;
- identify missing tests or observability;
- force `INSUFFICIENT EVIDENCE` when production reachability cannot be established.

## Write authorization rule

A general request such as "clean up dead code" authorizes diagnosis and planning only.

Deletion requires:

1. A `prune-plan` output.
2. A numbered or uniquely named batch.
3. Explicit operator approval of that batch.
4. Invocation of `prune-apply` for that batch.

No agent may infer approval from prior enthusiasm, a broad cleanup objective, or a static-analysis report.

## Verification contract

After application, verify at minimum where available:

- residual reference search;
- type checking;
- lint;
- targeted tests;
- full test suite when repository policy requires it;
- build;
- final diff review;
- dependency manifest consistency if dependencies changed;
- documentation or public-export consistency where applicable.

Report failed or skipped checks exactly. Do not expand the deletion batch to fix unrelated failures.

## Rollback contract

Every applied batch must identify a reversible Git rollback path appropriate to the repo state, normally a revert of the pruning commit or restoration of the approved batch diff.

Do not rewrite shared history.

## Bootstrap target

Future repository bootstrap should install:

- root pruning policy in `AGENTS.md`;
- root `CLAUDE.md` reference policy;
- the six Codex skills under `.agents/skills/`;
- the six Claude skills under `.claude/skills/`;
- explicit-only invocation controls for `prune-apply`;
- this protocol or an equivalent canonical workflow reference.

Repo-specific commands and protected surfaces must be discovered from each repository rather than hard-coded globally.
