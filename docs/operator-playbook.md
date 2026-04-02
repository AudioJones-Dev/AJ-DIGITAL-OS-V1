# AJ Digital OS Operator Playbook

## 1. Purpose

This playbook is the human operations manual for running AJ Digital OS from terminal. Use it to monitor system state, inspect runs, resolve approvals, execute approved work, investigate failures, and recover safely when something goes wrong.

The focus here is operations, not architecture. Every workflow in this document is aligned to the current local-first CLI surface.

## 2. Core Operating Model

AJ Digital OS moves work through a controlled lifecycle:

```text
workflow created
-> validated
-> approval requested
-> approved/rejected/revision requested
-> execution coordinated
-> published locally
-> tracked and summarized
```

From an operator perspective, the system breaks down into four jobs:

- Overview: understand current system state and queue pressure.
- Inspection: inspect one run in detail before acting.
- Action: approve, execute, or resume when the system state supports it.
- Recovery: inspect failures, confirm resumability, and move carefully.

The normal operating pattern is simple: inspect first, act second, verify after execution.

## 3. Daily Workflow

A normal daily routine should look like this:

1. Open the unified overview.
2. Review pending approvals.
3. Resolve approvals that are ready.
4. Review approved runs waiting for execution.
5. Execute approved runs.
6. Review recently executed outputs.
7. Investigate failures if anything needs attention.

Example daily sequence:

```bash
npm run cli:console
npm run cli:pending
npm run cli:approved
npm run cli:executed
npm run cli:failed
```

If the console shows work in motion, drop into the run-specific inspection commands before taking action.

## 4. Approval Handling

The approval queue is the main human-in-the-loop checkpoint. Work should not move into execution until it has been intentionally approved.

Use the queue command first:

```bash
npm run cli:pending
```

Resolve an approval decision with `approve-run`:

```bash
npm run cli -- approve-run --runId run_123 --decision approve --actor Audio
npm run cli -- approve-run --runId run_124 --decision reject --actor Audio
npm run cli -- approve-run --runId run_125 --decision request_revision --actor Audio
```

Use these decision rules:

- Approve: the run output is acceptable and ready to move toward execution.
- Reject: the run should stop and not proceed.
- Request revision: the run needs changes before it is acceptable.

If you are uncertain, inspect first:

```bash
npm run cli -- run-summary --runId run_123
npm run cli -- run-events --runId run_123 --reverse --limit 20
```

## 5. Execution Workflow

Approved runs are eligible for execution. The command layer separates execution from approval so you can verify the queue before acting.

List runs ready for execution:

```bash
npm run cli:approved
```

Execute an approved run:

```bash
npm run cli -- execute-run --runId run_123 --target local
```

Resume a run through the execution resumer:

```bash
npm run cli -- resume-run --runId run_123 --mode manual
```

Use these action rules:

- Execute: use this for the normal path when a run is approved and ready to publish locally.
- Resume: use this when a run has already entered a recovery path and you want the resumer to decide whether it can continue.

After execution, verify output:

```bash
npm run cli -- run-summary --runId run_123
npm run cli:executed
```

## 6. Inspection And Debugging

Use the inspection commands whenever you need context before taking action.

Run summary gives you the current state, approval metadata, output metadata, warnings, errors, and event count.

```bash
npm run cli -- run-summary --runId run_123
```

Run events gives you the raw event stream and ordering.

```bash
npm run cli -- run-events --runId run_123 --reverse --limit 20
```

Track run gives you summary and events together.

```bash
npm run cli -- track-run --runId run_123 --view full
```

Dashboard gives you system-wide metrics and recent activity.

```bash
npm run cli:dashboard
```

Use these inspection rules:

- Summary: use when you need the current state quickly.
- Events: use when sequencing, transitions, or timing matters.
- Full tracking: use when you want both without switching commands.
- Dashboard: use when you want queue health and system-level status.

## 7. Recovery And Resume Workflow

When something goes wrong, do not jump directly to retry behavior. Inspect first, then decide whether resume is appropriate.

Recommended recovery flow:

1. List failed runs.
2. Inspect the run summary.
3. Inspect recent events.
4. Decide whether the run is actually resumable.
5. Resume only when the current run state and policy make that safe.

Recovery sequence:

```bash
npm run cli:failed
npm run cli -- run-summary --runId run_456
npm run cli -- run-events --runId run_456 --reverse --limit 20
npm run cli -- resume-run --runId run_456 --mode manual
```

Use this guidance for common cases:

- Failed run: inspect summary and events before deciding anything.
- Approved but not executed: check the approved queue, then execute normally.
- Execution skipped: inspect summary and events to understand why the resumer declined action.
- Execution denied: inspect state and policy indicators before trying again.
- Run needs closer inspection: use `track-run --view full`.

Do not assume that a failed or skipped run can be resumed safely. The resumer and execution policy are there to prevent unsafe transitions.

## 8. Common Command Sequences

### Morning Review

```bash
npm run cli:console
npm run cli:pending
npm run cli:approved
npm run cli:failed
```

### Approve And Execute One Run

```bash
npm run cli -- approve-run --runId run_123 --decision approve --actor Audio
npm run cli -- execute-run --runId run_123 --target local
npm run cli -- run-summary --runId run_123
```

### Investigate A Failed Run

```bash
npm run cli:failed
npm run cli -- track-run --runId run_456 --view full
npm run cli -- run-events --runId run_456 --reverse --limit 20
```

### Review Recent Execution Output

```bash
npm run cli:executed
npm run cli -- run-summary --runId run_789
```

### Inspect A Single Run Before Approval

```bash
npm run cli -- run-summary --runId run_123
npm run cli -- run-events --runId run_123 --reverse --limit 20
```

## 9. Safety Rules

- Inspect before executing when you are unsure.
- Approve intentionally. Approval is the human control point.
- Use `run-summary` or `run-events` before resuming failed work.
- Prefer JSON mode only for scripting, debugging, or automation handoff.
- Treat executed output as auditable artifacts.
- Do not assume a failed run is resumable without inspection.
- Prefer the queue commands before taking action so you are acting on current state.
- Verify execution results after publishing locally.

## 10. Troubleshooting

### No Runs Found

Use the overview commands first:

```bash
npm run cli:console
npm run cli:dashboard
```

If both show no runs, there may simply be no persisted run records yet.

### No Pending Approvals

This means there is nothing waiting for a human decision right now.

```bash
npm run cli:pending
npm run cli:approved
```

If approved runs exist, move on to execution.

### Approved Queue Empty

If the approved queue is empty, either nothing has been approved yet or approved runs have already moved forward.

```bash
npm run cli:approved
npm run cli:pending
```

### Failed Queue Empty

That is a healthy state. Confirm recent completions instead:

```bash
npm run cli:failed
npm run cli:executed
```

### Run Not Found

Re-check the run ID and inspect the broader queues to confirm the run exists.

```bash
npm run cli:dashboard
npm run cli -- run-summary --runId run_123
```

### Resume Does Nothing Or Returns Skipped

Inspect the run before trying again:

```bash
npm run cli -- run-summary --runId run_123
npm run cli -- run-events --runId run_123 --reverse --limit 20
```

A skipped result usually means the run is not in a resumable state.

### Unknown Command

Use the help command to see the supported command surface:

```bash
npm run cli:help
```

### JSON Mode Confusion

Use JSON mode only when you need machine-readable output for scripting or deeper debugging.

```bash
npm run cli -- dashboard --json
npm run cli -- run-summary --runId run_123 --json
```

If you are doing normal operations work, prefer the human-readable mode.
