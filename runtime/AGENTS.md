# runtime Agent Instructions

## Purpose

This folder owns runtime state surfaces, local execution artifacts, connector state, policy snapshots, and generated operational data used by AJ Digital OS.

## Ownership

- Runtime files are operational state unless explicitly promoted to source documentation or fixtures.
- JSONL logs, generated snapshots, caches, and local execution records are not source-of-truth policy by default.

## Local Contracts

- Root `AGENTS.md` and `docs/REPO_SAFETY_POLICY.md` apply strictly here.
- Do not edit runtime state unless the task explicitly scopes runtime-state maintenance.
- Do not stage or commit generated runtime artifacts by default.
- Do not inspect or expose secret-bearing runtime values.

## Work Guidance

- Prefer read-only diagnosis for runtime state.
- If a runtime artifact must be changed, declare the exact file scope and rollback path first.
- Treat connector and retrieval state as potentially sensitive operational data.
- Keep generated output separate from durable source files.

## Verification

- For approved runtime-state maintenance, run the smallest command that verifies the affected surface.
- Always report changed runtime files separately from source or docs files.

## Child DOX Index

- `connectors/` - connector registry and audit state.
- `normalization/` - runtime normalization data.
- `retrieval/` - retrieval and operational graph state.
- `cache/`, `dag/`, `decision/`, `events/`, `idempotency/`, `observability/`, and `policies/` - runtime support state.
