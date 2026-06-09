# AJ Digital OS Agent Handoff Protocol

## Purpose

This protocol makes agent-to-agent and agent-to-human handoffs auditable. Use it when ending a task, switching tools, preparing a prompt for another assistant, or pausing before approval.

## Standard Handoff Header

```txt
Review/Diagnosis owner:
Actionable AI Assistant Task owner:
Execution location/tool:
Human/operator role:
Copy/paste destination:
```

## Required Output Format

Use this structure for repo work, coding tasks, docs/config changes, deployment preparation, automation work, and agent workflow changes.

### 1. Review / Diagnosis

State:

- Current repo/branch state.
- What was inspected.
- Facts.
- Inferences.
- Assumptions.
- Risks.
- Blockers.

### 2. Decision

State the recommended next move and decision label:

- `Proceed`
- `Pause`
- `Blocked`
- `Requires human approval`
- `Requires credentials/access`
- `Requires real local execution`
- `Merge`
- `Do not merge`

### 3. Human / Operator Step

List only what the human must do. Do not bury operator actions in general notes.

Examples:

- Say `proceed` to approve the next gated action.
- Provide missing credentials through the approved secret channel.
- Review the diff before merge.
- Run a production-only verification step.

### 4. Actionable AI Assistant Task

Provide a copy/paste-ready task for the next agent or tool.

Include:

- Working directory.
- Allowed scope.
- Explicit out-of-scope items.
- Approval gates.
- Validation requirements.
- Final response format.

### 5. Files Changed

List every file created, updated, or deleted. If no files changed, say so.

### 6. Validation Performed

List:

- Commands run.
- Results.
- Commands intentionally not run.
- Reason skipped commands were not run.

### 7. Risks / Limitations

Name remaining uncertainty clearly.

Examples:

- Branch is divergent.
- Validation was docs-only.
- Runtime services were not started.
- External access was not verified.
- Generated files remain untracked and untouched.

### 8. Next Prompt If Needed

When useful, include a next prompt that can be pasted into Codex, ChatGPT, Copilot, Claude, or another tool.

## Handoff Rules

- Keep handoffs specific enough for execution.
- Do not mix facts and assumptions.
- Do not imply approval was granted if it was not.
- Do not claim merge or deploy readiness without the required checks.
- Do not include secrets or hidden values.
- Include branch and validation state for repo work.
