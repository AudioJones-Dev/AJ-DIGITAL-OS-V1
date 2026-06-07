# AJ Digital OS — Agentic Context Engineering Standard

**Type:** System-level operating doctrine (governance SPEC)
**Status:** Active
**Owner:** Audio (Tyrone Alexander Nelms) — AJ Digital LLC
**Location:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md`
**Applies to:** All agents operating in this repo (Claude, Codex, Hermes, and any future agent), and all human-in-the-loop development.

---

## 1. Purpose

AI-assisted development succeeds through **durable context, explicit architecture, review loops, governed memory, and recovery protocols** — not through one-off prompts or tool-specific magic.

This document is the canonical standard for how agentic work is performed in AJ Digital OS. It does **not** introduce a new folder pattern. It **maps** a validated agentic workflow onto the governance spine that already exists in this repo, marks the gaps, and defines the non-negotiable rules every agent and operator must follow.

## 2. Scope

In scope:

- The canonical agentic loop and when it is broken.
- The source-of-truth mapping between agentic concepts and existing repo locations.
- Agent startup, context retrieval, architect-before-edit, approval-gate, memory-writeback, and recovery protocols.
- The session closeout standard.
- The current gap register.

Out of scope:

- Creating a parallel `/context/` tree (explicitly rejected — see §5).
- Renaming, moving, or deleting existing doctrine, specs, memory, or config.
- Any code, hook, or config change. This document is doctrine, not implementation.
- Introducing any vendor or platform as canonical without architecture review.

## 3. The Canonical Loop

```txt
Context → Architect → Build → Review → Imprint → Remember → Digest
```

When the loop is broken (bug, failed build, contradiction, stalled run):

```txt
Recover before refactor
```

No stage may be skipped on serious work. "Serious work" = any change to architecture, schema, public copy, multi-file behavior, governance, or memory. Trivial, reversible, single-file edits may compress stages but must still respect the approval gate (§8) and closeout (§9) when meaningful.

## 4. Source-of-Truth Mapping (map, do not duplicate)

AJ Digital OS already governs context. Agents read context from the **existing** locations below. These are canonical. Do not create new files that duplicate them.

| Agentic concept | Canonical AJ Digital OS source of truth | Status |
| --- | --- | --- |
| Project overview | `README.md`, `docs/system-architecture.md` | Present |
| Architecture | `docs/architecture/*`, `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md` | Strong |
| Build plan / roadmap | `docs/phase-1-production-hardening-plan.md`, `docs/post-v0.1.0-roadmap.md` | Present |
| Code standards | `tsconfig.json`, `vitest.config.ts` (no written standard doc) | **Gap — see §11** |
| Library / reuse patterns | `skills/*.skill.md` (partial) | **Gap — see §11** |
| UI tokens | `docs/ui/design-token-system.md` | Present |
| UI rules | — | **Gap — see §11** |
| UI / component registry (Imprint) | — | **Gap — see §11** |
| Progress tracker | `BUILD-PROGRESS.md` (stale snapshot — see §12), `STARTUP_PROTOCOL_STATUS.md` | **Gap — living ledger missing, see §11** |
| Working context | `memory/working-context/working-context.md` | Strong |
| Governed memory | `memory/` (Memory Router) — `decisions/`, `logs/`, `mistakes/`, `run-logs/`, `sops/`, `schemas/frontmatter/`, `MEMORY.md` | Strong |
| Per-agent retrieval policy | `memory/retrieval/retrieval-policy-{claude,codex,hermes,agent-default}.json` | Strong |
| Recovery | `docs/recovery-playbook.md` | Strong |
| Operator procedures | `docs/operator-playbook.md` | Strong |
| SOPs | `memory/sops/` (approval-gated) | Present |
| Review / validation | `docs/system/AJ_DIGITAL_OS_REPO_VALIDATION_REPORT.md`, `.github/pull_request_template.md`, `.codex/hooks.json` → `repo_policy.py` | Present |

## 5. No Parallel `/context/` Tree

A flat root `/context/` folder is **rejected**. AJ Digital OS deliberately splits durable context into a governed `memory/` Router plus `docs/architecture/`. Creating `/context/` would:

- fragment source-of-truth and produce stale duplicates of `docs/architecture/` and `memory/working-context/`;
- bypass the per-agent retrieval-policy governance;
- violate AJ Digital OS source-of-truth discipline and the no-tool-sprawl principle.

Context is mapped (§4), not copied.

## 6. Agent Skill Mapping

| Agentic skill | AJ Digital OS equivalent |
| --- | --- |
| Architect | PRD / task spec / implementation plan (`docs/product/`, `docs/architecture/`) |
| Review | Review / Diagnosis audit (`docs/system/AJ_DIGITAL_OS_REPO_VALIDATION_REPORT.md`, PR template, `repo_policy.py`) |
| Recover | Failure-mode diagnosis before refactor (`docs/recovery-playbook.md`) |
| Remember | Session memory / decisions / digest (`memory/`, `memory/decisions/`) |
| Imprint | UI / component / design pattern update (`docs/ui/design-token-system.md`; registry is a gap) |

## 7. Agent Startup & Context Retrieval Protocol

Before any implementation, every agent must:

1. Read this standard.
2. Load the correct per-agent retrieval policy from `memory/retrieval/` (`claude`, `codex`, `hermes`, or `agent-default`). Agents read memory **only** through the governed Router and policy — never the full vault directly.
3. Confirm current repo state (branch, recent commits, working tree) before reasoning about changes.
4. Identify missing or stale context **before** building. If context is missing, surface it; do not improvise.
5. Pull `memory/working-context/working-context.md` for the active objective, decisions already made, constraints, and "do not do" items.

## 8. Architect-Before-Edit & Approval Gate

- **Architect before edit.** No complex or multi-file change begins without an architecture plan or PRD/task spec referencing existing architecture and naming conventions.
- **Pre-edit report.** Before changing files, produce: repo inspection summary, existing doctrine found, gaps, proposed files, exact change plan, risk level, rollback plan, and open questions.
- **Approval gate.** No serious or irreversible action proceeds without the explicit word **`proceed`** from the operator. No "proceed" = no action.
- **Prefer additive and reversible** changes. Never silently overwrite prior decisions, naming, architecture, or repo conventions.
- Respect repo hooks and approval gates (`.codex/hooks.json` → `repo_policy.py`, `.github/pull_request_template.md`). Honor the standing constraints: no hardcoded secrets, Firebase must not be reintroduced, no new vendor becomes canonical without architecture review.

## 9. Memory Writeback / Session Closeout Standard

Every meaningful agent session must end with a closeout block, recorded to the appropriate `memory/` location through the Router (decisions → `memory/decisions/`, failures → `memory/mistakes/`, run state → `memory/run-logs/`, active objective → `memory/working-context/`):

```txt
Completed work:
Files changed:
Decisions made:
Open issues:
Risks:
Next action:
Memory updated:
Progress tracker updated:
Review status:
```

This closeout block is the canonical living progress mechanism going forward (superseding the stale snapshot in §12).

## 10. Recovery Protocol

When a bug, failed build, stalled run, or contradiction appears, **recover before refactor**. The authoritative manual is `docs/recovery-playbook.md`. Procedure:

1. Identify the failure mode (the playbook defines categories: `validation_failed`, `pending_approval_stuck`, `approval_rejected`, `execution_denied`, `execution_skipped`, and code/environment failures).
2. Determine whether the cause is: missing context, stale context, wrong assumption, dependency/version mismatch, architecture violation, implementation bug, environment/config issue, or test/build failure.
3. Propose the **smallest safe fix**.
4. Do not refactor broadly unless the diagnosis proves a refactor is required.
5. Record the failure and the fix to `memory/mistakes/` and the session closeout.

## 11. Gap Register

These elements of the agentic standard have no canonical home yet. They are recorded here as open gaps — **no empty stubs are created** (stubs go stale). Each requires its own approved task before a file is added.

| Gap | Intended home (proposed, not yet created) | Notes |
| --- | --- | --- |
| Written code standards | `docs/system/` or `CONTRIBUTING.md` | Only `tsconfig`/`vitest` config exist today. |
| Library / reuse patterns | consolidate from `skills/*.skill.md` | Currently scattered. |
| UI rules | `docs/ui/` | Tokens exist; rules do not. |
| UI / component registry (Imprint) | `docs/ui/` | No component registry — Imprint loop is incomplete. |
| Living progress ledger | adopt §9 closeout into `memory/` | Replaces the stale snapshot (§12). |

## 12. Legacy Progress Snapshot Notice

`BUILD-PROGRESS.md` (repo root) is a **stale legacy progress snapshot** (dated 2026-04-11, predating the current HEAD). It is retained for history and is **not** deleted or overwritten. It must not be treated as current state. All future progress tracking follows the living session-closeout / progress-ledger standard defined in §9 (once that ledger is implemented per §11).

## 13. Non-Negotiable Rules

1. No serious implementation begins without context.
2. No complex feature begins without an architecture plan.
3. No completed feature is accepted without review.
4. No broken session triggers a broad refactor before recovery diagnosis.
5. No UI/component change is complete until registry/design patterns are updated (once the registry exists — see §11).
6. No session ends without a memory/progress update when meaningful work occurred.
7. No agent may overwrite existing doctrine, naming, architecture, or repo conventions without explicit approval.
8. No new vendor/platform becomes canonical without architecture review.
9. No hardcoded secrets, ever. Firebase must not be reintroduced.
10. Agents read memory only through the governed Memory Router and the correct retrieval policy.

## 14. Rollback

This document and the three root instruction files (`AGENTS.md`, `CLAUDE.md`, `CODEX.md`) are purely additive markdown. To roll back:

```bash
git rm docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md AGENTS.md CLAUDE.md CODEX.md
# or, if already committed:
git revert <commit-sha>
```

No code, schema, hook, config, or memory governance is touched. Rollback requires no data migration.
