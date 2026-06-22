# Remote Secret Operations Doctrine

**Status:** Required doctrine
**Owner:** AJ Digital LLC
**Scope:** Remote agent sessions, Codex/ChatGPT/Claude handoffs, Doppler CLI operations, approved secret managers, provider consoles, and any task where a human shares a temporary secret to unblock configuration.

---

## Purpose

This doctrine defines how AJ Digital OS handles remote secret operations when the operator is not directly at the local machine and an agent must help complete configuration through Doppler CLI or another approved secret manager.

The operating rule is strict:

> A pasted secret is treated as exposed the moment it enters chat, even if it is never committed.

Remote secret handling is allowed only to unblock a current operational task. It must not become a general secret transport workflow.

## Allowed

- The user may paste temporary secret values into a private agent/chat session only to unblock a current configuration task.
- The agent may use that value only for the current operational task.
- The agent must load the secret only through Doppler CLI or another explicitly approved secret manager.
- The agent may verify secret presence by name only.
- The agent may verify runtime behavior through Doppler-managed environment injection.
- The agent may document that a secret was configured, rotated, missing, or blocked, but must not document the value.
- The agent may store non-secret status markers in Doppler when useful, such as `*_ROTATION_REQUIRED=true`.

## Forbidden

The agent must never write secrets to:

- source files
- Markdown docs
- commits
- logs
- tests
- examples
- screenshots
- generated reports
- runtime artifacts intended for commit
- `.env` files unless explicitly approved for local-only use and confirmed ignored
- shell history through command arguments when an interactive or stdin-safe path is available

The agent must not:

- echo the secret back to the user
- print the secret for verification
- preserve the secret in a plan, checklist, PR body, memory, or handoff
- bulk-copy secrets from a bundle into a repo
- use a pasted secret after the current operational task is complete
- treat a pasted secret as safe because the chat is private

## Required Sequence

When the user provides a temporary secret remotely:

1. Receive the secret only for the current operational task.
2. Classify the secret as exposed immediately.
3. Load the secret through Doppler CLI or another approved secret manager.
4. Verify by name only that the expected secret exists in the intended project/config.
5. Verify the app, integration, or gate uses the Doppler-managed secret, not a file-backed or hardcoded value.
6. Rotate the secret immediately after remote setup or gate completion through Doppler CLI or the provider console.
7. Confirm the old value no longer works when the provider supports safe verification.
8. Confirm no committed artifact contains the value.
9. Report only presence, status, rotation outcome, validation commands, and remaining risk.

## Doppler CLI Standard

Doppler CLI is the default secret-management path for AJ Digital OS unless the operator explicitly approves another secret manager.

Preferred commands:

```powershell
doppler secrets set SECRET_NAME --project <project> --config <config>
doppler secrets --only-names --project <project> --config <config>
doppler secrets get SECRET_NAME --project <project> --config <config> --no-exit-on-missing-secret
```

Use interactive `doppler secrets set SECRET_NAME ...` when possible so the value is not passed as a command argument.

Name-only verification is preferred:

```powershell
doppler secrets --only-names --project aj-digital-os --config dev
```

Avoid:

```powershell
doppler secrets get SECRET_NAME --plain
```

Use value-printing only when there is a specific operator-approved reason and the output can be contained without logging, copying, or final-response exposure.

## Rotation Requirement

Any secret pasted into chat must be rotated.

Minimum rotation requirements:

- Create or obtain a replacement value through the provider console, provider API, or approved secret manager.
- Store the replacement in Doppler CLI or approved secret manager.
- Remove, revoke, or disable the pasted value in the provider.
- Confirm the old value fails if the provider supports a safe verification path.
- Confirm the new value works through the intended Doppler-managed runtime path.

If rotation cannot be completed, mark the secret as compromised and blocked.

## Verification Requirements

After remote secret handling, the agent must run or request verification appropriate to the task.

Required local verification:

```powershell
git status --short
git diff --name-only
git diff --check
```

Required secret exposure checks:

- Search the repo for the exact pasted value when the agent still has access to it during the current task.
- Search generated docs and changed files for provider key prefixes or known secret names.
- Confirm no `.env`, runtime artifact, generated report, test fixture, or Markdown doc contains the secret value.
- Confirm final response contains no secret value.

If searching for the exact value would reintroduce it into shell history or logs, use a safer local-only scan method that does not print the value, or require the operator to run the scan directly.

## Reporting Standard

Final reporting after remote secret operations must include:

- secret name, not value
- target Doppler project/config or approved secret manager location
- whether the value was loaded
- whether rotation was completed
- whether old-value invalidation was confirmed
- verification commands run
- whether repo grep/diff checks found secret exposure
- remaining risks

Do not include:

- secret values
- token prefixes long enough to identify the secret
- screenshots of secret dashboards
- copied provider responses containing secret material

## Hard Rules

- A pasted secret is exposed immediately.
- Doppler CLI is the default secret path for AJ Digital OS remote work.
- Secrets must not be committed, logged, documented, tested, or exampled.
- Secret verification is by name, presence, and behavior, not by printing values.
- Remote setup does not remove the rotation requirement.
- If a provider cannot rotate or revoke a pasted value, the integration remains blocked until the operator accepts and documents the risk.

## Related Docs

- `docs/REPO_SAFETY_POLICY.md`
- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- `docs/AGENT_HANDOFF_PROTOCOL.md`
