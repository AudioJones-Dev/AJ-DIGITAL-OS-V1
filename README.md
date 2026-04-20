# AJ Digital OS

## CLI Usage

AJ Digital OS includes a terminal operator layer for system monitoring, run inspection, approval workflows, execution workflows, and recovery/debugging. The CLI is designed to stay thin on top of the command layer so operators can inspect and drive the system from terminal without bypassing lifecycle controls.

### Build And Run

Build the project first so the compiled CLI is available under `dist/cli.js`.

```bash
npm run build
npm run cli:help
npm run cli:dashboard
npm run cli:console
```

Generic CLI pattern:

```bash
npm run cli -- <command> [flags]
```

### Command Groups

#### Overview

- `help`: Show available operator commands, categories, and example usage.
- `dashboard`: Show system-wide run metrics and recent activity.
- `operator-console`: Show the unified operator console with queues and summary sections.

#### Inspection

- `run-summary`: Inspect one run's lifecycle, approval state, outputs, warnings, and errors.
- `run-events`: Inspect the raw event stream for a run.
- `track-run`: Inspect both run summary and event history together.

#### Queues

- `list-pending-approvals`: Show runs awaiting human approval.
- `list-approved-runs`: Show runs ready for execution.
- `list-failed-runs`: Show failed runs needing attention.
- `list-executed-runs`: Show recently executed runs and published outputs.

#### Actions

- `approve-run`: Resolve a pending approval decision for a run.
- `execute-run`: Trigger execution for an approved run through the execution coordinator.
- `resume-run`: Resume a run through the execution resumer.

### Example Usage

```bash
npm run cli:help
npm run cli:dashboard
npm run cli:console
npm run cli -- run-summary --runId run_123
npm run cli -- run-events --runId run_123 --reverse --limit 20
npm run cli -- track-run --runId run_123 --view full
npm run cli -- list-pending-approvals --limit 10
npm run cli -- approve-run --runId run_123 --decision approve --actor Audio
npm run cli -- execute-run --runId run_123 --target local
npm run cli -- resume-run --runId run_123 --mode manual
```

### Recommended Operator Flow

1. Run `operator-console` to inspect overall system state.
2. Use `list-pending-approvals` to identify runs awaiting approval.
3. Resolve a decision with `approve-run`.
4. Use `list-approved-runs` to inspect runs ready for execution.
5. Trigger execution with `execute-run`.
6. Inspect results with `run-summary` or `track-run`.
7. Use `list-failed-runs` and `run-events` for recovery/debugging.

### JSON Mode

Many commands support `--json` for machine-readable output.

```bash
npm run cli -- dashboard --json
npm run cli -- run-summary --runId run_123 --json
npm run cli -- list-pending-approvals --json
```

Use JSON mode for scripting, debugging, and future automation integrations.

## Installable CLI

### Local linking

```bash
npm install
npm run build
npm link
aj-digital-os help
aj-digital-os dashboard
```

If you want a one-step local flow, use:

```bash
npm run link:local
```

### Direct compiled usage

```bash
npm run cli:help
npm run cli -- dashboard
npm run cli:console
```

### Direct executable note

The package includes a `bin` entry pointing to `dist/cli.js`, so after building and linking or installing the package in a way that exposes the binary, direct usage can look like this:

```bash
aj-digital-os help
```

During local development, the supported fallback remains:

```bash
npm run cli -- help
```

## Local preflight (mirrors CI)

Before opening a PR (or before pushing to `main`), run the same quality gates executed in GitHub Actions:

```bash
npm ci
npm run typecheck
npm run build
npm run test
npm run coverage
npm audit --audit-level=high
```

## Testing

Run automated tests and coverage checks:

```bash
npm run test
npm run test:watch
npm run coverage
```

Coverage thresholds are enforced in `vitest.config.ts` for core lifecycle and webhook modules.
