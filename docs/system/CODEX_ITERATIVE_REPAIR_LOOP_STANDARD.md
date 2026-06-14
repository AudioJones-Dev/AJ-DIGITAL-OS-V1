# AJ Digital OS - Codex Iterative Repair Loop Standard
**Version:** 1.0
**Updated:** 2026-06-09
**Owner:** AJ Digital LLC
**Status:** Draft standard
**Scope:** Documentation, governance artifacts, prompts, architecture specs, and repo-safe validation loops

---

## 1. Purpose

AJ Digital OS uses Codex iterative repair loops to make agent-assisted maintenance more reliable, auditable, and bounded.

The standard loop is:

Review -> Repair -> Validate -> Repeat -> Stop

This pattern exists because one-pass agent work is often incomplete. A single review can miss gaps, a single patch can overfit the wrong issue, and a single validation claim can become unsafe if it is not tied to actual checks. Iterative repair loops separate judgment from proof by forcing each pass to produce findings, scoped changes, validation results, and a remaining delta before continuing.

AJ Digital OS uses this loop to:

- reduce one-pass agent failure
- separate judgment from proof
- create auditable repair trails
- make Codex safer for docs, hooks, prompts, and architecture maintenance
- preserve operator approval over scope expansion, credentials, destructive work, and subjective decisions

This standard is documentation-only. It does not install hooks, create automation, modify runtime code, or change approval behavior.

---

## 2. Core Loop

### 2.1 Review

Review is inspect-only. Codex reads the target artifact, relevant source-of-truth documents, current repo state, and applicable constraints.

Rules:

- No edits during review.
- Separate facts, inferences, assumptions, risks, and blockers.
- Identify source-of-truth conflicts before repair.
- Declare proposed file scope before changing anything.
- Stop if the target is vague, contradictory, protected, secret-bearing, or outside approved scope.

Output:

- review findings
- proposed repair scope
- validation plan
- approval gates, if any

### 2.2 Repair

Repair is the focused edit pass. Codex changes only the approved artifact or declared file scope.

Rules:

- Use the smallest patch that resolves the reviewed delta.
- Preserve existing naming, architecture, and documentation conventions.
- Prefer copied artifacts or scoped patches for experimental repair.
- Do not modify runtime code, hooks, package files, secrets, generated state, protected branches, or global tool settings unless explicitly approved.
- If a new finding requires broader scope, pause and request approval before expanding.

Output:

- repair summary
- files changed
- rationale for each change group
- unchanged issues that remain out of scope

### 2.3 Validate

Validate proves or falsifies the repair. Validation must be concrete: command output, structured checks, source-of-truth comparison, or explicit human review.

Rules:

- Do not claim validation passed unless checks were actually run.
- Use the smallest validation set that matches the change.
- For docs-only work, prefer status, diff, diff check, required-section checks, link checks, and doctrine consistency checks.
- For runtime or app work, only run test, typecheck, or build commands when the approved scope and repo validation registry call for them.
- Report skipped validation and the reason it was skipped.

Output:

- validation result
- pass/fail status for each check
- evidence summary
- remaining delta

### 2.4 Repeat

Repeat uses the validation delta as the next review input. Each iteration should reduce the delta or produce a clear reason why it cannot.

Rules:

- Do not repeat blindly.
- Compare current delta against the previous iteration.
- Stop if the remaining delta is unchanged across two passes.
- Stop if the next repair would exceed approved scope.
- Keep an audit record for every pass.

Output:

- iteration number
- delta changed or unchanged
- next repair plan or stop reason

### 2.5 Stop

Stop ends the loop with a final handoff.

Valid stop reasons:

- all validation cases pass
- max iterations reached
- remaining delta unchanged across two passes
- repair would exceed approved scope
- repair requires credentials, client data, or a business decision
- validation is subjective and needs human review
- human approval is required before the next action

Output:

- final handoff
- files changed
- validation performed
- remaining risks
- operator decision required

---

## 3. Required Structured Outputs

Each loop pass should produce JSON-like records. These records may be kept in chat, in a future repair-run folder, or in another approved audit surface. Do not create audit files unless that is part of the approved scope.

### 3.1 Review Findings

```json
{
  "artifact": "docs/system/example.md",
  "iteration": 1,
  "mode": "review",
  "inspected": [
    "target artifact",
    "repo policy docs",
    "source-of-truth references"
  ],
  "facts": [
    "Directly observed condition."
  ],
  "inferences": [
    "Reasoned conclusion based on observed facts."
  ],
  "assumptions": [
    "Working belief that still needs confirmation."
  ],
  "risks": [
    "Risk if repair proceeds."
  ],
  "blockers": [
    "Blocking issue, or empty array if none."
  ],
  "proposed_scope": [
    "files allowed for this repair pass"
  ],
  "approval_required": false
}
```

### 3.2 Repair Summary

```json
{
  "artifact": "docs/system/example.md",
  "iteration": 1,
  "mode": "repair",
  "files_changed": [
    "docs/system/example.md"
  ],
  "changes": [
    {
      "area": "required sections",
      "summary": "Added missing stop conditions and validation gates.",
      "reason": "Required by the approved task spec."
    }
  ],
  "out_of_scope_preserved": [
    "No runtime code changed.",
    "No hooks created or modified."
  ],
  "new_scope_needed": false
}
```

### 3.3 Validation Result

```json
{
  "artifact": "docs/system/example.md",
  "iteration": 1,
  "mode": "validate",
  "checks": [
    {
      "name": "git diff --check",
      "type": "command",
      "status": "pass",
      "evidence": "No whitespace errors reported."
    },
    {
      "name": "required section check",
      "type": "structured_review",
      "status": "pass",
      "evidence": "All required headings are present."
    }
  ],
  "skipped_checks": [
    {
      "name": "npm test",
      "reason": "Docs-only change; runtime tests are not relevant."
    }
  ],
  "overall_status": "pass",
  "remaining_delta": []
}
```

### 3.4 Remaining Delta

```json
{
  "artifact": "docs/system/example.md",
  "iteration": 1,
  "mode": "delta",
  "remaining_delta": [
    {
      "issue": "Subjective doctrine conflict needs operator review.",
      "severity": "medium",
      "next_action": "human_review",
      "approval_required": true
    }
  ],
  "delta_changed_from_previous_iteration": true,
  "continue_loop": false,
  "stop_reason": "human approval required"
}
```

### 3.5 Final Handoff

```json
{
  "artifact": "docs/system/example.md",
  "mode": "final_handoff",
  "iterations_completed": 2,
  "stop_reason": "all validation cases pass",
  "files_changed": [
    "docs/system/example.md"
  ],
  "validation_performed": [
    "git status --short",
    "git diff --name-only",
    "git diff --check",
    "required section check"
  ],
  "validation_not_run": [
    {
      "name": "npm test",
      "reason": "Docs-only change."
    }
  ],
  "remaining_risks": [
    "No automated markdown lint script exists in this repo."
  ],
  "operator_step": "Review diff and decide whether to promote to doctrine."
}
```

---

## 4. AJ Digital OS Artifact Targets

High-value targets for iterative repair loops:

- DOX standards
- `AGENTS.md` files
- Codex hooks documentation
- repo governance docs
- memory standards
- Obsidian / Graphify standards
- architecture specs
- prompt libraries
- client portal specs
- automation playbooks

Repair loops are most valuable when the artifact is important enough to require consistency, but bounded enough that Codex can validate changes without touching runtime or production systems.

---

## 5. Validation Methods

Use the smallest validation method that can prove the repair.

### 5.1 Markdown Lint / Link Check

Use when the artifact is Markdown or documentation.

Examples:

- Markdown lint, when a repo-local lint command exists.
- Link check, when the document contains internal or external links.
- Heading structure review, when no lint command exists.

### 5.2 Grep-Based Required Section Checks

Use when the artifact must include specific sections, clauses, labels, or safety language.

Examples:

- Confirm required headings are present.
- Confirm approval language exists.
- Confirm forbidden actions are listed.
- Confirm final handoff fields are present.

### 5.3 No-Secret Scan

Use when a repair touches docs, examples, prompts, env guidance, client workflows, or integration references.

Examples:

- Search changed files for obvious token markers.
- Confirm no `.env` file contents were read or copied.
- Confirm only variable names or placeholders appear.

### 5.4 File-Scope Check

Use for every repair loop.

Examples:

- `git status --short`
- `git diff --name-only`
- comparison against declared scope

### 5.5 Doctrine Consistency Check

Use when the artifact affects repo behavior, agent behavior, governance, architecture, safety, or handoff standards.

Examples:

- Compare against `AGENTS.md`.
- Compare against `docs/OPERATING_POLICY.md`.
- Compare against `docs/REPO_SAFETY_POLICY.md`.
- Compare against `docs/IMPLEMENTATION_GATES.md`.
- Compare against `docs/AGENT_HANDOFF_PROTOCOL.md`.

### 5.6 Source-Of-Truth Check

Use when an artifact summarizes another standard, architecture spec, or operational runbook.

Examples:

- Confirm the target does not contradict canonical policy docs.
- Confirm current repo files exist before referencing them as active sources.
- Distinguish proposed future layout from created files.

### 5.7 Human Approval Gate

Use when validation cannot be objective or when the repair crosses an approval boundary.

Examples:

- Business positioning decision.
- Public copy change.
- Secret or credential work.
- Hook activation.
- Protected runtime surface.
- Merge, rebase, push, deploy, release, or destructive action.

### 5.8 Optional Test / Typecheck / Build

Use only when relevant to the approved scope.

Examples:

- Typecheck for TypeScript source changes.
- Tests for runtime behavior changes.
- Build for app, dashboard, or release-impacting changes.

Do not run installs or change package files just to make optional validation available.

---

## 6. Stop Conditions

Stop the repair loop when any of these conditions is true:

- all validation cases pass
- max iterations reached
- remaining delta unchanged across two passes
- repair would exceed approved scope
- repair requires credentials or business decision
- validation is subjective and needs human review
- next action requires merge, rebase, push, deploy, release, destructive work, secret work, protected runtime modification, package changes, hook activation, or global tool configuration

The loop should stop with an explicit handoff rather than silently continuing into a higher-risk action.

---

## 7. Safety Rules

Codex repair loops must follow these safety rules:

- never self-expand permissions
- never modify secrets
- never read secret files for values
- never bypass hooks
- never mutate protected branches
- never claim validation passed unless checks were actually run
- keep an audit trail for every pass
- prefer copied artifacts or scoped patches for experimental repair
- never modify runtime state, generated logs, snapshots, caches, or JSONL artifacts unless explicitly approved
- never modify Hermes core logic, model-router logic, BEL/runtime execution logic, MCP policy, approval enforcement, attribution behavior, or existing API routes without explicit approval
- never run installs, package updates, lockfile changes, merge, rebase, push, deploy, release, or destructive commands without explicit approval
- distinguish facts, inferences, assumptions, speculation, and opinions in review and handoff records

---

## 8. Recommended Folder Layout

The following layout is proposed for future automation or manual audit trails. This standard does not create these folders.

```text
.codex/repair-runs/
.codex/repair-runs/<artifact>/<iteration>/record.json
.codex/repair-runs/<artifact>/<iteration>/review.json
.codex/repair-runs/<artifact>/<iteration>/repair.json
.codex/repair-runs/<artifact>/<iteration>/validation.json
```

Recommended record roles:

- `record.json`: iteration metadata, artifact identity, timestamps, stop reason, and operator approval references
- `review.json`: inspect-only findings and proposed scope
- `repair.json`: scoped edits and rationale
- `validation.json`: checks run, evidence, skipped checks, and remaining delta

Folder creation, automation, and hook integration require a separate approved task.

---

## 9. Copy/Paste Prompt Template

```txt
You are operating inside the AJ-DIGITAL-OS repository.

Task: Run a Codex iterative repair loop on this artifact:
<artifact path>

Goal:
Review, repair, validate, and repeat until validation passes, max attempts are reached, the remaining delta stops improving, or human approval is required.

Constraints:
- Start in diagnosis mode.
- Review first; do not edit during review.
- Declare file scope before edits.
- Keep changes limited to the approved artifact unless a new finding requires explicit scope approval.
- Do not modify runtime code, package files, hooks, secrets, env files, generated state, protected runtime surfaces, or global tool settings.
- Do not run installs.
- Do not merge, rebase, push, deploy, release, or commit.
- Stop and ask for `proceed` before any approval-gated action.

Required loop:
1. Review: inspect the artifact and relevant source-of-truth docs.
2. Repair: make the smallest scoped patch.
3. Validate: run concrete checks or structured review.
4. Repeat: use remaining validation delta as the next input.
5. Stop: pass, max attempts, no improvement across two passes, scope expansion needed, credentials/business decision needed, or human review needed.

Max iterations:
<number>

Required structured outputs for each pass:
- review findings
- repair summary
- validation result
- remaining delta
- final handoff

Validation methods to consider:
- git status --short
- git diff --name-only
- git diff --check
- required-section grep checks
- no-secret scan on changed files
- file-scope check
- doctrine consistency check against AGENTS.md and canonical policy docs
- source-of-truth check
- test/typecheck/build only when relevant to approved source changes

Final response must include:
- current repo and branch state
- files changed
- validation commands run
- validation results
- commands intentionally not run and why
- remaining risks or limitations
- exact operator step

Do not commit. Stop for human review.
```

---

## 10. Acceptance Checklist

- [ ] One doc created.
- [ ] No runtime files changed.
- [ ] Loop phases defined.
- [ ] Validation gates defined.
- [ ] Stop conditions defined.
- [ ] Safety rules defined.
- [ ] Reusable prompt included.
- [ ] Recommended folder layout proposed but not created.
- [ ] No hooks, scripts, package files, secrets, env files, or credentials modified.
