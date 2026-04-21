# Deliverable And Approval Routing Spec

## Purpose

This document defines the first scaffold for brand-aware deliverables and approval/output routing.

The intent is to prepare AJ Digital OS for dynamic multi-brand execution while keeping the current run lifecycle intact.

## Deliverable Concept

A deliverable is the brand-aware output unit derived from a run or workflow result.

It should provide a stable record for:

- what was produced
- which brand it belongs to
- which run created it
- which category it belongs to
- where draft, approved, and published output should live
- which approval and publish policy applies

## Deliverable Record Fields

The scaffolded deliverable record includes:

- deliverable identity
  - `deliverableId`
  - `brandId`
  - `clientId`
  - `runId`
- workflow metadata
  - `workflowId`
  - `taskType`
  - `deliverableType`
- status
  - draft
  - pending approval
  - approved
  - published
  - failed
  - archived
- routing
  - category id
  - output policy
  - approval policy
- metadata
  - title
  - summary
  - timestamps
  - freeform metadata

## Deliverable Registry Storage

The local registry root should be:

- `data/deliverables/registry/`

The local registry is now file-backed and stored as structured JSON records under:

- `data/deliverables/registry/`

The first implementation records:

- advisory assistant outputs as `draft` deliverables
- orchestrated assistant output intent as `pending_approval`, `approved`, or `failed` records
- local published workflow outputs as `published` deliverables linked to the originating run when available

## Output Routing

Brand-aware output routing should later derive concrete paths from:

- brand manifest output path policy
- deliverable type
- workflow type
- approval status
- publish target

Current default structure:

- `data/outputs/<brand>/drafts/`
- `data/outputs/<brand>/approved/`
- `data/outputs/<brand>/published/`

Fallback structure when no brand manifest is resolved:

- `data/outputs/<brandId-or-clientId-or-_default>/drafts/`
- `data/outputs/<brandId-or-clientId-or-_default>/approved/`
- `data/outputs/<brandId-or-clientId-or-_default>/published/`

This allows:

- deterministic local storage
- brand-specific review folders
- future UI file views
- future publish routing handoff

## Approval Routing

Approval routing should remain compatible with the current approval gate while allowing future brand variation.

Brand-aware approval metadata should eventually control:

- who must approve
- which channels are preferred
- which deliverable types may auto-approve
- which escalation path applies

Current patch rule:

- approval policy is typed and documented only
- no current approval behavior changes

## Future Publish Routing

Publish routing should later consider:

- brand publish policy
- allowed targets
- repo binding
- connector readiness
- deliverable status

Examples:

- local-only publish for drafts
- repo-bound publish for brand website content
- connector-backed publish for social assets

This patch does not implement any publish target beyond the current local path. Live publish adapters remain out of scope.
