# Integrations And Secrets Spec

## Purpose

This document defines the integration, channel, connector, and secret-handling
model for AJ Digital OS: what a channel adapter is, what a connector is, how the
two differ, and how configuration stays separated from secret material.

The conceptual model below remains canonical. The original 2026-04 framing of
this document as scaffold-only does not: parts of it shipped, and they shipped
through modules other than the type scaffold this document was written
alongside. See Implementation Status.

## Implementation Status

Last reconciled against the codebase: 2026-08-31.

| Area | Status | Where it lives |
|---|---|---|
| Connectors | **Implemented** | `src/connectors/` — registry, executor, attribution, adapters |
| Channel adapters | **Partially implemented** | `src/telegram/`, `src/control-plane/`, and the `assistant-shell` CLI |
| Config/secret separation | Canonical, implemented | `src/secrets/`, live schemas using `SecretReference` |
| Raw secret persistence | **Not implemented, by design** | `FileSecretsProvider` throws on raw read/write |
| OAuth and token flows | **Not implemented** | connectors declare `authType`; no flow exists |
| Settings editor / UI surface | Not implemented | — |

The type scaffold this document was originally written against
(`src/integrations/integration-registry.ts`, `integration-types.ts`,
`connector-types.ts`, `channel-adapter-types.ts`) was never imported by any
module and was removed in PR #130. The concepts it described survive in the
implementations named above; only the unused type declarations are gone.

## Core Terms

### Channel Adapter

A channel adapter is the conversation surface where a user or operator sends and receives messages with AJ Digital OS.

Implemented today in `src/telegram/` (bot, types, formatters) together with
`src/control-plane/` (authorization allowlist, CLI and Ollama adapters), and in
the `assistant-shell` CLI command. There is no shared channel-adapter
interface; each surface is implemented directly.

Examples:

- terminal shell
- future local web chat
- Discord bot surface
- Telegram bot surface
- later WhatsApp surface

Channel adapters are about conversation transport and interaction behavior:

- inbound message normalization
- outbound response rendering
- attachment/thread capability flags
- typing/presence semantics
- routing a message into the assistant runtime

### Connector

A connector is a scoped integration for external account access or data operations.

Implemented today in `src/connectors/`: `connector-registry.ts` owns
registration and enable/disable state, `connector-executor.ts` runs capability
calls, and `src/connectors/adapters/` holds the individual connectors. The
registry is exposed over HTTP by `hermes-status-api` at `/connectors/audit`.
Adapters vary in maturity — some perform real calls, others return stubs.

Examples:

- email account access
- social account publishing access
- calendar read/write access
- file storage access
- CRM access

Connectors are about system capabilities and account-scoped operations:

- reading or writing third-party data
- sync and polling behavior
- account scopes and permissions
- token and credential references
- settings and capability declarations

### Difference Between Channels And Connectors

Channels are where the conversation happens.

Connectors are what the system can access or act on.

Examples:

- Discord as a bot conversation surface is a channel adapter.
- A Discord server management integration with stored bot credentials is a connector-like account relationship.
- A future local web UI chat is a channel adapter, not a connector.
- Google Calendar access is a connector, not a channel adapter.

## Configuration Model

The current scaffold separates configuration from secret material.

### Stored In Config

Config records may safely store:

- integration id and display name
- channel or connector type
- enabled or disabled state
- auth strategy name
- non-secret settings
- capability declarations
- health/status information
- references to secret material

Config must not store:

- raw API keys
- raw OAuth refresh tokens
- raw bot tokens
- raw session cookies

### Stored In Secret Storage

Secret storage is for raw secret material only, such as:

- API keys
- OAuth client secrets
- OAuth refresh tokens
- bot tokens
- signing secrets
- local encryption keys

This patch does not implement real secret persistence. It introduces interfaces plus a local file-backed metadata scaffold only.

## Secret Reference Model

Integrations should refer to secret material through secret references instead of embedding credentials in config.

Recommended reference shape:

- `provider`: which secrets provider owns the record
- `secretId`: stable id used by the secrets provider
- `purpose`: what the secret is for
- `field`: which logical field in the integration auth model uses it
- `version`: optional rotation/version marker

## Local Secret Storage Strategy

### Current Scaffold

The current local secrets scaffold is:

- directory: `data/secrets/`
- provider: `FileSecretsProvider`
- persisted data: metadata manifest only
- raw secret reads/writes: intentionally not implemented

This is deliberate so AJ Digital OS can define secret references and settings flows without pretending that plaintext file secret storage is production-safe.

### Target Secure Local Model

The intended local secure model should later support:

- OS-native secure credential storage where available
- an optional locally encrypted file vault fallback
- a user-supplied local encryption key or passphrase flow
- secret rotation/version metadata
- audit-friendly metadata without exposing secret values

Recommended future local provider priority:

1. OS secure storage abstraction
2. encrypted local file vault fallback
3. migration tooling for older local metadata records

## Token And OAuth Handling

OAuth and token handling are still not implemented. Connectors declare an
`authType` (including `"oauth"`), but no OAuth flow, callback handler, or
token refresh exists behind that declaration.

### Known Divergence

Live connectors that perform real calls read credentials directly from
environment variables rather than through `SecretReference` — for example the
resend connector reads `RESEND_API_KEY` from `process.env`. This bypasses the
secret-reference model described above.

Recorded here rather than left implicit. The intended model is still the target:

- connector config stores the auth strategy and scope metadata
- connector config references required secrets by `SecretReference`
- OAuth callback/session handling stays out of the runtime scaffold until a dedicated integration setup flow exists
- token refresh logic belongs in connector-specific adapters, not in the generic assistant runtime

For bot-token based channels like Discord or Telegram:

- bot token references belong in the secret store
- bot runtime configuration belongs in config
- inbound/outbound transport behavior belongs in the channel adapter layer

## Local Settings Structure

Recommended future local settings shape:

- `assistant`
  - default mode
  - shell preferences
  - preferred channel
- `integrations`
  - channel adapters
  - connectors
  - status and health metadata
- `ui`
  - enabled panels
  - chat preferences
  - task/category display settings
- `security`
  - secret provider selection
  - local encryption status
  - token rotation reminders

This patch defines the type and storage boundaries only. It does not implement a settings editor.

## UI Integrations Surface

The future UI integrations/settings surface should expose:

- installed channels
- installed connectors
- enabled/disabled state
- auth status
- scope summary
- last health check
- which secret references are still unresolved

The UI should never display raw secret values.

## Rollout Order

The original order recommended Discord first, then Telegram. That is not what
happened: Telegram shipped and Discord was never started. Restated against
current reality:

| Surface | Status |
|---|---|
| terminal shell (`assistant-shell`) | shipped |
| Telegram | shipped |
| Discord | not started |
| local web UI shell | not started |
| WhatsApp | not started |

Reasoning that still holds:

- the local web UI shell should reuse the boundaries proven by terminal behavior
- WhatsApp should wait until the connector, secret, and policy model are more mature

Because Telegram and the terminal shell were each built directly, a shared
channel-adapter abstraction has never been exercised against two surfaces at
once. Any third surface should decide deliberately whether to introduce one,
rather than inheriting the removed 2026-04 type scaffold.
