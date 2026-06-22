# Repository Bootstrap Protocol

**Type:** Repository onboarding protocol
**Status:** Draft protocol
**Owner:** AJ Digital LLC / Audio Jones
**Updated:** 2026-06-22
**Scope:** New and existing AJ Digital repositories prepared for agent-assisted work

## 1. Purpose

This protocol defines the minimum checks and defaults for preparing an AJ Digital repository for work by Claude Code, Codex, Copilot, OpenClaw, Hermes-adjacent workflows, or other supported agents.

The protocol keeps agent behavior portable without turning global tools into repo runtime dependencies.

## 2. Bootstrap Sequence

Use this order:

1. Confirm repo identity, remote, branch, and worktree state.
2. Read root `AGENTS.md` and the nearest child `AGENTS.md` for the target path.
3. Read canonical policy docs named by the repo.
4. Identify source-of-truth docs, architecture specs, and open handoff state.
5. Confirm allowed file scope.
6. Confirm validation commands.
7. Confirm approval gates.
8. Check dependency manifests before adding any dependency.
9. Check whether global agent capabilities are available at the harness level.
10. Proceed only inside the approved scope.

## 3. Ponytail Compatibility Note

AJ Digital repositories SHOULD be Ponytail-compatible.

That means repo instructions should not fight the Ponytail behavior ladder when the ladder is aligned with local policy:

- question whether new code needs to exist
- prefer deleting or reusing existing code
- prefer standard library and native platform features
- avoid unnecessary dependencies
- use minimum viable implementation
- preserve validation, security, accessibility, auditability, and data-loss protections

AJ Digital repositories MUST NOT vendor Ponytail or require it as an application dependency unless explicitly justified and approved for that repo.

Ponytail compatibility is an agent-behavior posture, not a runtime requirement.

## 4. Dependency Rule

Before adding a dependency, the agent must answer:

| Question | Required answer before adding |
| --- | --- |
| Does the repo already have a native or standard-library solution? | No |
| Does an existing installed dependency already solve it? | No |
| Is the dependency needed by application/runtime code rather than agent preference? | Yes |
| Is the package compatible with repo security and licensing expectations? | Yes |
| Has the change been scoped and approved where required? | Yes |
| Will validation cover the new dependency path? | Yes |

If any answer is missing, do not add the dependency.

## 5. Override Rule

Global agent behavior capabilities, including Ponytail, do not supersede:

- AJ Digital OS governance
- repo-local `AGENTS.md`
- human approval matrix
- security policy
- architecture specs
- validation requirements
- protected path rules
- production controls
- secret-handling rules

If a global agent behavior layer recommends a shortcut that weakens these controls, the shortcut is rejected.

## 6. Install Commands For Operator Reference

Claude Code:

```txt
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

Codex:

```powershell
codex plugin marketplace add DietrichGebert/ponytail
codex
```

Then install Ponytail from `/plugins`, review `/hooks`, trust its lifecycle hooks only after human/operator review, and start a new thread.

OpenClaw:

```powershell
clawhub install ponytail
```

These commands are documented for global setup only. They are not bootstrap commands to run automatically inside application repos.

## 7. Bootstrap Acceptance Checklist

- [ ] Repo identity and branch state checked.
- [ ] Existing docs and source-of-truth files inspected.
- [ ] File scope declared.
- [ ] Approval gates identified.
- [ ] Dependency manifests left unchanged unless explicitly approved.
- [ ] Ponytail classified as global agent behavior capability only.
- [ ] No production code modified during bootstrap.
- [ ] No hooks, secrets, env files, runtime state, package files, or lockfiles modified without explicit approval.
- [ ] Validation plan documented before implementation.
