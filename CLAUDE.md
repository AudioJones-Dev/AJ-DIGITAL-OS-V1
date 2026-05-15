# CLAUDE.md — Claude overlay for AJ Digital OS

Read `AGENTS.md` first. That file is the authoritative operating contract.
This file only adds Claude-specific behavior on top.

---

## 1. Start every session

1. Run `git status --short` and `git branch --show-current` before changing
   anything. If the tree is dirty and you did not create the dirt, stop
   and ask.
2. If asked to do work, default to **audit-only** (no writes) until the
   operator confirms write access. Read tools (`Read`, `Bash` for
   inspection commands) are fine without confirmation.
3. Confirm the active branch matches the operator's instruction. Do not
   silently switch branches.

## 2. Branch naming

Use `claude/<short-kebab-task>-<random-suffix>` for normal work
(e.g. `claude/audit-repo-readiness-GphcB`). Use the prefixes from
`AGENTS.md` §2 (`chore/`, `docs/`) when explicitly doing cleanup or
docs-only work.

## 3. Permission ceiling

- Default operating ceiling is **L2** from `AGENTS.md` §7 (read, build,
  typecheck, test).
- Promote to **L3** only when the operator explicitly asks for code or
  doc changes on a specific scope.
- Promote to **L4** (`git push`, PR creation) only after L3 work is done
  and the operator has not asked to review locally first.
- **L5** is off-limits. Never run force pushes, branch deletes, history
  rewrites, secret rotations, or production deploys.

## 4. Validation before commit

Always run, in order, before `git commit`:

```bash
npm run typecheck
npm run build
npm run test
```

If any of these fail, fix the cause or stop and report. Do not commit a
red tree to "fix in the next commit."

## 5. Tool-use defaults

- Prefer the dedicated tools (`Read`, `Edit`, `Write`, `Bash` for shell)
  over MCP calls when both work — the local tools are cheaper and
  reviewable in the diff.
- Use `Agent` (subagents) for genuinely parallel research, not for
  sequential file edits.
- Do not call destructive MCP tools (Sanity `unpublish_documents`,
  Supabase `delete_branch`, GitHub `delete_file`, Cloudflare `*_delete`,
  Calendly `cancel_event`, Gmail label mutations, etc.) without an
  explicit operator instruction naming the target.
- Never call `mcp__github__merge_pull_request` on behalf of the operator
  unless they explicitly asked for the merge in the current turn.

## 6. PR posture

- Open PRs as **draft**.
- Title with a conventional-commit prefix (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`).
- Body must include the checklist from `AGENTS.md` §8.
- Do not auto-merge. Do not enable auto-merge.
- Do not request human review by default; let the operator do that.

## 7. Comment hygiene

- Default to **no comments** in code. Only add a comment when the *why*
  is non-obvious.
- Never add comments that reference the current task, PR number, or
  reviewer (e.g. "fixes Claude session 01ABC"). The PR description is
  the record.
- Never leave TODOs without a linked issue.

## 8. When in doubt

- Ask one short question via `AskUserQuestion` rather than guess.
- Surface ambiguity early; do not commit speculative behavior changes
  hoping the operator will catch them in review.

## 9. PR-watching behavior

If the operator asks you to watch a PR (`subscribe_pr_activity`),
follow the rules in the environment system prompt: investigate each
event, push a fix only when confident and low-risk, ask via
`AskUserQuestion` when ambiguous, unsubscribe the moment the operator
says stop.
