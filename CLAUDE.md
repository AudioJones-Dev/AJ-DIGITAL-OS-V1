# CLAUDE.md — AJ Digital OS

Repo-level instructions for Claude (Claude Code / Cowork). **Thin pointer — see `AGENTS.md` and the standard for the full protocol.**

## Read first

1. **Standard:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md`.
2. **Retrieval policy:** `memory/retrieval/retrieval-policy-claude.json`. Read memory only through the governed Memory Router and this policy.
3. **Working context:** `memory/working-context/working-context.md`.
4. **Shared agent rules:** `AGENTS.md`.
5. **Gates & recovery:** `.codex/hooks.json` → `repo_policy.py`, `.github/pull_request_template.md`, `docs/recovery-playbook.md`, `docs/operator-playbook.md`.

## How Claude works here

- Read the standard first, then load the `claude` retrieval policy.
- Inspect current repo state before any edit.
- Architect before edit; produce a pre-edit report (inspection, gaps, plan, risk, rollback, questions).
- Wait for explicit **`proceed`** before serious or irreversible changes. No "proceed" = no action.
- Prefer additive, reversible changes. Never silently overwrite doctrine, naming, or architecture.
- Do not create duplicate source-of-truth; no parallel `/context/` tree.
- Recover before refactor (`docs/recovery-playbook.md`).
- Write a session closeout (standard §9) and update `memory/` when meaningful work occurred.
- No hardcoded secrets. Firebase must not be reintroduced. No new vendor becomes canonical without architecture review.

## After edits, report

Exact files created/modified, git diff summary, rollback command, unresolved gaps.

## Task logging (build dashboard)

As part of closeout, register any roadmap task you finished or changed so the live build dashboard (http://localhost:7421) and the Notion board stay current:

- **In your commit message**, add trailers:
  ```
  Task: <task title from the roadmap>
  Task-Status: Done            # Done | In Progress | Blocked | Todo
  Agent: claude
  ```
- **Or run:** `npm --prefix C:\dev\aj-os-dashboard run task:done -- --task "<title>" --status Done --agent claude`

Title is fuzzy-matched (close is fine). Use `In Progress` when you start, `Blocked` when a decision needs Audio. The dashboard re-pins the next recommended task automatically after each event.
