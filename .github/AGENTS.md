# .github Agent Instructions

## Purpose

This folder owns GitHub pull request templates, GitHub Actions workflows, and repository automation checks.

## Local Contracts

- Root `AGENTS.md` safety and approval gates apply here.
- Workflow changes must preserve strong gates for source and runtime changes.
- Docs/policy-only changes may use lightweight docs validation when app coverage or runtime checks are unrelated to the changed files.
- Do not add secrets, tokens, or credential values to workflow files.
- Do not add deploy, release, push, or destructive automation without explicit approval.

## Work Guidance

- Prefer built-in GitHub Actions and shell logic before adding third-party actions.
- Keep CI behavior explicit: name what is skipped and why.
- If a workflow bypasses app validation for docs-only changes, keep full validation active for source, test, runtime, package, and build configuration changes.
- Avoid making coverage thresholds weaker to pass unrelated docs work.

## Verification

- For workflow changes, run `git diff --check`.
- Validate any JSON files touched by the workflow change.
- Inspect PR checks after pushing because GitHub Actions behavior can only be fully verified on GitHub.

## Child DOX Index

This folder is not yet subdivided by child `AGENTS.md` files.
