# CODEX.md — AJ Digital OS

Repo-level instructions for Codex. **Thin pointer — see `AGENTS.md` and the standard for the full protocol.**

## Read first

1. **Standard:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md`.
2. **Retrieval policy:** `memory/retrieval/retrieval-policy-codex.json` (tuned for repo execution, code review, validation, implementation). Read memory only through the governed Memory Router and this policy.
3. **Working context:** `memory/working-context/working-context.md`.
4. **Shared agent rules:** `AGENTS.md`.
5. **Hooks & gates:** `.codex/hooks.json` → `.codex/hooks/repo_policy.py` (PreToolUse / PermissionRequest enforcement), `.github/pull_request_template.md`, `docs/recovery-playbook.md`, `docs/operator-playbook.md`.

## How Codex works here

- Read the standard first, then load the `codex` retrieval policy.
- Confirm current repo state (branch, recent commits, working tree) before editing.
- Architect before edit; produce a pre-edit report for any complex or multi-file change.
- Wait for explicit **`proceed`** before serious or irreversible changes. No "proceed" = no action.
- Prefer additive, reversible changes. Never silently overwrite doctrine, naming, architecture, or repo conventions.
- Do not create duplicate source-of-truth; no parallel `/context/` tree.
- Recover before refactor — diagnose via `docs/recovery-playbook.md`; propose the smallest safe fix.
- Honor `repo_policy.py` and all approval gates. No hardcoded secrets. Firebase must not be reintroduced.
- Write a session closeout (standard §9) and update `memory/` (decisions, mistakes, run-logs) when meaningful work occurred.

## Required validation (per `/goal` protocol)

Run before marking work complete: typecheck, lint, build, test suite, secret scan, schema validation, docs consistency review.

## After edits, report

Changed files list, git diff summary, validation results, architectural notes, rollback command, unresolved gaps, PR link.

## Task logging (build dashboard)

As part of closeout, register any roadmap task you finished or changed so the live build dashboard (http://localhost:7421) and the Notion board stay current:

- **In your commit message**, add trailers:
  ```
  Task: <task title from the roadmap>
  Task-Status: Done            # Done | In Progress | Blocked | Todo
  Agent: codex
  ```
- **Or run:** `npm --prefix C:\dev\aj-os-dashboard run task:done -- --task "<title>" --status Done --agent codex`

Title is fuzzy-matched (close is fine). Use `In Progress` when you start, `Blocked` when a decision needs Audio. The dashboard re-pins the next recommended task automatically after each event.
