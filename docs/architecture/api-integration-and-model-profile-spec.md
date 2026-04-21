# API Integration And Model Profile Spec

## Purpose

This document defines the scaffold for:

- API integration profiles
- provider profiles
- secret references
- model profiles
- fine-tune references

The goal is to prepare AJ Digital OS for future UI settings and external access work without implementing live auth or fine-tuning jobs in this patch.

## API Integration Profiles

An API integration profile stores non-secret configuration for one external integration setup.

It should include:

- profile id
- integration key
- display name
- provider profile id
- enabled state
- brand associations
- connector ids
- channel adapter ids
- scopes
- capabilities
- secret references
- non-secret settings
- status

Profiles should be stored under:

- `data/integrations/profiles/`

## Provider Profiles

A provider profile describes the underlying provider surface shared by one or more integration profiles.

It should include:

- provider key
- provider kind
- auth strategy
- default scopes
- supported capabilities
- secret references
- optional base URL

Examples:

- Discord provider profile
- Telegram provider profile
- OpenAI-compatible provider profile
- MCP transport profile

## Secret References

Raw API keys and tokens should not be embedded in integration or model profile files.

Instead, profiles should store secret references that point into the secrets layer.

The secrets layer should track:

- secret metadata
- reference bindings
- brand association
- profile association
- external field name

Current patch rule:

- raw secret values remain intentionally unsupported in plaintext file storage
- only metadata and reference bindings are scaffolded

## Model Profiles

A model profile describes a reusable model routing option.

It should include:

- provider
- base model
- model reference
- optional fine-tune reference
- enabled state
- task usage classes
- routing preferences
- brand associations
- integration profile associations
- brand-specific overrides

## Fine-Tune References

Fine-tune support in this patch is reference-only.

That means the profile may record:

- provider fine-tuned model id
- custom deployment alias
- internal reference label

This patch does not implement:

- training jobs
- dataset upload flows
- provider-specific fine-tune orchestration

## Brand And Task Selection

Future selection logic should consider:

1. explicit brand override
2. explicit task class preference
3. workflow-specific routing preference
4. advisory/chat/coder mode
5. provider availability and integration readiness

Recommended routing precedence:

- brand override
- task type preference
- route preference by execution mode
- base profile fallback

## Native Tools Versus Integrations

- native tools are in-process capabilities
- connectors/integration profiles represent authenticated external access
- MCP-backed tools may depend on integration profiles but should be modeled as separate tool providers

## Local Storage

Recommended local roots:

- `data/integrations/profiles/`
- `data/model-profiles/`
- `data/secrets/`

## Rollout Order

Recommended implementation order:

1. local web/chat UI settings surface
2. Discord adapter
3. Telegram adapter
4. MCP-backed tool adapters
5. WhatsApp
