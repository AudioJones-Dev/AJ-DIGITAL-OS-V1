# AJ Digital OS Decision Hook Protocol

**Version:** 1.0
**Updated:** 2026-06-13
**Owner:** AJ Digital LLC
**Status:** Source-backed protocol; not a global hook installation

---

## 1. Purpose

This protocol turns the operator decision profile into a shared contract for Codex, Claude, and future AJ Digital OS agents.

It defines how agents decide what they may execute, what they may recommend, what they must log, and what remains operator-owned.

This document does not install, activate, or enforce a global Codex or Claude hook.

---

## 2. Source Of Truth

Runtime source:

- `src/decision/operator-decision-profile.ts`

Test coverage:

- `tests/decision/operator-decision-profile.test.ts`

Related policy:

- `docs/OPERATING_POLICY.md`
- `docs/REPO_SAFETY_POLICY.md`
- `docs/IMPLEMENTATION_GATES.md`
- `docs/AGENT_HANDOFF_PROTOCOL.md`
- `.codex/STOP_HOOK_PROPOSAL.md`

---

## 3. Operator Decision Profile

| Dimension | Operating Pattern | Agent Behavior |
|---|---|---|
| Ideation | Problem or pain first, doctrine second | Start from the operating pain and desired outcome |
| Conviction | Recommended safe option plus reasoning | Recommend one path and show the tradeoffs |
| Green-light zone | Reversible internal work can proceed | Do the work inside declared scope and log it |
| Execution layer | Technical execution is delegated | Make repo-grounded calls on tooling, stack, naming, and sequencing |
| Operator-owned layer | Brand voice and doctrine stay with the operator | Draft or recommend only; do not finalize without approval |
| Tempo | Fast, then iterate inside safe boundaries | Prefer small reversible moves |
| Scarcity priority | Unblock the most work | Choose the action that increases downstream throughput |
| Reasoning | Full reasoning every time | Separate facts, inferences, assumptions, risks, and rationale |

---

## 4. Decision Hook Matrix

| Input Signal | Authority | Required Behavior |
|---|---|---|
| Reversible internal work | `do_and_log` | Proceed within declared scope, validate, and report |
| Execution-layer choice | `make_the_call` | Inspect existing patterns, choose the recommended path, validate |
| Brand voice, public copy, doctrine, or principles | `keep_the_pen` | Draft or recommend only; wait for operator approval |
| Destructive, secret, production, external, global hook, or agent config work | `requires_approval` | Stop, show rollback and risk, wait for approval |
| Ambiguous authority | `requires_approval` | Pause until scope, reversibility, and decision owner are clear |

---

## 5. SOP For Agents

1. Classify the action using `evaluateOperatorDecisionHook`.
2. If authority is `do_and_log`, execute only the declared reversible internal scope.
3. If authority is `make_the_call`, choose the implementation path from repo evidence and existing conventions.
4. If authority is `keep_the_pen`, produce drafts or recommendations but do not finalize operator voice or doctrine.
5. If authority is `requires_approval`, stop before execution and request the operator approval word.
6. In every case, include full reasoning, validation, changed files, risks, and next decision in the handoff.

---

## 6. Boundaries

This protocol is advisory source code and documentation until a separate approved hook implementation connects it to a global or repo-local automation surface.

Approval is still required before:

- Installing or enabling global Codex or Claude hooks.
- Switching any hook from observe/advisory mode to enforcement mode.
- Editing global agent settings.
- Changing runtime approval enforcement behavior.
- Modifying secrets, production systems, public copy, or destructive workflows.

---

## 7. Cross-Agent Use

Codex and Claude should both treat the profile as the same decision contract:

- Codex should use it before repo edits, validation, and handoff.
- Claude should use it before strategy, architecture, workflow, and hook recommendations.
- Both agents should log decisions in a form that preserves action, authority, reasoning, validation, and next operator step.

The protocol compounds behavior across agents by making the same decision assumptions explicit, testable, and reviewable.
