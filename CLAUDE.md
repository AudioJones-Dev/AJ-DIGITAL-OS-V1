# CLAUDE.md

Claude-specific overlay for AJ Digital OS. Read this AFTER `AGENTS.md` — that file is authoritative.

---

## 1. Operating Posture

You are working inside a local-first, approval-gated business AI runtime. The repository values:

- Determinism over cleverness.
- Small, reviewable changes over sweeping refactors.
- Documentation parity with code.
- Operator authority via the approval lifecycle.

Default to surgical edits. Default to asking when scope is unclear. Default to preserving existing behavior.

---

## 2. Read Before You Write

Before non-trivial work, load:

1. `AGENTS.md` — operating contract.
2. `docs/PRD.md` — product definition.
3. `docs/DESIGN.md` — architecture navigation.
4. `README.md` — current operator surface.
5. `package.json` — actual scripts (do not invent them).
6. The relevant spec under `docs/system/` or `docs/architecture/`.

If a doc and code disagree, the code is what runs. Reconcile the doc in the same PR when feasible.

---

## 3. Session and Branch Behavior

- Confirm the active git branch before editing. The expected pattern is `claude/<topic>-<slug>`.
- One Claude session = one focused task scope. Use a fresh chat for unrelated work.
- Commits land on the current branch. Never push to `main`.
- `git push -u origin <branch>` with retry on transient network errors only.
- Open the PR as a draft after the first push.

---

## 4. Safe Refactor Heuristics

Big changes break trust. Before any change touching >5 files:

1. State the goal in one sentence.
2. List the files you intend to touch and why.
3. Note the test commands that must still pass.
4. Identify the smallest reversible step.

If the answer to "can I revert this in one commit?" is no, split it.

---

## 5. Hard Stops

Stop and ask the operator before:

- Deleting source files.
- Renaming directories.
- Editing files under `.github/workflows/`.
- Modifying `package.json` `scripts` or `dependencies` beyond a single targeted change.
- Touching webhook signing, approval lifecycle, or permission enforcement code.
- Making changes that alter persisted state schemas under `data/`, `memory/`, or `runtime/`.

These are the load-bearing boundaries of the system.

---

## 6. Tool Use Etiquette

- Prefer `Read`, `Edit`, `Write` over shelling out to `cat`/`sed`/`echo`.
- Run independent reads in parallel.
- Do not poll. If you start a long-running command, run it in the background and let the harness notify you.
- Do not retry the same failing command in a loop. Diagnose the root cause.

---

## 7. Subagent Use

- Use `Explore` for "where is X" / "find all Y" sweeps that span >3 files.
- Use `Plan` for non-trivial implementation strategy.
- Use `general-purpose` for open-ended research.
- Brief subagents fully. They have no memory of this conversation.
- Do not duplicate subagent work in the main thread.

---

## 8. PR Hygiene

When opening a PR:

- Title ≤70 chars.
- Body uses the template at `.github/pull_request_template.md`.
- Summary leads with WHY.
- Test plan lists the exact commands you ran.
- Mark draft until CI is green.

When watching a PR via `subscribe_pr_activity`:

- Diagnose each event before acting.
- Push fixes silently when confident; ask via `AskUserQuestion` when ambiguous.
- Refresh status comment on every event so the thread reflects live state.

---

## 9. Tone

Short, direct, terminal-friendly. No marketing language. No hedging. State what you did, what failed, and what's next.

Do not narrate internal deliberation in user-facing text. State results.

---

## 10. Identity

Do not include your model identifier or "Claude" in commit messages, PR bodies, code comments, or any pushed artifact. Identity belongs in the chat thread, not the repo.

---

## 11. Reference

| Need…                          | Use…                                      |
|--------------------------------|-------------------------------------------|
| Operating contract             | `AGENTS.md`                               |
| Product definition             | `docs/PRD.md`                             |
| Architecture index             | `docs/DESIGN.md`                          |
| Roadmap                        | `docs/ROADMAP.md`                         |
| Decisions log                  | `docs/DECISIONS.md`                       |
| Security                       | `docs/SECURITY.md`                        |
| Deployment                     | `docs/DEPLOYMENT.md`                      |

Defer to `AGENTS.md` for anything not stated here.
