# Global Toolchain Standard

**Type:** Cross-agent toolchain doctrine
**Status:** Draft standard
**Owner:** AJ Digital LLC / Audio Jones
**Updated:** 2026-06-22
**Scope:** Claude Code, Codex, Copilot, OpenClaw, Hermes-adjacent workflows, and supported AI coding agents

## 1. Purpose

This standard defines how AJ Digital OS classifies global agent tools, behavior layers, plugins, skills, and local harness capabilities.

The goal is to keep application repositories clean while still allowing agents to use approved global capabilities that improve execution quality, reduce overbuild, and preserve governance.

## 2. Classification Model

| Classification | Meaning | Repo handling |
| --- | --- | --- |
| Global agent behavior capability | Tooling that changes how an agent reasons, reviews, or edits | Install at agent or harness level; do not vendor into application repos |
| Repo runtime dependency | Package required by application code at runtime | Add only through normal dependency approval |
| Repo development dependency | Package required by repo-local build, lint, test, or generation workflows | Add only when the repo explicitly needs it |
| Documentation standard | Markdown policy, protocol, or operating instruction | Keep in repo docs when it governs this repo |
| Experimental adapter | External integration under evaluation | Keep disabled or instruction-only until approved |

## 3. Ponytail Capability Standard

Ponytail is classified as a global agent behavior capability.

It SHALL be installed at the agent or harness level for Claude Code, Codex, and supported AI coding agents when the operator approves plugin installation and hook trust prompts.

Repositories SHALL be Ponytail-compatible but SHALL NOT vendor or require Ponytail as an application dependency unless a separate repo-specific justification is approved.

Purpose:

- reduce over-engineering
- prefer deletion over addition
- prefer standard library and native platform features
- avoid unnecessary dependencies
- force agents to question whether code needs to exist
- preserve validation, security, accessibility, and data-loss protections

Ponytail may guide implementation behavior, but it does not override:

- AJ Digital OS governance
- human approval matrix
- security policy
- test and validation requirements
- repository-specific architecture specs
- protected runtime boundaries
- secret-handling rules

## 4. Current Source Review

Primary source reviewed: <https://github.com/DietrichGebert/ponytail>

Observed facts from the upstream README on 2026-06-22:

- Ponytail ships adapters or rules for multiple coding agents, including Claude Code, Codex, Copilot, OpenClaw, OpenCode, Gemini, Cursor, Windsurf, Cline, Aider, Kiro, Zed, and CodeWhale.
- The upstream README documents Claude Code installation through `/plugin marketplace add DietrichGebert/ponytail` and `/plugin install ponytail@ponytail`.
- The upstream README documents Codex installation through `codex plugin marketplace add DietrichGebert/ponytail`, followed by installing from `/plugins`, reviewing `/hooks`, trusting two lifecycle hooks, and starting a new thread.
- The upstream README states that Node.js must be available on the non-interactive shell PATH for the Claude Code and Codex lifecycle hooks.
- The upstream README presents benchmark claims as directional evidence, not AJ Digital doctrine-grade proof.

## 5. Install Commands To Document

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

Then, inside Codex:

```txt
/plugins
/hooks
```

Operator steps:

- install Ponytail from the Ponytail marketplace
- review the lifecycle hooks
- approve hook trust prompts only if the hook source matches the expected Ponytail plugin
- start a new thread after trust is complete

OpenClaw:

```powershell
clawhub install ponytail
```

## 6. Prohibited Repo Actions

Do not add Ponytail to:

- `package.json`
- lockfiles
- application runtime imports
- production code
- CI as a required application dependency
- repo-local hooks that bypass AJ Digital OS approval gates

Do not modify global Claude, Codex, Copilot, OpenClaw, MCP, or skill configuration from inside this repo without explicit operator approval.

## 7. Adoption Decision

Decision: Adopt Ponytail at the global harness level only.

Rationale:

- It aligns with AJ Digital OS principles: no overbuild, no noise, validation before implementation, and governance before execution.
- Its behavior is useful across multiple agents and should not be tied to any single application repo.
- The tool injects agent behavior and hooks, so installation remains an operator-approved global toolchain action.
- The benchmark claims are promising but remain external evidence, not proof that overrides local validation.

## 8. Acceptance Checklist

- [ ] Ponytail is documented as a global agent behavior capability.
- [ ] Ponytail is not added as an application dependency.
- [ ] Claude Code install commands are documented.
- [ ] Codex install commands and hook trust steps are documented.
- [ ] OpenClaw install command is documented.
- [ ] Override rule preserves AJ Digital OS governance, security, architecture, approval, and validation standards.
- [ ] Human/operator approval remains required for plugin trust and global tool configuration.
