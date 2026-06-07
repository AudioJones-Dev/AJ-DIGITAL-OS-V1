# AGENTS.md — AJ Digital OS

Entry point for any agent operating in this repo. **Keep this thin.** It does not restate doctrine; it points to it.

## Read first

1. **Standard:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md` — the canonical agentic operating doctrine. Read it before any implementation.
2. **Retrieval policy:** load the policy that matches your role from `memory/retrieval/` (`retrieval-policy-claude.json`, `-codex.json`, `-hermes.json`, or `-agent-default.json`). Read memory **only** through the governed Memory Router and your policy — never the full vault directly.
3. **Working context:** `memory/working-context/working-context.md`.
4. **Governance & gates:** `.codex/hooks.json` → `repo_policy.py`, `.github/pull_request_template.md`, `docs/operator-playbook.md`, `docs/recovery-playbook.md`.

## Operating rules (full versions in the standard)

1. Read the standard first.
2. Load the correct memory retrieval policy.
3. Confirm current repo state (branch, recent commits, working tree) before editing.
4. Identify missing or stale context before building; do not improvise.
5. Architect before edit — PRD/task spec for any complex or multi-file change.
6. Produce a pre-edit report before changing files.
7. Require explicit **`proceed`** before serious or irreversible actions. No "proceed" = no action.
8. Prefer additive, reversible changes. Never silently overwrite doctrine, naming, or architecture.
9. Do not create duplicate source-of-truth. No parallel `/context/` tree (see standard §5).
10. Recover before refactor — diagnose via `docs/recovery-playbook.md` before broad changes.
11. Write a session closeout (standard §9) and update memory when meaningful work occurred.
12. Respect repo hooks and approval gates. No hardcoded secrets. Firebase must not be reintroduced.

## After edits, report

- Exact files created/modified
- Git diff summary
- Rollback command
- Any unresolved gaps

## Task logging (build dashboard)

Part of closeout. When you finish or change the state of a roadmap task, register it so the live build dashboard (http://localhost:7421) and the Notion **Build Command Center** board stay current:

- **In your commit message**, add trailers (a shared post-commit hook picks these up automatically):
  ```
  Task: <task title from the roadmap>
  Task-Status: Done            # Done | In Progress | Blocked | Todo
  Agent: codex                 # codex | claude  (optional; defaults to git author)
  ```
- **Or run explicitly:** `npm --prefix C:\dev\aj-os-dashboard run task:done -- --task "<title>" --status Done --agent <codex|claude>`

The task title is fuzzy-matched to the roadmap. Use `In Progress` when you start a task, `Blocked` when a decision needs Audio (the operator). The dashboard re-pins the next recommended task automatically after each event. Toolkit + conventions: `C:\dev\aj-os-dashboard\` (`AGENT-TASK-LOGGING.md`).
