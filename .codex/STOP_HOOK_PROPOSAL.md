# Global Codex Stop Hook Proposal

## Purpose

This document proposes a global Codex Stop hook for AJ Digital OS workflows. It is a proposal only. It does not install, activate, or modify any hook.

## Why A Global Stop Hook Is Proposed

AJ Digital OS work often spans agents, branches, runtime artifacts, generated files, policy docs, and protected execution surfaces. A Stop hook can improve end-of-turn discipline by reminding Codex to report repo state, changed files, validation, risks, and approval gates before a final answer.

The hook should reduce silent completion after risky work. It should not replace human judgment or repo-local policy.

## Advisory Mode

Advisory mode is the recommended initial design.

In advisory mode, the hook reports:

- Current branch and git status.
- Tracked changes.
- Relevant untracked files.
- Whether protected paths appear in the diff.
- Whether generated/runtime/cache paths appear in the diff.
- Whether validation commands were reported.
- Whether final response fields appear to be missing.

Advisory mode should warn, not block.

## Enforcement Mode

Enforcement mode should require separate approval before implementation.

Possible enforcement checks:

- Block final completion when tracked changes exist and no files-changed summary is present.
- Block final completion when protected paths changed without an approval marker.
- Block final completion after merge, rebase, push, deploy, destructive command, or secret work unless approved.
- Block final completion when validation is required but not reported.

Enforcement mode carries higher risk because false positives can interrupt valid work.

## Proposed Checks

The hook should check:

- `git status --short --branch`
- `git diff --name-only`
- `git diff --check`
- Protected path patterns from `docs/REPO_SAFETY_POLICY.md`
- Repo-local validation sets from `.codex/validation.json`
- Presence of runtime/generated/cache files in the working tree
- Whether final handoff mentions files changed, validation performed, and remaining risks

The hook should never print secret values. It should inspect filenames and Git metadata, not secret file contents.

## Proposed Windows / PowerShell Compatibility

The initial implementation should support Windows PowerShell.

Recommended shape:

- A small PowerShell script for local execution.
- No package installation.
- No network calls.
- No dependency on WSL.
- Clear exit codes for advisory and enforcement modes.
- Safe handling of paths with spaces.

Potential repo-local supporting files:

- `.codex/validation.json` for repo-specific validation commands.
- `docs/REPO_SAFETY_POLICY.md` for human-readable protected path policy.

Potential global hook location must be confirmed before implementation. Do not assume the user's global Codex config path.

## Rollback Plan

Rollback must be simple:

1. Disable the global Stop hook entry in the user's Codex config.
2. Leave repo-local policy docs intact.
3. Keep the hook script versioned only if approved.
4. Confirm `git status --short` after rollback.

If the hook blocks valid work, switch it back to advisory mode before removing it.

## Risks

- False positives could interrupt valid work.
- A global hook may apply to repos that do not use AJ Digital OS policy.
- Protected path rules may drift from repo reality.
- Hook output could become noisy if it reports every untracked generated file.
- Any hook that reads file contents could accidentally expose secrets, so the first version should avoid content inspection.

## Approval Required Before Implementation

Implementation requires explicit approval before:

- Creating a hook script.
- Editing global Codex configuration.
- Enabling enforcement mode.
- Applying the hook outside this repository.

Approval word: `proceed`.

This document does not install or activate a hook.
