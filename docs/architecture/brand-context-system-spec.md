# Brand Context System Spec

## Purpose

This document defines the first architecture scaffold for multi-brand execution in AJ Digital OS.

The goal is to support dynamic brand-aware behavior without changing workflow contracts broadly in this phase.

This patch is architecture-first and scaffold-only:

- no live brand switching UI
- no automatic workflow mutation
- no live publish adapter implementation
- no approval policy rewrite

## Brand Context Definition

A brand context is the resolved execution envelope for one brand.

It should answer:

- which brand is active
- which voice and tone rules apply
- which content rules apply
- which repo bindings exist
- where outputs should go
- how approval should be routed
- how publishing should be routed
- which integration profile references apply

## Brand Manifest

The local manifest is the source of truth for brand-aware runtime policy.

The scaffolded brand manifest includes:

- identity
  - `brandId`
  - `displayName`
  - `clientId`
  - `defaultBrand`
- voice and tone
  - brand name
  - audience
  - tone list
  - style notes
  - banned phrases
  - preferred CTAs
- content rules
  - required disclaimers
  - forbidden claims
  - formatting rules
  - review checklist
  - platform notes
- repo bindings
  - repo id
  - local path placeholder
  - default branch
  - content root
  - asset root
  - publish target reference
- output paths
  - brand root
  - drafts
  - approved
  - published
- approval policy
  - approval mode
  - approver roles
  - approver channels
  - auto-approve task types
  - escalation roles
- publish policy
  - mode
  - allowed targets
  - default target
  - path strategy
- integration profile references
  - profile id
  - default channel adapter
  - connector ids
- secret policy reference
  - provider
  - auth strategy and referenced secrets

## Local Manifest Storage

Manifest files are intended to live under:

- `data/brands/manifests/`

The registry currently loads local JSON manifests only.

This keeps the first version simple and file-based.

## Registry Responsibilities

The brand registry should remain narrow in this stage.

Current scaffold responsibilities:

- load manifests from local files
- resolve a brand by explicit id
- resolve a default brand
- return a typed `BrandContext`

Out of scope for this patch:

- merging environment overlays
- live repository probing
- remote brand config sync
- admin editing surface

## Output Routing Model

Brand manifests define the output path policy conceptually. The runtime should later use brand context to derive brand-scoped directories such as:

- `data/outputs/<brand>/drafts/`
- `data/outputs/<brand>/approved/`
- `data/outputs/<brand>/published/`

This patch only establishes the policy types and root output directory scaffold.

## Approval Policy Model

Brand approval policy is additive metadata for future routing decisions.

It should eventually influence:

- which tasks can auto-approve
- which approver roles must be notified
- which channels are preferred for approval requests
- escalation and fallback routing

This patch does not change current approval semantics. It only defines the structure.

## Publish Policy Model

Brand publish policy should later determine:

- which publish targets are allowed
- which target is the default
- whether publishing is always manual or can happen after approval
- whether output paths are brand-scoped or repo-bound

This patch does not implement any live publish adapter changes.

## Integration Profile References

Brand manifests should reference integration profiles rather than raw credentials.

This creates a clean separation:

- brand manifest decides which integration profiles are relevant
- integration config decides how those profiles are configured
- secret store decides where raw secret material lives

## Relationship To Existing Client Scope

The current runtime is client-aware through `clientId` and `brandDNA`.

The future model should treat brand context as the stronger structured layer that can drive:

- `clientId`
- `brandDNA` derivation
- output routing
- approval routing
- publish routing

This patch does not replace `clientId` or existing `brandDNA` usage yet.
