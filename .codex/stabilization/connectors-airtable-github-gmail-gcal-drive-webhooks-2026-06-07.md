# Connectors Airtable / GitHub / Gmail / GCal / Drive / Webhooks Stabilization Note

Date: 2026-06-07
Owner: Codex
Task: Connectors (Airtable/GitHub/Gmail/GCal/Drive/webhooks)

## Scope

- Confirmed connector adapter coverage for:
  - Airtable
  - GitHub
  - Gmail
  - Google Calendar
  - Google Drive
  - Webhook
- Confirmed registry and executor surfaces exist under `src/connectors`.
- Confirmed CLI command surface exists in `src/commands/connector.commands.ts`.
- Confirmed Hermes connector routes exist in `src/hermes/hermes-status-api.ts`.
- Confirmed dashboard connector page exists at `dashboard/app/connectors/page.tsx`.

## Current Implementation State

- Adapters are registered through `src/connectors/adapters/index.ts`.
- Default connectors are disabled by default.
- Executor gates disabled connectors and requires `tenantId` for non-low-risk connectors outside local/dev environments.
- Executor writes JSONL audit events and emits connector attribution events without making attribution failure fatal.
- Local adapter execution uses stubbed safe responses unless the webhook connector is executed outside local mode with a URL.

## Validation

- `npm run test -- tests/connectors/connector.test.ts` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

## Pending Gap

- Runtime-output isolation remains pending. Connector registry/audit persistence currently writes to `runtime/connectors/`, and validation leaves `runtime/connectors/` as local runtime output. This was not staged or committed.
