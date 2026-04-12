# Integrations And Secrets Spec

## Purpose

This document defines the local-first scaffold for integrations, channels, connectors, and secret handling in AJ Digital OS before any live Discord, Telegram, WhatsApp, email, calendar, social, or file adapters are implemented.

This patch is intentionally scaffold-only:

- no live OAuth flow
- no live bot runtime
- no external webhook handling
- no cloud secret manager
- no GUI settings surface yet

## Core Terms

### Channel Adapter

A channel adapter is the conversation surface where a user or operator sends and receives messages with AJ Digital OS.

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

OAuth and token handling are not implemented in this patch.

The intended model is:

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

Recommended rollout order:

1. Discord
2. Telegram
3. local web UI shell
4. WhatsApp

Reasoning:

- Discord and Telegram provide the fastest validation path for channel adapter abstractions
- the local web UI shell should reuse the same adapter/runtime boundaries once terminal behavior is proven
- WhatsApp should wait until the connector, secret, and policy model are more mature
