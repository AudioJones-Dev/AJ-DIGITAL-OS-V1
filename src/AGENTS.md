# src Agent Instructions

## Purpose

This folder owns AJ Digital OS application source code, CLI commands, runtime modules, Hermes surfaces, BEL/MCP execution layers, security, services, providers, and UI source modules.

## Ownership

- Keep implementation aligned with existing TypeScript patterns and module boundaries.
- Protected runtime/core areas include Hermes core logic, model-router logic, BEL/runtime execution logic, MCP policy, approval enforcement, attribution behavior, and existing API route behavior.
- Source changes must be backed by focused validation from `.codex/validation.json`.

## Local Contracts

- Read relevant source signatures before editing.
- Do not refactor broad modules, change protected execution behavior, or add new architecture without explicit approval.
- Preserve TypeScript strictness and existing public contracts.
- Do not introduce secret handling or credential reads without explicit approval and a secret-safe plan.

## Work Guidance

- Match local naming, exports, error handling, and test patterns.
- Keep patches small and reversible.
- Add or update tests when behavior changes.
- Prefer additive integration points over modifying core execution paths.

## Verification

- For source changes, use the applicable `.codex/validation.json` set.
- Default app validation is `npm run typecheck`, `npm test`, and `npm run build` unless scope supports a smaller targeted check.
- Report any skipped validation and why.

## Child DOX Index

- `crm/` - tenant-native CRM foundation types, tenant context guards, and tenant-scoped stores.

Other source domains are not yet subdivided by child `AGENTS.md` files. Before editing, inspect the nearest module files and tests for local conventions.
