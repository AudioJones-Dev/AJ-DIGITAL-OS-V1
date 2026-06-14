# WORKTREE PARALLEL DEVELOPMENT PROTOCOL
Status: Repo Copy
Canonical Version: 1.1
Owner: AJ Digital LLC
Canonical Source: AJ-DIGITAL-VAULT/02-OPERATING-SYSTEM/Protocols/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md
Applies To: All Repositories, Agents, Contributors, Contractors, and Automation Systems

---

> This repository copy derives from the canonical Obsidian protocol and must not diverge.
> v1.1 consolidates the prior procedural protocol (v1.0) with the former Worktree
> Parallel Development Doctrine (draft v0.1) — the definitions, operating model, and
> governance principles below were previously the separate doctrine draft and are now
> part of the canonical protocol. The standalone doctrine document is retired.

## 1. Purpose

This protocol governs how AJ Digital OS runs parallel development safely across the
Local checkout, Codex-managed worktrees, permanent worktrees, branches, agents, and
human review.

The objective is to:
- Preserve clear ownership and isolate execution
- Prevent accidental overwrites and scope contamination
- Reduce merge conflicts
- Improve review quality and repository integrity
- Make every parallel task reviewable before integration
- Enable parallel execution by multiple agents and humans

## 2. Core Principle

```txt
One Task = One Branch = One Worktree
```

No exceptions. Every meaningful unit of work must be isolated.

## 3. Doctrine Statement

- Local is the command center, not the playground.
- Worktrees are isolated execution lanes.
- Parallel work must be isolated by default.
- Every worktree task must have a named purpose.
- Every worktree task must end with a closeout report.
- One branch has one active owner/worktree at a time.
- Human/operator approval is required before merge.
- Agents may produce changes but may not self-authorize merges.
- Destructive cleanup requires explicit human authorization.
- If branch state is unclear, pause and report.

## 4. Definitions

- **Local checkout**: The primary repository checkout used for foreground review, sensitive validation, environment-specific checks, and final merge decisions.
- **Codex-managed worktree**: A short-lived isolated checkout created or used by Codex for a named task, usually disposable after review, merge, or archive.
- **Permanent worktree**: A long-lived checkout reserved for a named feature, research lane, client portal lane, repeated test environment, or multi-session collaboration path.
- **Branch owner**: The single human, agent, thread, or worktree currently responsible for active changes on a branch.
- **Handoff**: A controlled transfer of task context, branch state, and work-in-progress from one execution location to another.
- **Detached HEAD**: A checkout state where the worktree points directly at a commit instead of a named branch.
- **Foreground work**: Human-visible review, validation, approval, merge decisioning, or production-sensitive execution.
- **Background work**: Isolated drafting, implementation, research, or patch work performed away from the Local command center.
- **Merge authority**: The explicit right to approve and integrate a branch into another branch. Merge authority belongs to the human/operator unless delegated in writing.

## 5. Core Operating Model

- Local = foreground review, sensitive validation, and final merge decisions.
- Codex-managed worktree = short-lived isolated task lane.
- Permanent worktree = long-lived feature, research, or build lane.
- Branch = ownership boundary.
- Pull request / reviewed merge = integration boundary.

Worktrees may produce changes. Branches carry ownership. Review boundaries decide
whether those changes become part of the integrated system.

## 6. Local vs Worktree Boundary

| Situation | Use Local | Use Codex-Managed Worktree | Use Permanent Worktree | Reason |
|---|---:|---:|---:|---|
| Documentation-only doctrine task | No | Yes | Optional | Low-risk isolated docs work should be easy to review and discard. |
| Small bug fix | Optional | Yes | No | Keep the patch narrow and isolated unless local-only validation is required. |
| Risky refactor | Review only | Optional | Yes | Long-running or invasive changes need a stable lane and explicit ownership. |
| Feature build | Review only | Optional | Yes | Feature work often spans sessions, tests, and review cycles. |
| Long-running client portal work | Review only | No | Yes | Client portal work needs continuity, named ownership, and repeated validation. |
| Hook/security policy work | Sensitive validation only | Optional | Yes | Policy surfaces are high impact and require strict ownership and review. |
| Secrets/env-dependent testing | Yes | No | Optional | Ignored files and secrets should remain under controlled local execution. |
| Final validation | Yes | No | Optional | Final checks belong in the foreground review lane. |
| Merge decision | Yes | No | No | Merge authority is an operator decision boundary. |
| Repo cleanup | Approval only | No | Optional | Cleanup can destroy evidence or unresolved work and needs explicit authorization. |

## 7. Required Workflow

### Step 1 — Create Worktree
Every task begins with a dedicated worktree with a descriptive branch name
(e.g. `feature/client-portal-auth`, `docs/worktree-protocol`, `fix/billing-calculation`).

### Step 2 — Define Scope
Before modifications begin, declare: objective, allowed files, expected deliverable,
and validation requirements. Name forbidden paths explicitly (e.g. `package.json`,
`.env`, `database/*`, `secrets/*`).

### Step 3 — Execute
Execution occurs only inside the assigned worktree. Agents may not modify `main`,
production, or unrelated worktrees.

## 8. When To Use Local

Use Local for: final validation; human/operator review; environment-specific tests;
secrets or ignored local files; merge decisions; production-sensitive changes; cases
where only one local app instance can run safely.

Local should stay clean enough to inspect, validate, and decide. It should not become
a general-purpose scratch lane for parallel agent edits.

## 9. When To Use Codex-Managed Worktrees

Use for: isolated documentation changes; small patches; research/spec drafts;
exploratory edits; parallel agent tasks; tasks that should be easy to discard.

Each must have a named task, narrow intended file scope, and a closeout report before
any handoff or merge request.

## 10. When To Use Permanent Worktrees

Use for: long-lived feature lanes; ongoing dashboard work; client portal work;
experimental architecture branches; repeated testing environments; multi-session agent
collaboration.

Must have named ownership, a clear branch purpose, and periodic review so they do not
become untracked side systems.

## 11. Branch Ownership Rules

- A branch may only be actively owned by one worktree/local checkout at a time.
- Do not check out the same branch in multiple worktrees.
- If a branch is already checked out elsewhere, pause and report.
- Prefer handoff instead of forcing checkout.
- Branch names must describe the workstream (e.g. `docs/worktree-doctrine`, `fix/auth-session-boundary`, `feature/client-portal-gallery-review`, `chore/repo-hygiene-registers`).

## 12. Handoff Rules

- Use handoff when a thread must move between Worktree and Local, or when Local validation is required.
- Do not manually recreate work in Local if a handoff can preserve the thread and code state.
- Ignored files do not move through Git-based handoff.
- If handoff fails or branch state is unclear, pause and report.

## 13. Parallel Agent Work Rules

- Each agent gets one named task; each task gets one isolated worktree unless explicitly paired.
- Agents must declare intended files/directories before editing when possible.
- Agents must not modify unrelated files or resolve unrelated dirty state.
- Agents must not run broad formatters unless explicitly authorized.
- Agents must not clean, reset, delete, or rebase without explicit approval.

Shared files require coordination before edit.

## 14. Review and Merge Rules

- Worktree may produce changes; human/operator reviews the diff; Local may validate when needed.
- Merge happens only after review. If conflicts exist, pause and report.
- Do not force-push, squash, rebase, or delete branches unless authorized.
- Pushing a branch to a remote requires human/operator approval unless the task explicitly authorized publication.
- No agent may merge its own work without human/operator approval.

Review is the integration gate. Passing local checks does not automatically authorize merge.

## 15. Cleanup Rules

- Codex-managed worktrees are disposable after review/merge/archive.
- Permanent worktrees require named ownership and periodic review.
- Do not delete active, pinned, or unresolved worktrees, or run destructive cleanup from a worktree unless authorized.
- Cleanup must preserve unresolved reports, diffs, and branch references.
- Periodic review should include disk usage, stale generated artifacts, dependency caches, build outputs, and whether the worktree still has an active owner.

Cleanup is a governed action, not a convenience step. If the state is unclear, report before acting.

## 16. Anti-Patterns

| Anti-pattern | Why it is dangerous | Correct behavior |
|---|---|---|
| Doing all work in Local | Turns the command center into a scratch lane and increases conflict risk. | Use Local for review, validation, secrets, and merge decisions. |
| Multiple agents editing same files in separate lanes | Creates hidden conflicts and duplicate decision paths. | Assign one owner or coordinate the shared file scope first. |
| Checking out same branch in multiple worktrees | Breaks ownership clarity and can overwrite expectations. | Keep one active checkout per branch and use handoff. |
| Merging from a dirty branch without review | Integrates unknown changes and unrelated state. | Review the diff and close open questions before merge. |
| Running broad formatters in documentation-only tasks | Creates noisy diffs unrelated to the task. | Format only the intended files when explicitly needed. |
| Cleaning untracked files without approval | Can delete ignored evidence, local configs, generated reports, or handoff material. | Stop, report, and request explicit cleanup authorization. |
| Hiding unresolved conflicts | Makes integration risk invisible. | Report conflicts with affected files and recommended next action. |
| Folding unrelated doctrine into a current feature branch | Mixes governance decisions with implementation work. | Use a dedicated docs branch or isolated worktree task. |
| Letting worktrees accumulate with no owner | Creates stale branches, unclear state, and review debt. | Assign ownership and periodically close, archive, or merge. |
| Treating detached HEAD work as merged work | Detached work is not integrated by default and may be easy to lose. | Attach work to a branch or handoff before claiming integration. |

## 17. Required Pre-Flight Checklist

- [ ] Confirm current branch
- [ ] Confirm Local vs Worktree
- [ ] Confirm git status
- [ ] Identify intended files/directories
- [ ] Identify risk level
- [ ] Identify whether secrets/env/local ignored files are needed
- [ ] Identify whether tests can run in this environment
- [ ] Identify whether handoff may be required
- [ ] Confirm no unrelated files will be edited

## 18. Required Closeout Report

```md
- Task name:
- Execution location:
- Branch/worktree state:
- Files changed:
- Files intentionally not changed:
- Tests/checks run:
- Risks or unresolved issues:
- Handoff required: yes/no
- Human approval required: yes/no
- Recommended next action:
```

## 19. Example Worktree Task Prompt

```txt
Task purpose:
[State the named purpose of this worktree task.]

Target files:
[List the exact files/directories that may be edited.]

Forbidden files:
[List files/directories that must not be modified.]

Pre-flight report required:
- current branch
- Local vs Worktree state
- git status
- intended files/directories
- risk level
- whether secrets/env/local ignored files are needed
- whether tests/checks can run here
- whether handoff may be required

Edit constraints:
- Keep changes scoped to the target files.
- Do not modify unrelated files or resolve unrelated dirty state.
- Do not run broad formatters unless authorized.
- Do not clean, reset, delete, rebase, force-push, or merge without explicit approval.

Validation requirements:
[List exact checks to run, or state why no checks are required.]

Closeout report required:
- task name
- execution location
- branch/worktree state
- files changed
- files intentionally not changed
- tests/checks run
- risks or unresolved issues
- handoff required: yes/no
- human approval required: yes/no
- recommended next action
```

## 20. Governance Status

This protocol is canonical (v1.1) as of 2026-06-12. It consolidates and supersedes the
prior procedural protocol (v1.0) and the separate Worktree Parallel Development Doctrine
draft (v0.1). Repository copies must be synced from the canonical Obsidian source and
must not diverge. Changes are append-versioned; promotion of future revisions requires
human/operator review.
