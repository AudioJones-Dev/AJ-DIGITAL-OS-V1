# AJ Digital OS Implementation Gates

Use these gates for repo work, docs work, automation changes, dashboard work, runtime changes, and deployment preparation.

## Gate 0: Diagnosis

Confirm the current state before implementation:

- Current working directory.
- Branch and divergence state.
- Tracked and untracked changes.
- Relevant existing docs, code, scripts, and config.
- Protected surfaces affected.
- Facts, inferences, assumptions, risks, and blockers.

Output decision: `Proceed`, `Pause`, or `Blocked`.

## Gate 1: Scope Declaration

Declare:

- Files to create.
- Files to update.
- Files to leave untouched.
- Commands planned.
- Commands explicitly avoided.
- Any approval gates triggered.

Output decision: `Proceed`, `Pause`, or `Requires human approval`.

## Gate 2: Plan

Provide the smallest plan that can satisfy the request safely.

Include:

- Problem.
- Desired outcome.
- Success criteria.
- Implementation steps.
- Validation steps.
- Risks and rollback notes.

Output decision: `Proceed`, `Pause`, or `Blocked`.

## Gate 3: Approval Where Needed

Stop for approval when the plan includes:

- Merge.
- Rebase.
- Push.
- Deploy.
- Destructive action.
- Secret work.
- Runtime/core logic changes.
- Global config or hook installation.
- Dependency or lockfile changes.
- Mass edits or repo-wide refactors.

Accepted approval word: `proceed`.

Output decision: `Requires human approval`, `Requires credentials/access`, or `Proceed`.

## Gate 4: Implementation

Implement only the approved scope. If new facts require scope expansion, pause and report before continuing.

Implementation rules:

- Preserve existing conventions.
- Do not stage unrelated files.
- Do not modify generated/runtime artifacts unless approved.
- Do not silently overwrite user or agent work.
- Keep changes reversible when possible.

Output decision: `Proceed`, `Pause`, or `Blocked`.

## Gate 5: Validation

Run the safest validation that matches the change.

For docs/config-only changes:

- `git status --short`.
- `git diff --name-only`.
- `git diff --check`.
- Repo-local docs/config checks if defined.

For app/runtime changes, use `.codex/validation.json` to identify applicable commands.

Report:

- Commands run.
- Pass/fail result.
- Commands not run and why.
- Known residual risk.

Output decision: `Proceed`, `Requires real local execution`, or `Blocked`.

## Gate 6: Handoff

End with a handoff that another operator or agent can continue from safely.

Include:

- What changed.
- Why it changed.
- Validation performed.
- Risks and limitations.
- Untracked files intentionally left alone.
- Next action and whether it needs approval.

Output decision: `Merge`, `Do not merge`, `Proceed`, `Pause`, or `Blocked`.

## Decision Labels

- `Proceed`: Safe to continue within approved scope.
- `Pause`: Stop before more work; context or direction changed.
- `Blocked`: Cannot continue without missing information, access, or a resolved conflict.
- `Requires human approval`: Human must explicitly approve before action.
- `Requires credentials/access`: Work needs credentials, secrets, login, or external access.
- `Requires real local execution`: Claims require local runtime, browser, service, or production-like execution.
- `Merge`: Changes are ready for merge review, subject to branch policy.
- `Do not merge`: Changes are incomplete, risky, unvalidated, or blocked.
