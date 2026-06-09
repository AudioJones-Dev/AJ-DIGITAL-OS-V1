# AJ Digital OS Repo Safety Policy

## Purpose

This policy defines safety boundaries for repository work in AJ Digital OS. It protects secrets, runtime state, generated artifacts, production surfaces, and operator-controlled actions.

## Protected Files And Paths

Do not modify these without explicit approval:

- `.env`, `env/.env`, `.env.local`, and any credential-bearing file.
- Runtime state under `runtime/`, unless the task is explicitly runtime-state maintenance.
- Generated logs, JSONL traces, snapshots, caches, and build outputs.
- `.dashboard/` snapshots.
- `logs/`, `dist/`, `node_modules/`, `data/`, `memory/`, `output/`, and `sessions/`.
- Global or local tool settings under `.claude/`, `.codex/`, `.mcpjam/`, `.tools/`, or similar agent config directories, except approved repo-local policy/config files.
- Hermes core logic, model-router logic, BEL/runtime execution logic, MCP policy, approval enforcement, attribution hooks, and existing API route behavior.

When in doubt, inspect and report before editing.

## Secrets Policy

Secrets must never be printed, copied into docs, committed, or echoed back. If a token or credential appears in the conversation, logs, or repo output, treat it as compromised and recommend rotation.

Allowed secret-adjacent work:

- Referencing variable names.
- Updating `.env.example` placeholders when approved.
- Documenting secret handling steps without values.

Not allowed without explicit approval:

- Reading secret files for content.
- Moving secrets.
- Writing secrets.
- Testing live credentials.
- Sending credentials to external tools.

## Runtime And Generated Artifact Policy

Runtime and generated files are not source-of-truth policy unless explicitly promoted. Do not stage or commit generated runtime JSON, JSONL, snapshots, caches, or local tool outputs by default.

If generated files appear in `git status`, classify them in the final response:

- Generated/cache.
- Runtime state.
- Candidate source artifact.
- Unknown and needs human review.

## Destructive Command Policy

Do not run destructive commands without explicit approval and a rollback plan.

Destructive actions include:

- Deleting files or directories.
- `git reset --hard`.
- `git clean`.
- Force push.
- Rebase of shared or divergent branches.
- Mass move/rename.
- Rewriting history.
- Removing dependencies or lockfiles.

Before any approved destructive action, show:

- What will change.
- What could break.
- What is reversible.
- What is not reversible.
- Backup or rollback plan.
- Exact command or action requested.

## Branch, Merge, Rebase, Push, And Deploy Policy

Check branch state before implementation. If local and remote have diverged, do not land new work directly on the divergent branch unless approved.

Require explicit approval before:

- Creating release branches.
- Merging.
- Rebasing.
- Pushing.
- Opening or merging pull requests.
- Deploying.
- Tagging releases.

Preferred safe pattern for policy/docs work on divergent `main`:

1. Create an isolated branch.
2. Keep changes to docs/config only.
3. Avoid runtime/generated files.
4. Validate with diff checks.
5. Hand off for review before merge.

## Dependency And Package Policy

Do not install packages, update dependencies, or change lockfiles unless the task explicitly requires it and approval is granted.

Package changes require:

- Reason for the change.
- Affected workspaces.
- Security or compatibility impact.
- Validation commands.
- Rollback path.

## MCP, Skill, Hook, And Global Config Policy

Do not modify global Codex, Claude, MCP, skill, or system settings without explicit approval.

Repo-local policy/config files may be proposed and created when approved. Global hook installation must remain a separate approval step from proposal writing.

## Required Human Approval Gates

Require `proceed` before:

- File deletion.
- Overwriting existing policy docs.
- Secret or credential work.
- Runtime/core logic changes.
- Global hook installation.
- Package installation or lockfile updates.
- Merge, rebase, push, deploy, release, or public communication.
- Anything that could reintroduce Firebase.

No `proceed` means pause or continue read-only.
