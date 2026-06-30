# connectors Agent Instructions

## Purpose

This folder owns the AJ Digital OS connector layer (L3 — Connector / Driver Layer): the typed connector contract, the file-backed registry, the guarded executor, attribution emission, and the per-provider adapters that represent external tools (Google, GitHub, Airtable, email/webhook, and Social Ops providers).

Connectors are deliberately "dumb but safe" drivers. They normalize one provider's surface into the `OSConnector` / `ConnectorAdapter` contract. Policy decisions — approval, tenant authority, attribution — live in the executor and higher layers, not inside an adapter.

## Ownership

- `connector-types.ts` — the shared contract (`OSConnector`, `ConnectorAdapter`, `ConnectorInput/Result`, capability/risk/auth enums). Treat as a protected contract: do not modify the public shapes without explicit approval. Extend behavior via payload metadata, not by widening these types casually.
- `connector-registry.ts` — file-backed registry (`AJ_CONNECTOR_REGISTRY_PATH`, defaults to `runtime/connectors/registry.json`). Disabled-by-default semantics.
- `connector-executor.ts` — the single guarded entry point. Owns the block order: not-found → disabled → tenant-gate → adapter execute → audit + attribution. Do not bypass it.
- `connector-attribution.ts` — fire-and-forget attribution. Must never throw into control flow.
- `adapters/` — one file per provider, `<provider>.connector.ts`, registered in `adapters/index.ts`.

## Local Contracts

- **Adapters are disabled by default.** Every adapter's `META.enabled` is `false`. Enabling is a registry/runtime decision, never a code default.
- **No network in stubs.** A stub adapter returns deterministic local data when `environment === "local"` and returns a `not configured — <ENV_VAR> required` error otherwise. Do not call external APIs from a stub.
- **No credentials in code.** Read secrets only via `process.env` inside the live (non-local) branch, by reference name. Never hardcode tokens, keys, or client data, and never log them.
- **Risk level is a safety property, not a label.** It drives the executor tenant-gate (`riskLevel !== "low"` requires `tenantId` outside local/dev). Set it to match the doctrine and the real-world blast radius.
- **Capabilities are the allow-list.** Only list `ConnectorCapability` values the adapter actually handles. Reject unlisted/unsupported actions with an explicit error. Read-only providers must reject writes even in local env (see `google-ads.connector.ts`).
- **Fine-grained verbs ride in the payload.** The generic `ConnectorCapability` union stays small; provider-specific operations (e.g. `social.post.schedule`) travel in `payload`, per the Social Ops architecture spec.
- A new adapter is registered in BOTH `CONNECTOR_ADAPTERS` and `DEFAULT_CONNECTORS` in `adapters/index.ts`, and re-exported there.

## Work Guidance

- Match the existing adapter shape: a `const META: OSConnector` plus an exported `ConnectorAdapter` whose `execute(action, payload, environment)` switches on `action` and always spreads `...base` (`{ connectorId, action, executedAt }`) into every result.
- Keep patches additive and reversible — prefer a new adapter file over changing the executor or types.
- Add or update tests in `tests/connectors/` for any new adapter or behavior change.

## Social Ops Connectors

Social Ops providers (`postiz`, `canva`, `meta-organic`, `google-ads`, and future organic/paid platforms) are governed by:

- `docs/specs/social-ops-mcp-orchestration-prd.md`
- `docs/architecture/social-ops-connector-architecture.md`
- `docs/knowledge/wiki/social-ops-doctrine.md`

These remain stubs (disabled, local-only, no network) until live wiring is separately approved. MCP availability does not equal execution approval. Creative tools never publish; schedulers never publish without approval; paid/organic mutations are restricted and approval-gated upstream.

## Verification

- Default validation: `npm run typecheck`, `npm test` (or `npx vitest run tests/connectors` for a targeted pass), and `npm run build`.
- Tests must prove disabled-by-default, local-stub behavior, tenant gating for non-low risk, credential gating outside local, and rejection of unsupported/disallowed actions.
- Report any skipped validation and why.
