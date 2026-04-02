# AJ Digital OS Recovery Playbook

## 1. Purpose

This document is the recovery and incident response manual for AJ Digital OS. Use it when a run fails, stalls, gets denied, or behaves unexpectedly.

It complements the operator playbook. The operator playbook covers normal daily use. This document covers what to do when the normal path breaks.

## 2. Failure Categories

### `validation_failed`

- The run failed before approval or execution.
- Validation blocked the workflow output.
- This is usually an upstream content, schema, or workflow-output problem.

### `pending_approval_stuck`

- The run is still waiting in `pending_approval` longer than expected.
- No human decision has been recorded yet.
- This is usually an operations backlog, not an execution problem.

### `approval_rejected`

- The run was intentionally rejected.
- It should not proceed to execution.
- Recovery usually means revising upstream work, not resuming the same run.

### `execution_denied`

- Execution was blocked by policy or state validation.
- The run was not allowed to move forward.
- This usually means the run is not in a valid executable state.

### `execution_skipped`

- A resume or execution attempt completed without actually executing.
- The system decided the run should not continue from the current state.
- This requires inspection before any further action.

### `execution_failed`

- Execution started but did not complete successfully.
- The run may have partial output, warnings, errors, or incomplete artifacts.
- This is the main recovery scenario that requires careful inspection.

### `partial_execution`

- Some artifacts were written, but the overall run did not complete cleanly.
- The run may look partially successful while still being operationally incomplete.
- Treat this as a special case of execution failure.

### `unknown_state`

- The run status, event trail, or output does not clearly match a known path.
- This can happen when the run record and event history do not tell a clean story.
- Recovery starts with inspection, not action.

## 3. Triage Workflow

Use this diagnostic flow every time:

```text
1. Identify run
2. Inspect summary
3. Inspect events
4. Classify failure type
5. Choose recovery path
6. Execute recovery action
7. Verify outcome
```

Core inspection commands:

```bash
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
npm run cli -- track-run --runId <id> --view full
```

Triage rules:

1. Start with `run-summary` for state, warnings, and outputs.
2. Use `run-events` when ordering or transition timing matters.
3. Use `track-run --view full` when you want both in one pass.
4. Do not resume or execute anything until you can classify the failure type.

## 4. Failure Scenarios and Recovery Paths

### Scenario: `validation_failed`

**Symptoms**
- Appears in the failed queue.
- Status is `validation_failed`.
- No execution events.

**Diagnosis**
- Inspect `run-summary`.
- Confirm the run failed before approval or execution.
- Review warnings, errors, and recent events.

**Recovery**
- Do not resume.
- Fix the upstream workflow input or generation logic.
- Re-run through the upstream workflow trigger path.

**Commands**
```bash
npm run cli:failed
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
```

### Scenario: `pending_approval_stuck`

**Symptoms**
- Run stays in `pending_approval`.
- Appears in pending approvals for longer than expected.
- No approval decision event yet.

**Diagnosis**
- Confirm the run is actually awaiting a human decision.
- Inspect the summary and recent events.
- Check whether the approval request was recorded.

**Recovery**
- Do not use `resume-run`.
- Resolve the approval intentionally.
- If the output is not acceptable, reject or request revision instead of forcing execution.

**Commands**
```bash
npm run cli:pending
npm run cli -- run-summary --runId <id>
npm run cli -- approve-run --runId <id> --decision approve --actor Audio
```

### Scenario: `approval_rejected`

**Symptoms**
- Approval status is `rejected`.
- Run does not move to execution.
- Events show a rejection decision.

**Diagnosis**
- Confirm the rejection was intentional.
- Review the summary and event trail if context is unclear.

**Recovery**
- Do not resume.
- Do not execute.
- Revise upstream work and create a new run through the normal workflow path.

**Commands**
```bash
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
```

### Scenario: `execution_denied`

**Symptoms**
- Execution attempt returns denied.
- Run does not transition into a completed execution path.
- Policy or state gate blocked the action.

**Diagnosis**
- Inspect summary and events.
- Confirm the run status and approval state.
- Verify the run is actually approved and eligible for execution.

**Recovery**
- Do not keep retrying the same command blindly.
- Fix the underlying state or input problem first.
- If the run is not approved, return to the approval flow.

**Commands**
```bash
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
npm run cli:approved
```

### Scenario: `execution_skipped`

**Symptoms**
- Resume or execution path returns skipped.
- No new artifacts are written.
- The run remains in a non-executed state.

**Diagnosis**
- Inspect summary and event history.
- Confirm whether the resumer found the run non-resumable.
- Check whether the state is already terminal or otherwise blocked.

**Recovery**
- Do not assume skipped means safe to retry immediately.
- Inspect why the system skipped the run.
- If the run is approved but not executed, use the normal execution path.
- If the run is not resumable, stop and correct the state or upstream cause.

**Commands**
```bash
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
npm run cli -- resume-run --runId <id> --mode manual
```

### Scenario: `execution_failed`

**Symptoms**
- Appears in failed runs.
- Event history shows execution started but not cleanly completed.
- Warnings or errors indicate a publishing or execution problem.

**Diagnosis**
- Inspect summary first.
- Inspect recent events in reverse order.
- Look for artifact writes, execution start, and failure indicators.

**Recovery**
- Treat as a manual recovery case.
- Inspect before resuming.
- Resume only if the run is actually resumable and the failure cause is understood.
- If the cause is unclear or upstream, prefer a new run rather than repeated resume attempts.

**Commands**
```bash
npm run cli:failed
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
npm run cli -- resume-run --runId <id> --mode manual
```

### Scenario: `partial_execution`

**Symptoms**
- Some files exist in output.
- Event history shows artifact writes.
- The run still failed or did not complete cleanly.

**Diagnosis**
- Inspect summary for published path and file list.
- Inspect events to see how far execution got.
- Confirm whether output is incomplete or stale.

**Recovery**
- Do not overwrite artifacts manually as a first move.
- Treat partial output as evidence, not success.
- Resume only after you understand what failed.
- If the run cannot safely continue, prefer a clean new run from upstream.

**Commands**
```bash
npm run cli -- run-summary --runId <id>
npm run cli -- run-events --runId <id> --reverse --limit 20
npm run cli -- track-run --runId <id> --view full
```

## 5. Resume vs Re-Run Decision Guide

| Situation | Resume? | Re-run? | Notes |
| --- | --- | --- | --- |
| `validation_failed` | No | Yes | Fix input or workflow output first. |
| approved but not executed | Yes | No | Safe path if the run is still approved. |
| `execution_failed` | Maybe | Yes | Resume only after inspection. |
| `execution_skipped` | Maybe | No | Check policy and current state first. |
| `execution_denied` | No | No | Fix policy, state, or inputs first. |
| `approval_rejected` | No | Yes | New run after revision, not resume. |
| `pending_approval_stuck` | No | No | Resolve approval instead. |
| `partial_execution` | Maybe | Yes | Inspect artifacts before choosing. |

Use this table as a guardrail, not as permission to skip inspection.

## 6. Command-Based Recovery Flows

### Investigate Failure

```bash
npm run cli:failed
npm run cli -- track-run --runId <id> --view full
```

### Inspect Recent Failure Events

```bash
npm run cli -- run-events --runId <id> --reverse --limit 20
```

### Resume Safe Run

```bash
npm run cli -- resume-run --runId <id> --mode manual
```

### Execute Approved But Idle Run

```bash
npm run cli:approved
npm run cli -- execute-run --runId <id> --target local
```

### Re-Run Workflow

Re-running is an upstream workflow concern. The current CLI does not create new runs directly. If a run must be re-generated, trigger that from the upstream workflow path rather than trying to force the failed run forward.

## 7. Anti-Patterns (What NOT to Do)

- Do not blindly resume failed runs.
- Do not execute without approval.
- Do not ignore validation failures.
- Do not assume skipped means safe to retry.
- Do not debug without checking events.
- Do not overwrite output artifacts manually as your first recovery move.
- Do not treat rejection as a temporary error.
- Do not keep retrying denied execution without understanding why it was denied.

## 8. Troubleshooting Matrix

| Symptom | Likely Cause | Action |
| --- | --- | --- |
| run not found | bad `runId` or missing record | verify the run ID and inspect dashboard queues |
| no events | run never progressed far enough to emit them | inspect summary and queue state |
| stuck in pending | approval missing | inspect summary, then use `approve-run` |
| resume does nothing | policy skip or non-resumable state | inspect summary and events before retrying |
| execution denied | policy or state failure | confirm approval state and inspect recent events |
| files missing | execution or publish path failed | inspect summary, events, and failed queue |
| approved queue empty | nothing ready to execute | inspect pending approvals or executed runs |
| failed queue empty | no active failures | inspect executed runs or dashboard instead |
