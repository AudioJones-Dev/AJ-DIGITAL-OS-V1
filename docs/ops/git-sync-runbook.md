# Git Sync Runbook

## Why Drift Happens

Local and remote branch drift is common when the same repository is updated from multiple environments (desktop, mobile, cloud agents) at different times.

## Inspection-First Workflow

1. Run `./scripts/git-sync-check.ps1`.
2. Confirm branch, upstream, and ahead/behind state.
3. Review recent history graph before any reconciliation.

## Safe Sync Workflow

1. Run `./scripts/git-sync-safe.ps1`.
2. If working tree is dirty, the script creates a named stash first.
3. The script fetches remotes and reconciles only safe states.

## State Meanings

- `ahead`: local has commits not on upstream.
- `behind`: upstream has commits not local.
- `diverged`: both local and upstream have unique commits.

## When to Stash

Stash when you have local uncommitted changes and need a clean sync operation. Named stashes make recovery explicit.

## When to Use Pull --Rebase

Use `git pull --rebase` when the branch is behind only and not diverged.

## When Not to Auto-Resolve

Do not auto-resolve when branches are diverged. Stop and review commit history and intent before deciding merge or rebase strategy.

## Recovery Commands

- `git stash list`
- `git stash show -p stash@{0}`
- `git stash apply stash@{0}`
- `git pull --rebase`

## Critical Warning

Never use `git reset --hard` unless you explicitly intend to discard local work.
