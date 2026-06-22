# Agent Runtime Standard

**Type:** Agent runtime doctrine
**Status:** Draft standard
**Owner:** AJ Digital LLC / Audio Jones
**Updated:** 2026-06-22
**Scope:** Agent behavior layers, runtime harnesses, approval boundaries, and coding-assistant defaults

## 1. Purpose

This standard defines how AJ Digital OS expects coding agents and agent harnesses to behave before they modify docs, code, runtime configuration, or operational systems.

It applies to Claude Code, Codex, Copilot, OpenClaw, Hermes-adjacent workflows, and any supported coding agent used in AJ Digital repositories.

## 2. Runtime Authority

Agent runtimes are execution surfaces, not sources of authority.

Authority flows from:

1. Current human instruction.
2. Repo-local `AGENTS.md`.
3. Canonical policy docs.
4. Architecture specs, contracts, tests, and source code.
5. Approved global toolchain standards.

Agent plugins, skills, hooks, MCP tools, or behavior layers may improve execution, but they do not grant permission to bypass repository policy.

## 3. Default Coding Behavior Layer

Ponytail is approved as an optional/default coding behavior layer for Claude Code, Codex, OpenClaw, and supported coding agents.

Classification:

```txt
Ponytail = Global Agent Behavior Capability
Ponytail != Repo Runtime Dependency
```

When active, Ponytail should push agents through this implementation ladder:

1. Does this need to exist?
2. Can existing code be deleted or reused?
3. Does the standard library or platform already solve it?
4. Does an installed dependency already solve it?
5. Can the minimum viable implementation solve it?
6. Only then, add new code.

The ladder is compatible with AJ Digital OS only when it preserves required validation, security, accessibility, error handling, auditability, and data-loss protections.

## 4. Override Rule

Ponytail does not supersede:

- AJ Digital OS governance
- repo-local `AGENTS.md`
- human approval gates
- security and secret-handling policies
- architecture specs
- implementation gates
- test and validation requirements
- accessibility requirements
- data-loss protections
- production deployment controls
- protected runtime boundaries

If Ponytail guidance conflicts with AJ Digital OS policy, AJ Digital OS policy wins.

## 5. Runtime Safety Rules

Agents operating with Ponytail or any similar behavior layer must:

- inspect before editing
- declare file scope before changes
- prefer minimal patches over broad rewrites
- avoid new dependencies unless the repo already requires them or approval is granted
- preserve existing naming, architecture, public copy, and repo conventions
- stop before hook activation, global tool configuration, secret work, production deploys, destructive operations, or package changes
- report what was validated and what was not validated

Agents must not:

- treat fewer lines as automatically better
- remove validation, security checks, error handling, accessibility, audit logging, or rollback safeguards to reduce code size
- install plugins, trust hooks, or change global tool settings without operator approval
- add Ponytail to a repo package manifest to make an agent behavior preference portable

## 6. Install And Trust Boundary

Ponytail installation is a global toolchain action.

Documented install commands:

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

Then install from `/plugins`, review `/hooks`, trust the Ponytail lifecycle hooks only after human/operator review, and start a new thread.

OpenClaw:

```powershell
clawhub install ponytail
```

Human/operator approval required:

- plugin marketplace addition
- plugin installation
- lifecycle hook trust
- any global default-mode configuration
- any environment variable or global config file change

## 7. Validation Standard

When Ponytail influences an implementation, validation still follows repo policy.

Minimum final report:

- files changed
- dependencies changed, if any
- validation commands run
- validation results
- commands intentionally skipped and why
- risks or remaining assumptions
- whether Ponytail influenced deletion, reuse, or dependency avoidance decisions

Docs-only adoption of this standard does not prove runtime behavior. Runtime behavior must be validated after the operator installs and trusts the plugin in each host agent.

## 8. Adoption Status

Status: Adopted as global/harness-level capability only.

No application dependency is approved by this standard.

No production code, package manifest, lockfile, hook, secret, runtime state, or deployment setting is changed by this standard.
