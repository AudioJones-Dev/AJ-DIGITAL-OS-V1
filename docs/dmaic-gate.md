# DMAIC Enforcement Gate

The DMAIC gate makes the `dmaic-coding` governance contract mechanical. One Python entrypoint runs in git hooks, CI, Claude Code, and Codex:

```sh
python tools/dmaic_gate/dmaic_gate.py --staged
```

For the authoritative local git hook, run the same full gate with the commit message file:

```sh
python tools/dmaic_gate/dmaic_gate.py --commit-msg .git/COMMIT_EDITMSG
```

For a fast advisory pre-commit check, inspect staged component status only:

```sh
python tools/dmaic_gate/dmaic_gate.py --precheck
```

For the Codex runtime Stop hook, inspect all pending worktree changes:

```sh
python tools/dmaic_gate/dmaic_gate.py --worktree --source codex-runtime
```

For CI, run the same script against a diff range:

```sh
python tools/dmaic_gate/dmaic_gate.py --range base..head
```

## What It Enforces

The gate blocks exactly three classes of change:

- Code changes without a governing `Charter: <id>` trailer.
- Improvement-mode fixes that touch non-test source but include no regression test change.
- Touched non-test paths that are ungoverned, `Blocked`, `Delete Candidate`, or `Deprecated` without a `Migration: <id>` trailer.

Bypasses are explicit and logged:

- `Charter: trivial` plus `Reason: <text>` exits successfully and records `decision: bypass`.
- `DMAIC-Skip: <reason>` exits successfully, prints a warning, and records `decision: bypass`.

## Commit Or PR Trailers

The gate reads trailers from this precedence order:

1. The `--commit-msg <path>` file, when supplied
2. `DMAIC_COMMIT_MESSAGE`
3. `DMAIC_PR_BODY`
4. `GITHUB_EVENT_PATH` pull request body
5. `.git/COMMIT_EDITMSG`

Git `pre-commit` does not receive the final commit message, so it is advisory only. The authoritative local gate is `.dmaic/hooks/commit-msg`, which receives the final message file from git and runs `--commit-msg "$1"` against the staged diff.

`.dmaic/hooks/pre-commit` runs `--precheck`, a telemetry-free staged component-status check. It can fast-fail ungoverned, `Blocked`, or `Delete Candidate` paths, but it intentionally skips charter, trailer, and regression-test checks.

## Add A Charter

Create a file under:

```txt
memory/dmaic/charters/<charter-id>.md
```

The file must include:

- `Mode: improvement` or `Mode: greenfield`
- Non-empty `## Define`, `## Measure`, and `## Analyze` sections
- At least 40 non-whitespace characters per required section

Use the commit or PR trailer:

```txt
Charter: <charter-id>
```

## Add A Component

Edit `.dmaic/components.yaml` and register the component path:

```yaml
components:
  - id: responseos-core
    paths:
      - "src/core/**"
    test_paths:
      - "tests/core/test_responseos.py"
    status: Ready for Sprint
    owner: dev@audiojones.com
```

Valid statuses are `Canonical`, `Ready for Sprint`, `Experimental`, `Needs Refactor`, `Blocked`, `Deprecated`, and `Delete Candidate`.

Greenfield mode requires a registered acceptance test file to exist for each touched component.

## Modes

`.dmaic/gate.config.yaml` controls rollout behavior:

- `enforce`: blocks with a non-zero exit code.
- `warn`: logs the would-block decision but exits zero.
- `off`: no-op pass, still logged.

If the config is missing, CI defaults to `enforce` and local runs default to `warn`.

## Telemetry

Every run appends exactly one JSON line to:

```txt
memory/dmaic/telemetry/gate-events.jsonl
```

The event records timestamp, ref, charter, mode, decision, reasons, components, and source. The source defaults to the invocation mode (`staged`, `commit-msg`, `range`, or `worktree`) unless `--source` is supplied. This file is the adoption metric for pass, block, bypass, and charter usage rates.

`--precheck` writes no telemetry. This avoids double-counting a commit that also runs the authoritative `commit-msg` hook.

## Install Git Hook

Run the installer only when you are ready to change repo-local git hook config:

```sh
sh install_dmaic_gate.sh
```

The installer is idempotent. It refuses to overwrite an existing `core.hooksPath`, `.git/hooks/pre-commit`, or `.git/hooks/commit-msg`.

## Claude Code And Codex Runtime Wiring

Use the same command in runtime hook configuration:

```sh
python tools/dmaic_gate/dmaic_gate.py --worktree --source codex-runtime
```

If the runtime can pass the pending commit or task message, set:

```sh
DMAIC_COMMIT_MESSAGE="<message with trailers>"
```

Do not fork the gate logic per runtime. One script is the contract.

## Codex Runtime Hook

Codex 0.138.0 uses repo-local hook configuration at:

```txt
.codex/hooks.json
```

The runtime hook uses Codex's `Stop` event, which fires at the agent turn boundary. It runs:

```sh
python tools/dmaic_gate/dmaic_gate.py --worktree --source codex-runtime
```

`--worktree` evaluates the union of staged files, unstaged tracked files, and new untracked files that are not ignored. New untracked files outside every registered component path are treated as scratch and ignored; tracked edits are always enforced, including ungoverned tracked paths.

Set `DMAIC_COMMIT_MESSAGE` in the Codex runtime environment when the intended task or commit message is available. If it is unset, the gate follows `.dmaic/gate.config.yaml`: `enforce` blocks on a missing `Charter:` trailer and `warn` records the would-block decision without stopping the runtime.

`commit-msg` remains the authoritative per-commit decision. `codex-runtime` telemetry is an early-catch signal and can be deduplicated by preferring `commit-msg` over `codex-runtime` for the same ref.
