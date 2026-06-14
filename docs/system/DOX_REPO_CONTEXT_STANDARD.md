# DOX Repo Context Standard

**Type:** Cross-repo documentation and agent-context standard
**Status:** Canonical standard
**Owner:** AJ Digital LLC / Audio Jones
**Applies to:** Every AJ Digital repository
**Primary reference:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md`

## 1. Purpose

DOX is the repo-level operating layer for documentation, agent context, source-of-truth mapping, decision memory, risk memory, task handoff clarity, and standardized agent navigation.

Every AJ Digital repo needs DOX because a repo is not only code and files. A repo is operational infrastructure. It carries product intent, technical constraints, decisions, risks, deployment assumptions, data boundaries, and handoff state. Without those signals, every agent or human operator has to rediscover the same context before work can safely continue.

DOX turns a repository from a loose file tree into an agent-readable operating context. The goal is not documentation volume. The goal is faster, safer, and more transferable repo work across Codex, Claude, Copilot, Hermes, OpenClaw, and future agents.

Core principle:

```txt
Tools are not the system.
Tools are resources governed by the system.
Repositories are infrastructure.
Agents require bounded context, governance, memory, observability, and approval gates.
```

## 2. Scope

This standard applies to every AJ Digital repository, including:

- code repos
- brand repos
- client operations repos
- dashboard repos
- website repos
- automation repos
- research repos
- internal system repos
- agent workflow repos

DOX applies whether the repo is public, private, local-first, client-specific, experimental, or production-facing.

This standard is documentation-first. It does not require application-code changes. Enforcement through hooks, CI, or dashboards may be recommended later, but rollout starts with clear repo context.

## 3. Required DOX Files Per Repo

Every AJ Digital repo must declare these files or a documented equivalent.

| Required file | Purpose |
| --- | --- |
| `README.md` | Human entry point, repo purpose, setup, and key links |
| `AGENTS.md` | Agent operating rules, boundaries, commands, and approval gates |
| `docs/README.md` | Documentation map and reading order |
| `docs/architecture/README.md` | Architecture overview and system boundaries |
| `docs/decisions/README.md` | Decision-log purpose and decision workflow |
| `docs/decisions/DECISION_LOG.md` | Durable record of important repo decisions |
| `docs/risks/RISK_REGISTER.md` | Durable record of known repo risks |
| `docs/context/REPO_CONTEXT.md` | Repo identity, business purpose, dependencies, and status |
| `docs/context/SOURCE_OF_TRUTH.md` | Canonical sources for product, technical, design, env, deployment, and decisions |
| `docs/tasks/HANDOFF.md` | Current work state and restartable handoff |
| `docs/operations/RUNBOOK.md` | Operational commands, setup, recovery, and deployment notes |

Compatibility note: `docs/context/` is a repo-local documentation folder. It is not a root-level `/context/` tree and must not bypass governed memory systems where they already exist. In AJ Digital OS, use the existing Memory Router and `memory/working-context/` where that repo standard says to do so. In simpler repos, `docs/context/` is the minimum context home.

If a repo already has an equivalent canonical file, do not duplicate it. Link to the existing file from the appropriate DOX index and state that it is the source of truth.

## 4. Required `AGENTS.md` Behavior

Every repo-level `AGENTS.md` must tell agents how to work safely in that repo. It must be thin enough to stay current and explicit enough to prevent repeated discovery.

`AGENTS.md` must include:

| Requirement | What it must answer |
| --- | --- |
| Repo purpose | What this repo exists to do |
| Repo boundaries | What belongs here and what does not |
| Allowed agent actions | What agents may inspect, edit, run, or generate |
| Forbidden actions | What agents must not modify or execute |
| Required preflight checks | Branch, status, env assumptions, dependency checks, and docs to read first |
| Test/build commands | The correct local commands and known caveats |
| Source-of-truth references | Links to canonical product, architecture, design, config, deployment, and decision docs |
| Merge/PR rules | Branch naming, review requirements, PR template, commit trailers, or dashboard logging |
| Secret handling rules | No hardcoded secrets, no credential echoing, and no unsafe env-file edits |
| Human approval triggers | Actions requiring explicit operator approval before execution |

Minimum approval triggers:

- deleting files
- overwriting docs or public copy
- mass edits or repo-wide refactors
- production deploys
- secret, credential, or client-data work
- financial actions
- sending communications in the operator's name
- changing deployment config
- modifying CI or release automation
- introducing or reintroducing prohibited platforms such as Firebase where banned

## 5. Required Source-Of-Truth Declaration

Every repo must declare where truth lives. This prevents agent confusion, stale duplicate docs, and accidental changes to the wrong layer.

`docs/context/SOURCE_OF_TRUTH.md` must declare:

| Truth category | Required declaration |
| --- | --- |
| Canonical product/business truth | Offer, product, client, positioning, or operating objective source |
| Canonical technical truth | Architecture, schemas, core modules, and integration contracts |
| Canonical design truth | Brand, UI, content, layout, or design-system source |
| Canonical environment/config truth | Env templates, config schemas, secret-management rules, and local setup source |
| Canonical deployment truth | Hosting provider, deployment target, release process, and rollback source |
| Canonical decision history | Decision log, ADRs, approval records, and accepted-risk records |

If truth lives outside the repo, the declaration must link to the external source and name the owner. If a source cannot be linked safely, name it without exposing secrets or client-private data.

## 6. Required Repo Context File

`docs/context/REPO_CONTEXT.md` must let a new operator or agent understand the repo in under five minutes.

It must explain:

- what this repo is
- what this repo is not
- primary users
- business purpose
- system boundaries
- dependencies
- external services
- data sensitivity
- active projects
- known risks
- current status

Recommended structure:

```md
# Repo Context

## What This Repo Is
## What This Repo Is Not
## Primary Users
## Business Purpose
## System Boundaries
## Dependencies
## External Services
## Data Sensitivity
## Active Projects
## Known Risks
## Current Status
```

The context file should be concrete. Avoid abstract descriptions such as "AI-powered platform" unless the repo's actual workflows, boundaries, and dependencies are also named.

## 7. Required Decision Log

`docs/decisions/DECISION_LOG.md` must capture durable decisions that affect future work.

Required fields:

| Field | Requirement |
| --- | --- |
| Decision ID | Stable identifier such as `DEC-001` |
| Date | Date the decision was made |
| Decision | Concise statement of what was decided |
| Reason | Why this decision was made |
| Alternatives considered | Other serious options and why they were not selected |
| Owner | Person or team accountable for the decision |
| Status | Proposed, Accepted, Superseded, Rejected, or Deprecated |
| Affected files/systems | Repo paths, services, docs, workflows, or systems touched |

Minimum table:

```md
| Decision ID | Date | Decision | Reason | Alternatives Considered | Owner | Status | Affected Files/Systems |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | YYYY-MM-DD |  |  |  |  | Proposed |  |
```

Decision logs are not changelogs. They capture why a path was chosen so future agents do not repeat old debates or undo intentional constraints.

## 8. Required Risk Register

`docs/risks/RISK_REGISTER.md` must capture known risks before they become repeated failures.

Required fields:

| Field | Requirement |
| --- | --- |
| Risk ID | Stable identifier such as `RISK-001` |
| Risk | Clear description of the risk |
| Severity | Low, Medium, or High |
| Likelihood | Low, Medium, or High |
| Mitigation | Current prevention, reduction, or recovery plan |
| Owner | Person or team accountable for mitigation or acceptance |
| Status | Open, Monitoring, Mitigated, Accepted, Blocked, or Closed |

Minimum table:

```md
| Risk ID | Risk | Severity | Likelihood | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-001 |  | Medium | Medium |  |  | Open |
```

For projects using the Founder Intelligence Product Factory register model, link to `docs/system/registers/RISK_REGISTER_TEMPLATE.md` instead of inventing a separate schema.

## 9. Required Handoff File

`docs/tasks/HANDOFF.md` must make work restartable after context loss, tool handoff, or session interruption.

Required fields:

| Field | Requirement |
| --- | --- |
| Current branch | Branch name at time of update |
| Current objective | What the active work is trying to finish |
| Last completed action | Most recent verified action |
| Next recommended action | Concrete next step |
| Blocked items | Decisions, credentials, access, tests, or context gaps blocking progress |
| Files touched | Files changed or under active review |
| Tests run | Commands run and results |
| Human approval needed | Explicit approval required before continuing |

Minimum structure:

```md
# Handoff

## Current Branch
## Current Objective
## Last Completed Action
## Next Recommended Action
## Blocked Items
## Files Touched
## Tests Run
## Human Approval Needed
```

The handoff file should be updated at meaningful state changes, not after every minor edit.

## 10. Adoption Levels

DOX adoption is measured by operational usefulness, not file count alone.

| Level | Name | Definition |
| --- | --- | --- |
| Level 0 | No DOX | Repo has no reliable documentation map, no agent rules, and no declared source of truth |
| Level 1 | Basic DOX | README and AGENTS exist, but context, decisions, risks, and handoff are incomplete or stale |
| Level 2 | Agent-ready DOX | Required files exist, repo purpose is clear, agent boundaries and commands are documented |
| Level 3 | Governed DOX | Source-of-truth, approval gates, decision history, risk register, and PR rules are active |
| Level 4 | Observable DOX | DOX state is connected to checks, dashboards, task logging, or automated validation |

Target state for most active repos is Level 3. Level 4 is recommended for production-facing, client-facing, automation-heavy, or multi-agent repos.

## 11. Acceptance Checklist

A repo is DOX-adopted only when:

- all required files exist or documented equivalents are linked
- `AGENTS.md` gives accurate repo instructions
- source of truth is declared
- decision log exists
- risk register exists
- handoff file exists
- commands are documented
- secrets are not exposed
- docs are linked from `README.md`
- an agent can understand repo purpose in under five minutes
- approval triggers are explicit
- repo boundaries are clear
- deployment truth and rollback source are named where deployment exists

The acceptance check must distinguish between:

- **facts:** verified files, commands, configs, and links
- **inferences:** likely repo behavior based on structure or naming
- **assumptions:** unverified context that needs operator confirmation
- **gaps:** missing or stale context

## 12. Rollout Process

Use this safe per-repo rollout sequence:

1. Create branch `docs/dox-adoption`.
2. Inspect the repo before writing.
3. Identify existing docs and canonical equivalents.
4. Add missing DOX files.
5. Link similar docs instead of duplicating them.
6. Do not rewrite product code.
7. Do not alter env files.
8. Do not modify secrets.
9. Do not change deployment config unless explicitly approved.
10. Do not modify CI unless the approved task is DOX enforcement.
11. Run available documentation, lint, typecheck, or build checks when appropriate.
12. Produce an adoption report.
13. Open a PR.

Default branch:

```bash
git checkout -b docs/dox-adoption
```

If the repo already has active uncommitted work, stop and report the dirty state before creating or switching branches.

## 13. Adoption Report Format

Every DOX rollout must end with an adoption report.

```md
# DOX Adoption Report

## Repo Name

## Adoption Level Before

## Adoption Level After

## Files Created

## Files Modified

## Source-Of-Truth Declarations Added

## Risks Found

## Commands Documented

## Human Approval Needed

## Next Repo Recommendation
```

The report must also state what was not touched:

- application code
- package files
- CI
- env files
- secrets
- deployment config
- unrelated docs

## 14. Final Doctrine

Every repo must explain itself.

Every agent must know the boundary.

Every decision must be recoverable.

Every risk must be visible.

Every handoff must be restartable.

Every source of truth must be declared.

DOX is not README cleanup. DOX is the repo operating layer that makes AJ Digital work safer, clearer, and transferable across humans, agents, and tools.
