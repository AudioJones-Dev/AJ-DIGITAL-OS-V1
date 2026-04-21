# Deliverable Approval Lifecycle Spec

## Purpose

This layer adds a local-first approval lifecycle for deliverables so AJ Digital OS can move output intentionally from draft work into reviewed and published states without bypassing the current run and approval model.

## Lifecycle States

- `draft`
- `pending_approval`
- `approved`
- `published`

Additional non-happy-path states such as `failed` and `archived` remain in the type system for compatibility, but they are not part of the primary approval path.

## Valid Transitions

- `draft -> pending_approval`
- `pending_approval -> approved`
- `approved -> published`

Invalid transitions are rejected by the file-backed deliverable store.

## Metadata

Deliverable records now carry approval metadata:

- `approvedBy`
- `approvedAt`
- `approvalNotes`

Approval metadata is only populated when the record reaches the `approved` state or later.

## Directory Mapping

Brand-aware output routing now reserves four local roots:

- `data/outputs/<brand>/drafts/`
- `data/outputs/<brand>/pending/`
- `data/outputs/<brand>/approved/`
- `data/outputs/<brand>/published/`

If no brand manifest is active, the runtime falls back to a safe local output root derived from brand id, client id, or `_default`.

## Runtime Rules

- Advisory mode does not auto-submit deliverables for approval.
- Orchestrated assistant runs create deliverables as `draft` when deliverable persistence is allowed.
- `autoSubmitForApproval` is an explicit opt-in. It can move orchestrated draft deliverables into `pending_approval`, but it does not approve or publish them.
- Publishing still does not bypass current run approval semantics. If a deliverable is backed by a governed run and has not yet materialized local publishable output, the publish action delegates to the existing local publisher path.

## UI Behavior

The local web shell stays thin:

- deliverables show lifecycle status badges
- pending approval items are surfaced in a queue view
- actions are limited to submit, approve, and publish
- the UI calls the same lifecycle service used by the CLI

No redesign, external approval channel, or live publish adapter is introduced in this patch.

## Out Of Scope

- external approval systems
- cloud publish adapters
- automated publish after approval
- workflow contract changes
- approval-semantic changes for governed runs
