# docs Agent Instructions

## Purpose

This folder owns AJ Digital OS policy, architecture, operations, deployment, release, UI, and system documentation.

## Ownership

- `docs/OPERATING_POLICY.md`, `docs/REPO_SAFETY_POLICY.md`, `docs/IMPLEMENTATION_GATES.md`, and `docs/AGENT_HANDOFF_PROTOCOL.md` are canonical policy docs.
- `docs/system/` contains system-level specifications and standards.
- `docs/architecture/` contains architecture and integration specifications.
- `docs/infrastructure/` contains deployment runtime doctrine, infrastructure adapter specs, and cloud/local runtime standards.
- `docs/protocols/` contains repository bootstrap and cross-agent execution protocols.
- `docs/security/` contains security doctrine for secret handling, remote secret operations, and provider-safe operational workflows.
- `docs/specs/` contains product/module PRDs, Git Spec-ready build specs, and acceptance criteria.
- `docs/knowledge/` contains LLM Wiki, Obsidian-compatible knowledge-layer workflows, and agent-maintained Markdown synthesis rules.
- `docs/ops/` and deployment docs support operator workflows and should not silently override canonical policy.

## Local Contracts

- Root `AGENTS.md` and canonical policy docs control documentation work.
- Keep docs operational, current, and specific enough for another agent or operator to execute.
- Separate facts, inferences, assumptions, risks, and open questions in planning or review docs.
- Do not claim production readiness from docs-only changes or local checks.

## Work Guidance

- Prefer Markdown that is easy for Git Spec and agents to ingest.
- Keep broad policy in parent docs and concrete workflow details in the closest relevant doc.
- Remove stale or contradictory guidance when updating policy.
- Do not rewrite public positioning or business copy without explicit approval.

## Verification

- For docs-only changes, run `git status --short`, `git diff --name-only`, and `git diff --check`.
- Run additional repo-local validation only when docs change declared commands, schemas, or executable examples.

## Child DOX Index

- `architecture/` - architecture, integration, and module traceability specs.
- `deployment/` - deployment and production-readiness documentation.
- `infrastructure/` - deployment runtime doctrine, infrastructure adapter specs, and cloud/local runtime standards.
- `knowledge/` - LLM Wiki, Obsidian-compatible knowledge-layer workflows, and agent-maintained Markdown synthesis rules.
- `ops/` - operational runbooks and secret-hygiene guidance.
- `protocols/` - repository bootstrap and cross-agent execution protocols.
- `security/` - security doctrine for secret handling, remote secret operations, and provider-safe operational workflows.
- `specs/` - product/module PRDs, Git Spec-ready build specs, and acceptance criteria.
- `system/` - system standards, trust layers, and implementation specs.
- `ui/` - UI-specific documentation.
