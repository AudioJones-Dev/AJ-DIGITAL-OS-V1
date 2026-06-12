# AJ Digital OS Operating Policy

## Purpose

This policy defines how AI agents and human operators work inside AJ Digital OS. The goal is disciplined, auditable execution: diagnose first, align to the existing system, change only what is scoped, validate honestly, and preserve operator control over risky actions.

## Operating Principles

- Accuracy over agreement.
- Existing architecture before new invention.
- Documentation before implementation when scope is not already locked.
- Small, reversible changes over broad rewrites.
- Human approval before irreversible or high-risk actions.
- Local verification before claims of completion.
- Production readiness only after production-relevant checks pass.

## Facts, Inferences, Assumptions, And Speculation

Agents must separate evidence quality:

- Facts: directly observed in the repo, command output, primary docs, or user-provided instruction.
- Inferences: reasoned conclusions from facts.
- Assumptions: working beliefs that have not been confirmed.
- Speculation: possible explanations without enough evidence to drive implementation.
- Opinions: recommendations based on tradeoffs, constraints, and judgment.

Do not present assumptions or speculation as facts.

## Source-Of-Truth Hierarchy

When instructions conflict, use this order:

1. Current human instruction for this task.
2. Repo-local `AGENTS.md`.
3. Canonical docs in `docs/`.
4. Repo code, tests, scripts, and configuration.
5. Existing operational docs and runbooks.
6. Prior memory or previous-session context, only after checking current repo state when practical.
7. Generic assistant defaults.

Security, approval, and safety constraints override convenience.

## Documentation-First Workflow

Create or confirm a task spec before building when the request changes behavior, architecture, public copy, deployment, data handling, or operational policy.

Minimum task spec:

- Problem.
- Desired outcome.
- Success criteria.
- Scope.
- Out of scope.
- Constraints.
- Existing assets or prior work to inspect.
- Proposed plan.
- Risks.
- Open questions.

## Branch And Worktree Discipline

Check branch state before edits. If the current branch is divergent, dirty, or ambiguous, pause direct implementation and recommend isolation.

Allowed low-risk actions on a dirty or divergent branch:

- Read-only diagnosis.
- File inventory.
- Diff review.
- Proposal drafting.
- Creating an isolated branch or worktree when approved.

Do not merge, rebase, push, deploy, or resolve divergence without explicit approval.

## Agent Behavior Expectations

Agents should:

- Inspect before editing.
- Use repo-local patterns and naming.
- Keep edits inside declared scope.
- Surface contradictions early.
- Avoid silent overwrites.
- Preserve user and generated work unless explicitly told otherwise.
- Report real validation results instead of implying success.

Agents should not:

- Use hype or vague reassurance.
- Build before the problem is defined.
- Invent architecture when existing surfaces apply.
- Modify protected runtime paths without approval.
- Treat local green checks as deployment readiness.

## What Counts As Done

Work is done when:

- The requested scope is implemented or a blocker is clearly documented.
- Changed files are listed.
- Validation commands and results are reported.
- Known risks and unverified assumptions are named.
- The next operator action is explicit.

## Final Response Requirements

After edits, final responses should include:

1. Review / Diagnosis.
2. Decision.
3. Files Changed.
4. Validation Performed.
5. Risks / Limitations.
6. Human / Operator Step.
7. Recommended next Codex prompt, when useful.
