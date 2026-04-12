# MCP Tool Architecture Spec

## Purpose

This document defines the scaffold for an MCP-ready tool layer without implementing a live MCP runtime in this patch.

The goal is to give AJ Digital OS a stable internal contract for:

- native local tools
- MCP-backed tools
- tool providers
- tool capabilities
- invocation metadata
- permission and approval classification

## Core Distinctions

### Native Tools

Native tools run in-process inside AJ Digital OS.

Examples:

- local file inspection
- deterministic formatters
- local workflow helpers

### Connectors

Connectors represent external systems or accounts AJ Digital OS can access.

Examples:

- Discord bot/account access
- Telegram bot/account access
- email providers
- file storage providers

Connectors are integration-facing. They define account reach and authentication shape, not tool invocation semantics by themselves.

### MCP-Backed Tools

MCP-backed tools are tool surfaces exposed through an MCP-compatible server or adapter boundary.

They should be modeled separately from connectors because:

- the MCP server defines a tool protocol surface
- the connector defines account/auth access
- one MCP adapter may depend on one or more integration profiles

## Tool Providers

Each tool provider should declare:

- provider id
- display name
- provider kind: `native` or `mcp`
- transport
- status
- capability ids
- integration profile linkage if needed
- secret reference ids if needed

## Tool Capabilities

Capabilities classify what a tool can do independent of implementation.

Examples:

- filesystem read
- filesystem write
- external API call
- messaging channel access

Capabilities should drive:

- UI settings visibility
- approval and permission prompts
- future policy routing

## Invocation Metadata

Tool invocation metadata should support:

- invocation id
- run id
- session id
- client id
- brand id
- source surface
- requester identity

This metadata is for observability and policy context. It does not change current approval semantics in this patch.

## Permission And Approval Classification

Each tool definition should classify:

- permission level
  - `read_only`
  - `local_mutation`
  - `external_api`
  - `approval_required`
- approval classification
  - `none`
  - `guarded`
  - `explicit_approval`

Current patch rule:

- these classifications are scaffold metadata only
- they do not replace the existing guarded execution model

## Local Storage

Tool metadata manifests may be stored under:

- `data/tools/`

This patch supports metadata manifests only. It does not launch MCP servers or execute remote MCP protocol handshakes.

## Rollout Order

Recommended implementation order:

1. local web/chat UI settings surface
2. Discord adapter
3. Telegram adapter
4. MCP-backed tool adapters
5. WhatsApp
