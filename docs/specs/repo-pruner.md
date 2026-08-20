# Git Spec: `repo-pruner`

**Type:** Agent skill (portable across Claude Code, Codex, and Cursor)

**Status:** P4 core ratified, parity-certified, and installed; each live-repository run requires explicit target-and-scope approval; external integration remains blocked

**Owner:** AJ Digital OS

**Depends on:** `dmaic-coding`, `/goal` execution protocol

**Authority level:** Detection and deterministic classification only; no source mutation

> **Hard authority boundary:** This skill does not build, delete, refactor,
> migrate, install, commit, publish, or modify source. It does not update the
> DMAIC registry or open a charter. It may write generated evidence only under
> `.pruner/`. Producing evidence and stopping is the successful outcome.

## 1. PRD — Problem Definition

### 1.1 Problem statement

Vibe-coded repositories accumulate duplicated implementations, dead exports,
orphaned dependencies, circular imports, and oversized modules faster than they
accumulate the evidence needed to safely remove any of it. Static tools can find
possible waste, but an agent given both the finding and authority to act can
produce unreviewable repo-wide rewrites, collapse implementations that encode
different business invariants, or rewrite prompts, PRDs, and Markdown as if
they were code.

AJ Digital OS has a governance loop for remediation, but DMAIC Measure currently
requires an operator to assemble most technical-debt evidence by hand. A
deterministic, read-only instrument is needed between repository state and
DMAIC Measure/Analyze.

### 1.2 Desired outcome

Provide a portable skill that runs locally, without network access, and emits
re-runnable evidence for DMAIC. The same repository state, configuration,
runtime, and pinned detector package must produce byte-identical
`.pruner/findings.jsonl` regardless of which supported agent invokes it.

The skill must fail closed when it cannot establish the information needed to
classify a finding safely. It must never convert uncertainty into deletion
authority.

### 1.3 Scope

**In scope**

- Repository-wide and branch-diff-scoped detection of duplicated blocks,
  unused files/exports/dependencies, circular imports, orphan modules,
  complexity outliers, oversized modules, and invalid ignore annotations.
- Deterministic normalization and classification of detector evidence.
- Full-project dependency and import graph analysis for both scopes.
- Filtering component-scope output to findings that intersect the changed
  surface after full-project analysis completes.
- Path classification that separates code, tests, documentation, prompts,
  configuration, generated output, and protected domains.
- DMAIC-consumable Measure evidence and Sprint -1 inventory drafts.
- Fail-closed behavior for missing or invalid registry data, missing detector
  packages, unresolved scope, and ambiguous protected-path resolution.

**Out of scope — deliberate and permanent for the core skill**

- Applying refactors, deletions, migrations, dependency changes, or source
  edits. Improve belongs to `/goal` under a separately approved charter.
- Authoring branches, worktrees, commits, pull requests, or PR comments.
- Updating `.dmaic/components.yaml` or declaring that Sprint -1 passed.
- Maintaining a remediation ledger, status registry, or independent quality
  gate.
- Subjective architectural conclusions, including choosing a canonical
  implementation or asserting that two implementations share one invariant.
- Installing packages, updating lockfiles, or downloading tools during a run.
- Running commands that write build output, coverage, snapshots, generated
  code, or any artifact outside `.pruner/`.

### 1.4 Voice of the customer

The primary operator manages multiple TypeScript and Next.js repositories under
an autonomous provisioning system. They need measurable pruning without
granting an agent permission to redesign a repository because code looks
complex. The same skill must behave consistently under Claude Code, Codex, and
Cursor, and its findings must be reviewable before any Improve work begins.

### 1.5 Acceptance criteria

| ID | Criterion | Required signal |
|---|---|---|
| A1 | A run performs zero writes outside `.pruner/` | A before/after path and content snapshot shows no created, modified, renamed, or deleted path outside `.pruner/`; the test does not require overall `git status` to be empty because generated evidence is expected |
| A2 | Every emitted finding has a verbatim re-runnable verification command | JSON Schema validation succeeds and every record has a non-empty `verify_cmd`; records without one are dropped and counted in the run manifest |
| A3 | No protected or never-touch finding becomes `actionable` | The fixture's prompt duplication, documentation duplication, and authentication dead export classify exactly as `excluded`, `excluded`, and `needs-decision`; five additional protected-path decoys classify `excluded`; none are `actionable` |
| A4 | Portfolio inventory status output is unambiguous without mutating governance state | Every inventory row contains exactly one valid `current_status` from the registry and exactly one valid `recommended_status`; findings use nullable status fields and do not claim to update the registry |
| A5 | Portfolio output is consumable by Sprint -1 without falsely clearing its gate | Every registered component receives all 10 required inventory fields, provenance is attached, unknown subjective fields are explicitly marked `Unresolved`, and the runner never emits a Sprint -1 `pass` decision |
| A6 | Host-agent invocation does not change the finding artifact | The same fixture commit, config bytes, skill lockfile, and approved v1 Windows/Node/tool matrix produce byte-identical `findings.jsonl` when invoked through the recorded Claude Code, Codex, and Cursor hosts |
| A7 | Core detection requires no network call, API key, or hosted service | A complete run succeeds with network disabled after an explicitly approved, prior dependency bootstrap |
| A8 | Missing governance or detector inputs fail closed | Portfolio mode exits incomplete without a valid registry; component evidence-only mode emits no `actionable` classification; missing enabled detectors produce a blocked run manifest |
| A9 | Component results retain repository context | Detectors build the whole-project graph, then emitted findings are filtered to records intersecting the committed diff surface |

## 2. Architecture

### 2.1 Position in the stack

```text
Project Provisioning
        ↓
Implementation Workflows
        ↓
Testing and Verification
        ↓
┌─────────────────────────────────────────────────┐
│  DMAIC (governance / gates)                     │
│  Define → Measure → Analyze →  Improve → Control│
│              ▲          ▲       = /goal         │
│              │          │                       │
│        repo-pruner  repo-pruner                 │
│        (evidence)   (classification)            │
└─────────────────────────────────────────────────┘
        ↓
Security Review → Ratification Packet → PR / Deployment
```

`repo-pruner` is an instrument DMAIC uses during Measure and Analyze. It is not
a lifecycle stage and does not create a second gate beside DMAIC.

### 2.2 Authority and data flow

```text
Agent host
  └─ invokes deterministic runner
       ├─ validates config and governance inputs
       ├─ checks locally pinned detector availability
       ├─ captures a source-tree mutation snapshot
       ├─ runs full-project detector adapters
       ├─ normalizes and classifies records deterministically
       ├─ filters component output by committed diff surface
       ├─ writes only .pruner/*
       └─ verifies the post-run mutation boundary

Human/DMAIC Analyze
  └─ reviews .pruner evidence
       ├─ confirms or rejects recommendations
       ├─ completes unresolved Sprint -1 judgment fields
       ├─ updates governance state separately when approved
       └─ opens a component charter before any /goal Improve work
```

The agent host never authors or rewrites `findings.jsonl`. It invokes the same
runner and reports its exit status and artifact locations.

### 2.3 Two scopes, mirroring DMAIC

| Scope | Trigger | Analysis context | Emitted artifact |
|---|---|---|---|
| **Portfolio** | Sprint -1, stabilization, pre-release | Whole repository and every component in a valid registry | `.pruner/sprint-minus-1-inventory.md` draft plus findings |
| **Component** | Pre-PR or post-implementation review | Whole repository graph; output filtered to `git diff <base>...HEAD` | `.pruner/measure.md` plus filtered findings |

Portfolio mode never opens charters or edits component statuses. A component
with a `Needs Refactor` recommendation is handed to DMAIC Analyze, which may
open a component charter and route an approved Improve phase to `/goal`.

### 2.4 Component-scope full-graph rule

Component scope must not invoke graph-based detectors only against changed
files. That creates false orphan, dependency, and cycle conclusions.

The runner must:

1. Resolve and validate `base_ref`.
2. Compute the merge-base diff with
   `git diff --name-only --diff-filter=ACMR <base_ref>...HEAD`.
3. Reject unstaged or staged source changes outside `.pruner/` unless the
   future configuration explicitly selects a separately specified dirty-run
   mode. Dirty-run mode is not part of v1.
4. Run enabled detectors with whole-repository context.
5. Normalize complete graphs and dependent counts.
6. Emit a finding in component scope only when at least one primary location
   intersects the committed diff surface. Context locations may remain in the
   record even when unchanged.

### 2.5 Detector and preflight stack

| Adapter | Purpose | Runtime rule | Network |
|---|---|---|---|
| `jscpd` | Exact and near-copy duplicated blocks | Resolve the skill-local pinned binary; never use a download-capable fallback | none |
| `knip` | Unused files, exports, dependencies, and unresolved imports | Analyze project configuration and complete entry graph before filtering | none |
| `madge` | Circular imports and orphan modules | Run separate deterministic circular and orphan invocations, then normalize | none |
| `eslint` | Complexity, max lines, max lines per function, and cognitive complexity | Use a bundled read-only config with pinned parser/plugins; never run `--fix` | none |
| `tsc` | Type-level health evidence | Use `--noEmit`; record the outcome as baseline evidence rather than requiring green | none |
| Project test adapter | Behavior baseline when explicitly configured | Use a read-only test command with coverage, snapshot updates, and generated output disabled | none |
| `git` | Scope, repository cleanliness, and blast-radius inputs | Use read-only status, diff, merge-base, and tracked-file commands | none |
| Annotation scanner | Validate `@pruner-ignore` reason clauses | Implement in the deterministic runner | none |

#### A2.1 — Madge requires explicit TypeScript resolution

Any Madge adapter operating on a TypeScript project must pass both
`--extensions ts,tsx` and `--ts-config <path>`. Absence of either is a contract
violation, not a tuning preference.

This requirement was observed on a seeded runtime circular import using value
imports (`cycle/a.ts` ⇄ `cycle/b.ts`):

| Invocation | Observed result |
|---|---|
| `madge --circular --json src` | `[]` |
| `madge --json src` | `{}` |
| `madge --ts-config tsconfig.json --extensions ts,tsx --circular --json src` | `[["cycle/a.ts","cycle/b.ts"]]` |

All three invocations exited zero without a warning. The adapter must therefore
run the dependency-tree form first and assert that its result is non-empty
before accepting cycle or orphan output. When TypeScript source exists, an
empty dependency tree is a configuration failure that fails closed; it is not
evidence of a clean graph.

Madge `--orphans` also reports a project entry point as orphaned when nothing
imports it. The adapter must cross-reference every orphan against a second
signal before treating it as evidence.

#### A2.2 — ESLint requires a TypeScript parser

Any ESLint adapter operating on `.ts` or `.tsx` sources must configure the
pinned TypeScript parser. Without it, files may fail to parse, all configured
rules may be skipped, and the process may still exit zero.

On a seeded 570-line file containing cognitive complexity 40 and cyclomatic
complexity 17 against thresholds of 400, 15, and 15, the observed results were:

| Configuration | Observed messages |
|---|---|
| Default parser | 12 messages, all `ruleId: null` parsing errors |
| TypeScript parser configured | Three findings: `max-lines`, `complexity`, and `sonarjs/cognitive-complexity` |

The adapter must count every ESLint JSON message whose `ruleId` is `null` as a
parse/configuration error, not a finding. Any non-zero parse-error count fails
the adapter closed. Zero rule findings alongside parse errors means zero
measurement, not a clean result.

The built-in `complexity` rule and `sonarjs/cognitive-complexity` measure
different properties and disagreed materially on the same seeded function (17
versus 40). The adapter should record both signals and must not treat them as
interchangeable.

#### A2.3 — jscpd scans Markdown by default

A jscpd adapter must not assume Markdown is out of scope and must not raise
similarity thresholds to suppress documentation matches. A whole-repository
pass without a `--format` flag was observed reporting `Clone found (markdown)`
for duplicated prose. The earlier attribution of a Markdown miss to an absent
format flag is retracted.

On an isolated two-file Markdown pair, the observed threshold behavior was:

| Block size | `--min-lines 15 --min-tokens 70` | `--min-lines 10 --min-tokens 40` |
|---|---|---|
| 15 lines | not reported | reported |
| 28 lines | reported | reported |

Block size relative to thresholds—not file format—determined whether the match
appeared. Duplicated PRD, specification, and prompt content can therefore enter
raw detector output without being explicitly requested. Pre-classification
path protection is load-bearing: protected content must be classified before
detector-specific actionability rules run.

Thresholds must not be raised to reduce documentation noise because that also
suppresses genuine source duplication and removes the protected-path findings
that exercise the classifier. Filter by path class, not by threshold. Values
below `--min-tokens 70` also produced observed lockfile and JSON-fixture matches
reported as `Clone found (json)`.

These three observations came from a seeded TypeScript fixture with
known-position defects. Detector versions were not pinned during observation,
so P2 must re-confirm A2.1 through A2.3 against the exact versions it proposes
to lock before the adapter contract can clear its exit gate.

Binary-resolution strategy, whether adapters shell out, argument handling, any
runner, workflow, or CI integration remain outside this amendment.

Build commands are not part of a core run because builds commonly write to
`dist/`, `.next/`, or other paths and would violate A1. Existing build results
may be referenced as external baseline evidence, but `repo-pruner` does not
produce them.

SonarQube and SonarCloud are excluded. Their hosted server or token, separate
quality-gate configuration, and governance model conflict with A7 and duplicate
DMAIC. Local `eslint-plugin-sonarjs` provides the required cognitive-complexity
signal without adding a hosted integration.

## 3. Deterministic Runner and Package Contract

### 3.1 Canonical source and portable installation

The canonical source package is `skills/repo-pruner/`. Tool-specific discovery
copies under `.agents/skills/` and `.claude/skills/` are installation artifacts,
not independent sources of truth. Codex and Cursor discover the shared
`.agents/skills/repo-pruner/` copy; Claude Code discovers
`.claude/skills/repo-pruner/`. v1 does not create a redundant `.cursor/skills/`
copy.

The implemented root-level packaging interface is:

```powershell
node scripts/sync-agent-skill.mjs repo-pruner --check
node scripts/sync-agent-skill.mjs repo-pruner --apply
```

`--check` is the canonical read-only/default operation. It computes a
normalized tree hash from `skills/repo-pruner/` and fails when either discovery
copy is missing or divergent. `--apply` copies the canonical package to the two
approved discovery locations only and requires a separate operator `proceed`.
It must fail rather than overwrite an unexpected divergent destination unless
that exact replacement is separately approved. It excludes `node_modules/`,
cache data, and `.pruner/` artifacts from both source and destination trees.

The sync script and commands are ratified and implemented. The approved P4
installation synchronized both discovery copies and verified their normalized
tree hashes against the canonical package. The core run command always executes
the canonical deterministic runner. Host agents must not reconstruct detector
commands or classification logic from prose.

An approved non-fixture run uses this explicit handshake:

```powershell
node skills/repo-pruner/scripts/run-pruner.mjs --repo <absolute-repository-root> --scope <portfolio|component> --live-repository
```

For a non-fixture target, all three arguments are mandatory and the resolved
`--repo` path must equal that repository's Git root. `--live-repository` records
approval of the named target and scope for this invocation; it does not persist
authority for later runs. Fixture runs remain available without the flag.
Unknown arguments and partial handshakes fail before detector execution.

### 3.2 Implemented skill package

```text
skills/repo-pruner/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── package.json
├── package-lock.json
├── scripts/
│   ├── run-pruner.mjs
│   ├── run-adapters.mjs
│   ├── reverify.mjs
│   ├── self-test.mjs
│   └── lib/
│       ├── adapters/
│       │   ├── jscpd.mjs
│       │   ├── knip.mjs
│       │   ├── madge.mjs
│       │   ├── eslint.mjs
│       │   └── tsc.mjs
│       ├── annotations.mjs
│       ├── classifier.mjs
│       ├── config.mjs
│       ├── constants.mjs
│       ├── detector-runtime.mjs
│       ├── emitters.mjs
│       ├── fixture.mjs
│       ├── git.mjs
│       ├── normalize.mjs
│       ├── output.mjs
│       ├── paths.mjs
│       ├── pipeline.mjs
│       ├── records.mjs
│       ├── registry.mjs
│       ├── snapshot.mjs
│       └── stable.mjs
├── schemas/
│   ├── config.schema.json
│   ├── finding.schema.json
│   ├── normalized-record.schema.json
│   ├── registry-extension.schema.json
│   └── run-manifest.schema.json
└── references/
    ├── detectors.md
    ├── classify.md
    ├── protected.md
    ├── emit-measure.md
    └── emit-inventory.md
```

Fixtures and acceptance tests belong to repository test surfaces, not inside
the installed skill package:

```text
fixtures/pruner-lab/
tests/repo-pruner/
```

These paths are implemented P0-P4 deliverables. The canonical package remains
the only editable source; discovery copies remain generated installation
artifacts.

### 3.3 Dependency contract

- Pin exact detector, parser, plugin, and runner dependency versions in the
  skill-local `package-lock.json`.
- Do not add detector dependencies to the target repository's root manifest.
- Require an explicit, separately approved bootstrap to install the
  skill-local lockfile before offline execution.
- During a run, resolve binaries only from the skill-local installation.
- Never invoke a package-manager path that may download a missing package.
- If any enabled detector or expected version is absent, write a blocked run
  manifest under `.pruner/`, emit no actionable classification, and exit
  non-zero.
- Record detector names and versions in `.pruner/run-manifest.json`. Keep them
  out of `findings.jsonl` ordering inputs unless they are part of a stable
  finding identifier contract.

The skill-local dependency bootstrap and lockfile were separately approved and
completed for P4. Future dependency or lockfile changes still require separate
approval and a new offline/parity evidence run.

### 3.4 Byte-parity rules

To satisfy A6, the deterministic runner must:

- Normalize all repository paths to root-relative forward-slash form.
- Normalize text output to UTF-8 and LF line endings.
- Exclude timestamps, absolute paths, host names, usernames, temp paths, agent
  names, and process IDs from `findings.jsonl`.
- Sort arrays and findings using documented stable keys.
- Serialize JSON keys in schema order with no insignificant variation.
- Generate finding IDs from a stable content hash of detector, kind,
  normalized primary locations, and a normalized evidence fingerprint.
- Use deterministic confidence rules defined in code and documented in
  `references/classify.md`; an agent must not assign confidence.
- Keep run time, host information, and execution diagnostics in the manifest,
  which is excluded from the byte-parity assertion.
- Compare identical fixture commits, configuration bytes, Node runtime,
  operating-system family, and skill lockfile in T6. Cross-operating-system
  parity is a future target, not implied by A6 v1.

### 3.5 Approved v1 parity certification matrix

T6 certifies host-agent parity only within this exact Windows lane:

| Dimension | v1 certification value | Rule |
|---|---|---|
| Operating system | Windows `win32-x64`; Windows NT `10.0.26200.x` | Use one machine and checkout for the three host invocations; different patch builds require a new evidence run |
| Node.js | `24.18.0` LTS, exact | The runner must reject certification when the major, minor, or patch differs |
| npm bootstrap | `11.16.0`, exact | Bootstrap-only input; npm is not invoked by a core offline run |
| Git | `2.55.0.windows.3`, exact | Use the same executable for merge-base, status, and diff inputs |
| PowerShell | `7.6.3`, exact | Used by the Windows acceptance harness, not by the portable core classifier |
| Agent hosts | Claude Code `2.1.220`, Codex CLI `0.146.0`, and the installed Cursor application version captured in the T6 manifest | All three invoke the same canonical runner against the same fixture checkout; agent identity is excluded from `findings.jsonl` |

Node `26.5.0` is outside the v1 certification lane even if present on a local
workstation. Cursor may be invoked through its application when no supported
CLI is installed, but its application version must be captured in the
non-parity manifest. Linux, macOS, ARM64, and cross-operating-system byte parity
remain future matrix expansions requiring separate ratification.

### 3.6 P4 certification record

The operator ratified the core skill on 2026-08-03 after the following evidence
passed under the approved Windows lane:

- Windows NT `10.0.26200.8973`, Node `24.18.0`, npm `11.16.0`, Git
  `2.55.0.windows.3`, and PowerShell `7.6.3`.
- Claude Code `2.1.220`, Codex CLI `0.146.0`, and Cursor `3.14.7` invoked the
  same canonical runner against fixture commit
  `48222047637ddc69e2e6af6a3890b3ce412ef22c`.
- All three hosts emitted 20 byte-identical findings with SHA-256
  `11BCB9BCF71C0748187B2D32A4AC5971716873EA0E200845C210A8CCB9AA6604`.
- Configuration SHA-256 was
  `5AFBB16A85606DFA6D48BCB808104A4C487FE0578B978FFA104A44F3A1A59906`;
  lockfile SHA-256 was
  `98293D51FD5FA5A9FDBEC4A9EB0C6857BCC9A0F2C36DF609BD8EA31B7B2618A4`.
- P1-P4, T1-T14 as applicable, all eight protected decoys, the critical T3
  tuple, skill validation, and deterministic sync verification passed.

P4 ratification makes the core runner eligible for a separately approved,
target-specific live-repository run. It is not blanket authorization to scan
repositories, does not waive the clean-baseline and fail-closed rules, and does
not authorize remediation or external integration.

## 4. Output Contract

### 4.1 Generated output boundary

The core runner may create or replace only:

```text
.pruner/findings.jsonl
.pruner/run-manifest.json
.pruner/measure.md
.pruner/sprint-minus-1-inventory.md
.pruner/raw/**
```

It must not edit `.gitignore`, `.dmaic/**`, source, tests, documentation,
configuration, lockfiles, or runtime state. Generated `.pruner/` output is not
source of truth and is not staged by default.

Promotion of an inventory draft into `.dmaic/` or another governed location is
a separate human/DMAIC action outside this skill.

### 4.2 Finding record schema

Write one canonical JSON object per line to `.pruner/findings.jsonl`.

```json
{
  "id": "dup-a1b2c3d4e5f6",
  "detector": "jscpd",
  "kind": "duplication",
  "locations": [
    {
      "path": "src/lib/invoice.ts",
      "line_start": 44,
      "line_end": 91,
      "path_class": "code",
      "component_id": "invoice-core",
      "protected": false
    },
    {
      "path": "src/lib/estimate.ts",
      "line_start": 12,
      "line_end": 59,
      "path_class": "code",
      "component_id": "estimate-core",
      "protected": false
    }
  ],
  "evidence": {
    "duplicated_lines": 48,
    "token_similarity": 0.96
  },
  "blast_radius": {
    "files": 2,
    "dependents": 7,
    "public_api_touched": false
  },
  "confidence": 0.86,
  "classification": "needs-decision",
  "current_component_status": null,
  "recommended_status": "Needs Refactor",
  "rules_applied": [
    "duplication-never-actionable",
    "dependents-above-decision-threshold"
  ],
  "verify_cmd": "node skills/repo-pruner/scripts/reverify.mjs --id dup-a1b2c3d4e5f6 --config .pruner.yml",
  "analysis_question": "Do these implementations encode different business invariants?"
}
```

Allowed `kind` values:

```text
duplication | dead-code | unused-dep | cycle | complexity | oversized |
invalid-annotation
```

Allowed `classification` values:

```text
actionable | needs-decision | probable-false-positive | intentional | excluded
```

`verify_cmd` is mandatory and load-bearing. It must invoke the deterministic
reverification wrapper, which resolves the pinned detector and original
configuration. If a raw record cannot be reproduced with one documented
command, drop it from `findings.jsonl` and increment `dropped_records` in the
manifest.

`analysis_question` may frame the decision DMAIC Analyze must answer. It must
not prescribe a refactor, select a canonical implementation, or claim that a
business invariant has been disproven.

### 4.3 Status semantics

Finding records do not own component status:

- `current_component_status` is copied from a valid registry when one matching
  component is resolved; otherwise it is `null`.
- `recommended_status` is a deterministic recommendation and may be `null` for
  excluded or evidence-only records.
- Neither field changes `.dmaic/components.yaml`.
- A multi-component finding retains per-location component IDs and may result
  in separate inventory recommendations for each component.

Portfolio inventory rows, not individual findings, satisfy A4. Every row must
contain one valid `current_status` and one valid `recommended_status`. Portfolio
mode therefore requires a complete, valid registry.

### 4.4 Classification-to-DMAIC recommendation mapping

Classification precedence is defined in Section 5. Apply the following mapping
only after protection, path-class, dynamic-use, public-surface, and blast-radius
rules have executed.

| Classification and evidence | Recommended DMAIC status | Handoff |
|---|---|---|
| `actionable`: dead file or unused dependency, zero static dependents, no dynamic-use signal, valid registry, unprotected code path | `Delete Candidate` | Candidate only; DMAIC/human must verify before deletion |
| `actionable`: explicit supersession metadata points to a registered canonical component | `Deprecated` | Migration decision belongs to DMAIC |
| `needs-decision`: any duplication | `Needs Refactor` | Analyze possible divergent invariants |
| `needs-decision`: cycle, complexity outlier, oversized module, or test finding | `Needs Refactor` | Open a component charter only after human/DMAIC confirmation |
| `needs-decision`: missing dependency with an identified owner/blocker | `Blocked` | Pause and name blocker |
| `intentional`: valid reasoned annotation | Current status | Proceed without remediation recommendation |
| `probable-false-positive` | Current status | Reverify dynamic/configured use |
| `excluded` | Current status or `null` | No remediation recommendation |

Duplication is never `actionable`. A static zero-dependent result is a deletion
candidate, not deletion authority.

### 4.5 Measure artifact

Component scope emits `.pruner/measure.md` containing:

- Repository commit and base-ref identifiers.
- Changed-surface command and normalized changed paths.
- Enabled detector versions and read-only baseline command outcomes.
- Finding IDs in scope.
- A re-run command for the complete component measurement.
- Explicit incomplete or blocked conditions.

The artifact provides DMAIC Measure evidence. It does not contain an Analyze
conclusion or an Improve plan.

### 4.6 Portfolio inventory draft

Portfolio scope emits `.pruner/sprint-minus-1-inventory.md` with one row or
record per registry component and all ten DMAIC Sprint -1 fields:

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

Every populated statement must cite finding IDs, registry fields, or baseline
evidence. Static detection cannot reliably infer intended state, select a
canonical owner, define missing behavior tests, or approve stabilization
actions. When evidence does not support one of those fields, emit
`Unresolved — DMAIC Analyze input required` instead of inventing an answer.

The inventory must clearly state:

```text
Inventory gate: INCOMPLETE — review and governance update required.
```

`repo-pruner` never declares the Sprint -1 exit gate passed.

## 5. Protection and Classification

### 5.1 Classification precedence

Apply rules in this order; later rules may not weaken an earlier protection:

1. Normalize the path and resolve repository containment.
2. Apply secret and generated-output exclusions.
3. Resolve registry protection.
4. Assign each location a path class.
5. Apply default and repo-extended excluded globs.
6. Apply never-touch domain rules.
7. Validate intentional-duplication annotations.
8. Detect dynamic-use, entry-point, public-export, and configuration signals.
9. Calculate full-graph blast radius.
10. Apply detector-specific deterministic classification rules.
11. Apply the confidence emission threshold.

If locations in one record receive different classes, use the most
conservative effective classification. Any protected or excluded location
forces the entire finding to `excluded`; a later rule may not downgrade that
protection to `needs-decision` or `actionable`.

### 5.2 Backward-compatible DMAIC registry extension

The existing registry contract remains authoritative:

```yaml
version: 1
components:
  - id: build-specs
    paths:
      - "docs/specs/**"
    test_paths: []
    status: Canonical
    owner: dev@audiojones.com
    protected: true
    protection_reason: PRD and Git Spec source of truth
```

The implemented repo-pruner registry adapter accepts only these optional fields
on each existing component record:

- `protected: boolean`, default `false` when absent.
- `protection_reason: non-empty string`, required when `protected: true`.

It must preserve `id`, plural `paths`, optional `test_paths`, `status`, and
`owner`. Existing registry files without the extension must continue to parse
and behave exactly as before. Parser and gate regression tests are required
before any live registry change. The implementation must not silently accept a
truthy string as a boolean.

This spec does not authorize or perform the registry/parser extension.

### 5.3 Fail-closed registry behavior

| Condition | Portfolio scope | Component scope |
|---|---|---|
| Registry valid | Classify and emit inventory draft | Classify normally |
| Registry missing or unreadable | Write blocked manifest; do not emit inventory or actionable findings; exit non-zero | Permit evidence-only output; status fields are `null`, all otherwise-actionable records downgrade to `needs-decision`, and run outcome is incomplete |
| Registry invalid | Same as missing | Same as missing |
| Path matches multiple incompatible components | Write blocked manifest | Emit `needs-decision`, never `actionable`, and record ambiguity |
| `protected: true` without reason | Treat registry as invalid | Treat registry as invalid |

Missing `.pruner.yml` is different from a missing registry: configuration may
resolve to documented defaults with a notice, but governance data may not.

### 5.4 Path classes

Assign every location exactly one path class:

```text
code | test | doc | prompt | config | generated
```

Only `code` and `test` are eligible for non-excluded findings. Test findings
never become `actionable` in v1 because static reachability cannot prove that a
behavioral safeguard is unnecessary.

### 5.5 Portable default exclusions

```text
docs/**                 **/*.md                 **/*.mdx
PRD*                    BUILD-SPEC*             AGENTS.md
CLAUDE.md               prompts/**              **/*.prompt.*
**/migrations/**        **/schema.*             **/*.sql
**/generated/**         **/*.gen.*              **/dist/**
**/.next/**             **/coverage/**           **/node_modules/**
.env*                   **/.env*                **/*.config.*
**/deploy/**            **/deployment/**         LICENSE*
NOTICE*                 legal/**
```

Repository configuration may append exclusions but may never replace or remove
defaults.

### 5.6 AJ Digital OS protected defaults

The AJ Digital OS profile must add these paths before any live repository run:

```text
<top-level-dot-directory>/**                     .dmaic/**
.agents/**              .claude/**              .codex/**
.mcpjam/**              .tools/**               .github/**
.dashboard/**           skills/**               config/**
graphify-out/**         runtime/**              logs/**
dist/**                 node_modules/**          data/**
memory/**               output/**               sessions/**
env/**                  supabase/**             sql/**
n8n/**                  monitoring/**           compose/**
traefik/**              **/migrations/**         **/schema.*
**/.cache/**            **/.npm-cache/**         **/.pnpm-store/**
**/.turbo/**            **/.vite/**              **/.parcel-cache/**
**/.pytest_cache/**     **/__pycache__/**        **/.ruff_cache/**
docker-compose*.yml     Dockerfile               Procfile
doppler.yaml            .env                    .env.*
```

`<top-level-dot-directory>/**` is a classifier rule, not a literal glob: if the
first normalized path segment starts with `.`, the path is protected and
excluded before detector-specific classification. This fail-closed rule covers
present and future tool, agent, workspace, cache, and governance directories,
including an unenumerated directory such as `.augment/**`. Explicit entries
remain documented for auditability. `skills/repo-pruner/**` is therefore also
protected from self-pruning.

These exclusions reflect current AJ Digital OS safety boundaries. They are
additive to the portable defaults and repository configuration may only extend
them. A future layout change may add protection but may not remove these
defaults without a new ratification amendment.

### 5.7 Never-touch domains

Findings intersecting these domains are emitted as `needs-decision` with
`blast_radius.public_api_touched: true`, never `actionable`, unless an earlier
rule excludes them entirely:

- Public API contracts and exported type surfaces.
- Authentication and authorization logic.
- Billing, invoicing, payment, and financial calculation logic.
- Environment-variable contracts.
- Database schemas and migrations.
- Deployment and infrastructure configuration.
- Approval enforcement, attribution behavior, Hermes/model-router/BEL core,
  and existing API route behavior in AJ Digital OS.

### 5.8 Intentional-duplication annotation

```ts
// @pruner-ignore: duplication — reason: invoice and estimate normalizers
// encode separate rounding invariants (finance vs quoting). Do not merge.
```

The `reason:` clause is required and must contain non-placeholder text. A valid
annotation produces `classification: intentional`. An annotation without a
valid reason is not honored and produces `kind: invalid-annotation` with a
re-runnable verification command.

## 6. Configuration

Load `.pruner.yml` through a typed schema. It contains no secrets or tokens.

```yaml
version: 1
scope: portfolio # portfolio | component
base_ref: origin/main # component scope only
registry: .dmaic/components.yaml
output_dir: .pruner
detectors:
  jscpd:
    enabled: true
    min_lines: 15
    min_tokens: 70
  knip:
    enabled: true
  madge:
    enabled: true
  eslint:
    enabled: true
    complexity: 15
    max_lines: 400
  tsc:
    enabled: true
  tests:
    enabled: false
    command: null
thresholds:
  min_confidence_to_emit: 0.60
  blast_radius_decision_threshold: 5
path_classes:
  excluded_globs: [] # append-only relative to defaults
```

Rules:

- Missing config resolves to these defaults with a notice in the manifest.
- Unknown fields, invalid enum values, naive path traversal, absolute output
  paths, or an `output_dir` outside `.pruner/` fail validation.
- Detector versions do not live in `.pruner.yml`; the skill-local lockfile is
  the single version source of truth.
- Component scope requires a valid `base_ref`.
- A configured test command must be explicitly marked read-only by the adapter,
  and the post-command snapshot must still satisfy A1.
- No configuration flag may authorize source mutation, deletion, package
  installation, registry writes, PR comments, or quality-gate enforcement.

## 7. Baseline and Run Protocol

### 7.1 Reproducibility preflight

Before detector execution, the runner must:

1. Confirm it is inside a Git repository and resolve the repository root.
2. Validate configuration and output containment.
3. Capture current commit, branch, and base ref where applicable.
4. Require no staged, unstaged, or untracked paths outside `.pruner/` for v1.
5. Load and validate the registry according to scope.
6. Resolve every enabled detector from the skill-local pinned installation.
7. Capture a before-run path/content snapshot excluding `.git/**` and
   `.pruner/**`.

For a non-fixture repository, preflight must also confirm that package metadata
carries `liveRepositoryRunAuthorized: true` and that the invocation supplies
explicit `--repo`, `--scope`, and `--live-repository` arguments. The real target
must equal the Git root; a nested path fails closed to prevent an accidental
parent-repository scan.

A dirty source baseline blocks v1 execution; the skill reports the paths and
stops without cleaning, stashing, committing, or modifying them.

### 7.2 Health evidence

Typecheck, lint, and tests are measurements, not prerequisites that must already
be green. A stabilization instrument must remain useful on an unhealthy
repository.

- Record `tsc --noEmit`, read-only ESLint, and configured test outcomes.
- Do not classify their failures as pruning findings unless a future schema
  explicitly adds a supported finding kind.
- Do not run builds, coverage generation, snapshot updates, or fix modes.
- If a health command writes outside `.pruner/`, invalidate the run, report the
  mutation, and emit no actionable findings. The runner must not revert it.

### 7.3 Completion and mutation check

After emission, capture the same path/content snapshot and compare it with the
pre-run snapshot. Any difference outside `.pruner/` fails A1, marks the run
invalid, and exits non-zero. The manifest must name the changed paths without
attempting cleanup.

## 8. Fixture and Acceptance Test Plan

### 8.1 Fixture repository

Future P0 creates `fixtures/pruner-lab/`, a deliberately seeded TypeScript/Next
repository containing:

- Two genuinely duplicated modules → `needs-decision`.
- Two similar but divergent modules with a valid `@pruner-ignore` reason →
  `intentional`.
- One orphaned file with zero importers → `Delete Candidate` recommendation.
- One unused dependency with no script, plugin, config, or dynamic-use signal →
  `Delete Candidate` recommendation.
- One dynamically imported file Knip cannot see →
  `probable-false-positive`.
- One circular import pair → `Needs Refactor` recommendation.
- One 900-line component → `Needs Refactor` recommendation.
- One ignore annotation without `reason:` → `invalid-annotation`.
- A duplicated block under `prompts/` → `excluded`.
- A duplicated block under `docs/` → `excluded`.
- A dead export under `src/auth/` → `needs-decision` with
  `blast_radius.public_api_touched: true`, never `actionable`.
- An apparently unused executable under `skills/` → `excluded`.
- A dead hook or script under `.dmaic/` → `excluded`.
- A generated duplicated block under `graphify-out/` → `excluded`.
- Code-like content under an otherwise unenumerated top-level dot-directory,
  seeded as `.augment/` → `excluded`.
- One mixed-location finding spanning an ordinary code path and any protected
  path → `excluded` under the most-conservative-location rule.
- A cycle whose changed-side module is in the component diff and whose other
  module is unchanged → emitted with both locations, proving full-graph context.
- A protected registry component using the additive extension → `excluded`.

The first three protected-domain cases are a hard admission gate. Their ordered
classification tuple must be exactly:

```text
prompts duplication, docs duplication, src/auth dead export
= excluded, excluded, needs-decision
```

No runner or classifier may be pointed at AJ Digital OS, ResponseOS, or another
non-fixture repository until the fixture exists and T3 passes. This amendment
ratifies the seed and assertion contract only. It does not authorize creating
the fixture or expected-output manifest, installing dependencies, or beginning
P0.

### 8.2 Acceptance tests

| Test | Assertion |
|---|---|
| `T1_no_out_of_boundary_writes` | A1: before/after snapshots differ only under `.pruner/`; generated output is allowed and overall Git status need not be empty |
| `T2_schema_and_verify_valid` | A2: every finding validates, has a non-empty deterministic `verify_cmd`, and dropped raw records are counted |
| `T3_protected_decoys` | A3: assert the exact ordered tuple `prompts=excluded`, `docs=excluded`, `src/auth=needs-decision`; assert `src/auth` sets `public_api_touched: true`; assert `skills`, `.dmaic`, `graphify-out`, `.augment`, and mixed code/protected findings are each `excluded`; assert none of the eight decoys is `actionable` |
| `T4_inventory_status_contract` | A4: every portfolio row has one valid current and recommended status; registry bytes remain unchanged |
| `T5_inventory_completeness` | A5: all 10 fields exist, statements carry provenance, unresolved judgments are explicit, and no gate-pass claim is emitted |
| `T6_cross_agent_parity` | A6: SHA-256 of `findings.jsonl` is identical across Claude Code, Codex, and Cursor under the pinned test matrix |
| `T7_offline` | A7: a full run completes with network disabled and fails if a pinned local detector is removed |
| `T8_duplication_never_actionable` | No `kind: duplication` record is actionable |
| `T9_annotation_requires_reason` | An ignore annotation without a valid reason emits `invalid-annotation` |
| `T10_registry_fail_closed` | A8: missing/invalid registry blocks portfolio and downgrades component output to incomplete with no actionable records |
| `T11_full_graph_component_filter` | A9: detectors analyze the full graph and emit only findings with a primary location intersecting the diff |
| `T12_registry_backward_compatibility` | Registries without protection fields parse identically; valid booleans work; truthy strings and missing protection reasons fail |
| `T13_stable_serialization` | Shuffled detector input produces the same sorted JSONL bytes and stable IDs |
| `T14_dirty_baseline_stops` | Dirty paths are reported and remain untouched; no cleanup or detector execution occurs |

## 9. Framework Alignment

| Standing constraint | Contract |
|---|---|
| PRD-first → Git Spec → validation → gap analysis | This document is the ratified specification; no implementation phase begins without its own scoped approval |
| Detection-only authority | The runner writes only `.pruner/`; all remediation and governance mutations are external |
| Typed config, no live secrets | `.pruner.yml` and output records are schema validated and contain no tokens |
| Graceful missing config | Missing config uses documented defaults and a manifest notice |
| Fail-closed governance | Missing/invalid registry prevents portfolio classification and actionable component findings |
| Adapter/contract pattern | Every detector emits normalized raw records behind a stable adapter boundary |
| Deterministic execution | Scripts, schemas, lockfile, stable serialization, and content IDs—not agent prose—produce output |
| No Firebase | No persistence or integration layer exists beyond local generated files |
| Tool and model agnostic | Host tools invoke the same canonical runner; host identity never enters findings |
| DMAIC gate discipline | Findings feed Measure/Analyze; `/goal` remains the only Improve build engine |
| No second quality gate | The core runner reports evidence and never blocks merge or declares Sprint -1 passed |

## 10. Gap Analysis and Risks

| Gap or risk | Impact | Resolution or disposition |
|---|---|---|
| v1 detector stack is TypeScript/JavaScript only | Python and other repositories receive no meaningful coverage | Accepted for v1; future adapters such as `vulture`, `radon`, or `ruff` must preserve the normalized contract |
| Knip can miss dynamic imports and configured entry points | Live code could appear unused | Scan dynamic imports, scripts, plugins, and config signals; downgrade ambiguity to probable false positive or needs-decision |
| Static zero dependents does not prove runtime non-use | A deletion recommendation could be unsafe | Treat output as a candidate only; require registry, no dynamic signal, and human/DMAIC verification |
| jscpd flags generated and scaffolded code | Noise and false actionability | Apply path classification and exclusions before classification |
| Full-repository graphs can be expensive in monorepos | Component runs may be slow | Keep full context but allow deterministic project-root selection in a future schema revision; do not trade correctness for changed-file-only scans |
| Detector output order and path formatting vary | A6 parity failure | Normalize, sort, hash stable inputs, and pin the entire skill-local dependency graph |
| Sprint -1 contains subjective fields | Static evidence cannot complete governance judgment | Emit provenance and explicit unresolved markers; DMAIC Analyze completes the inventory |
| Tool-specific skill directories can drift | Host behavior diverges | Keep `skills/repo-pruner/` canonical; use the separately gated `node scripts/sync-agent-skill.mjs repo-pruner --check` and `--apply` contracts; fail on divergence instead of silently overwriting |
| Scheduled execution authority is not designed even though ownership is assigned | Detection cadence remains manual | `Blocked` on a separate `repo-pruner-ci-publisher` Git Spec and stage-gate conductor decision; Audio Jones is activation authority and manual invocation remains the only allowed mode |
| CI publishing requires network and external write authority | Core A7 and authority boundary would be violated | Keep it outside the core skill in the separately gated integration below |

## 11. Implementation Phase Status

| Phase | Status | Deliverable | Exit condition |
|---|---|---|---|
| **P0** | Complete | Fixture repository and expected-classification manifest | Every seeded case has documented output; T3 returns the exact protected-decoy classifications; baseline reproducible |
| **P1** | Complete | Canonical skill package, schemas, deterministic runner shell, snapshots, stable serialization, and pinned skill-local lockfile | T1, T12, T13, and T14 pass; dependency bootstrap approved and recorded |
| **P2** | Complete | Detector adapters and full-graph component filtering | Each adapter emits normalized records; T2, T7, T11, and A2.1–A2.3 pass against pinned versions |
| **P3** | Complete | Registry adapter, path classifier, protection rules, annotations, and deterministic classification | T3, T8, T9, and T10 pass |
| **P4** | Complete and operator-ratified 2026-08-03 | Measure/inventory emitters, `SKILL.md`, references, host packaging, and parity validation | T4, T5, and actual T6 pass; A1–A9 green; core skill installed |

P0-P4 were completed through separately scoped approvals. P4 closeout does not
authorize registry changes, remediation, CI wiring, or a repository scan whose
exact target and scope have not been approved.

## 12. Separately Gated External Integration — Former P5

### I1. Optional CI findings publisher

This is not part of the `repo-pruner` core skill and must have its own Git Spec,
approval, security review, and rollback plan. The ratified ownership assignment
for that future specification is:

| Role | Owner or decision |
|---|---|
| Integration component ID | `repo-pruner-ci-publisher` |
| Accountable human and activation authority | Audio Jones / Tyrone Alexander Nelms |
| Technical registry owner | `dev@audiojones.com` |
| System owner | AJ Digital OS Control Plane |
| Initial status | `Blocked` |

Possible future behavior:

- Run component scope on a pull-request branch using an already installed,
  pinned core package.
- Upload or post a summary of the generated findings.
- Never modify source, update the DMAIC registry, open remediation charters, or
  block merge.
- Treat publication as an external communication and network action requiring
  explicit operator approval.
- Keep GitHub credentials and permissions outside the core skill.
- Consume a versioned core artifact rather than reimplementing detection or
  classification in workflow YAML.

I1 remains **Blocked** until its separate Git Spec defines the stage-gate
conductor authority, external publication permissions, credential boundary,
failure behavior, rollback, and validation. Ownership is resolved; activation
is not. No CI workflow, scheduler, sync script, or PR comment behavior is
authorized here.

## 13. Control

- **Primary invariant:** T1 proves the core runner does not write outside
  `.pruner/`.
- **Classification guards:** T3, T8, T9, and T10 prevent protected,
  duplicated, ambiguous, or invalidly annotated evidence from becoming
  actionable.
- **Determinism guard:** T6 and T13 protect stable byte output and IDs.
- **Registry compatibility guard:** T12 protects the existing DMAIC gate while
  allowing the additive protection contract.
- **Version drift:** Any runner or detector dependency bump requires offline and
  parity tests before ratification.
- **Ownership:** Future registration of the skill in
  `.dmaic/components.yaml` is a separate governed change. This spec does not
  assign or write that status.
- **Reintroduction prevention:** Any import guard, lint rule, or source control
  added after a confirmed remediation belongs to the later DMAIC Control phase,
  not to `repo-pruner`.

## 14. Facts, Inferences, Assumptions, and Resolved Decisions

### Facts verified during specification revision

- The live AJ Digital OS registry uses `id`, plural `paths`, optional
  `test_paths`, `status`, and `owner`.
- The live registry parser does not yet implement typed `protected` or
  `protection_reason` fields.
- AJ Digital OS policy requires separate approval for dependency/lockfile work,
  global skill configuration, external communication, and protected-path
  changes.
- The repository currently exposes more than one agent skill discovery surface,
  so a canonical source and deterministic distribution contract are required.
- The reviewed Windows workstation ran Windows NT `10.0.26200.8973` on x64,
  Node `26.5.0`, npm `11.17.0`, Git `2.55.0.windows.3`, PowerShell `7.6.3`,
  Claude Code `2.1.220`, and Codex CLI `0.146.0`; a Cursor CLI was not available
  from the reviewed shell.

### Inferences

- Deterministic scripts and schemas are necessary; prose-only agent instructions
  cannot satisfy byte parity reliably.
- Whole-project analysis followed by diff filtering is safer than
  changed-file-only detection for reachability and cycle evidence.
- A Sprint -1 draft can be mechanically complete while the actual governance
  gate remains incomplete because several required judgments are not static
  facts.

### Assumptions to validate in P0/P1/P4

- The approved Node `24.18.0` certification runtime can be provisioned later
  without changing repository source or the core detection contract.
- The selected detector versions can run fully offline after skill-local
  bootstrap.
- The future fixture and harness can isolate host-agent variance while holding
  the ratified operating-system, runtime, Git, lockfile, and checkout inputs
  constant.
- Cursor application invocation can produce a captured host-version record and
  invoke the same canonical runner even when no Cursor CLI is available.

### Ratified decisions from the read-only review

- **v1 parity matrix:** Windows `win32-x64`, Windows NT `10.0.26200.x`, Node
  `24.18.0`, npm bootstrap `11.16.0`, Git `2.55.0.windows.3`, and PowerShell
  `7.6.3`, with Claude Code `2.1.220`, Codex CLI `0.146.0`, and the tested Cursor
  application version captured in the manifest. Node `26.5.0` is not a v1
  certification runtime.
- **Canonical skill sync:** `skills/repo-pruner/` is authoritative;
  `node scripts/sync-agent-skill.mjs repo-pruner --check` verifies
  `.agents/skills/repo-pruner/` and `.claude/skills/repo-pruner/`, and the
  separately approved `--apply` form synchronizes them. Codex and Cursor share
  the `.agents/skills/` discovery copy.
- **Future integration ownership:** `repo-pruner-ci-publisher` is owned by the AJ
  Digital OS Control Plane, uses `dev@audiojones.com` as technical registry
  owner, and remains `Blocked`; Audio Jones / Tyrone Alexander Nelms is the
  accountable human and sole activation authority.

These decisions close the three ratification questions. Their implementation
and evidence remain separately gated.

## 15. Ratification Checklist

- [x] Revised authority boundary accepted: evidence only; writes limited to
  `.pruner/`; no registry or source mutation.
- [x] SonarQube/SonarCloud exclusion accepted.
- [x] AJ Digital OS protected defaults reviewed by the operator, including all
  top-level dot-directories, `.dmaic/**`, `skills/**`, `config/**`,
  `graphify-out/**`, and local caches.
- [x] Backward-compatible registry extension contract accepted for a future,
  separately approved implementation.
- [x] Fail-closed registry and detector behavior accepted.
- [x] Full-graph component scanning and post-analysis diff filtering accepted.
- [x] Deterministic runner, package, sync, and v1 parity contracts accepted.
- [x] Sprint -1 output accepted as an incomplete evidence draft, never an
  automatic gate pass.
- [x] Scheduled-run and external CI publishing integration accepted as
  separately gated and `Blocked`, with ownership assigned but activation
  withheld.
- [x] P0 fixture seed and T3 assertion contracts approved; creating the fixture
  and implementing P0-P4 were separately approved and completed.
- [x] P4 core ratified after actual T6 host parity and skill-sync verification;
  non-fixture execution remains target-specific and separately approved.
