# ADR-001: XState Lifecycle Synthesis Boundary

**Date:** 2026-08-19

**Status:** Accepted

**Owner:** AJ Digital LLC / Audio Jones

**Decision log:** `DEC-008`

**Related specification:** `docs/architecture/XSTATE_LIFECYCLE_SYNTHESIS_SPEC.md`

## Context

AJ Digital OS already implements lifecycle transitions, control-plane enforcement, approval gates, event history, idempotency, run persistence, and BEL DAG execution.

The repository has multiple overlapping lifecycle contracts:

- legacy workflow `RunStatus`;
- Operating Core `RunState`;
- control-plane `RunControlState`;
- BEL DAG run and node statuses.

The Operating Core and control plane use the same nine process-state labels but do not enforce the same transitions. For example, the control plane permits `failed -> queued`, while the Operating Core treats `failed` as terminal except through a forced rerun path.

The reviewed XState archive provides typed statecharts, event-driven transitions, actors, persisted snapshots, and graph/path testing. Those capabilities could improve formal modeling and verification, but direct adoption before semantic reconciliation would add another state representation and could weaken existing authority boundaries.

## Decision

AJ Digital OS accepts XState as a candidate technology for later modeling and verification dependency evaluation against one canonical process lifecycle, subject to later approval gates.

The following boundaries are accepted:

1. The existing nine-state `RunState` vocabulary is the target canonical process vocabulary.
2. This ADR does not select the final transition graph because Operating Core and control-plane semantics conflict.
3. Existing control-plane, permission, tenant, policy, and approval services remain authoritative for whether a transition may execute.
4. Existing stores remain authoritative for their bounded-context records.
5. The event ledger and audit logs retain their current audit and replay roles.
6. BEL remains the owner of DAG scheduling, node state, retry budgets, outputs, and DAG persistence.
7. Legacy workflow and BEL statuses may later project into the canonical process lifecycle through explicit adapters; shared strings are not sufficient mappings.
8. A later XState proof must be test-only, pure, non-authoritative, and free of runtime I/O.
9. XState actor startup, snapshot persistence, runtime wiring, and source-of-truth migration remain unapproved.
10. The reviewed ZIP will not be vendored or treated as dependency provenance.
11. Dependency/lockfile mutation and test/prototype source changes require separate sequential approvals. Runtime, commit, push, merge, and deployment actions remain further separate approval gates.

## Decision Drivers

- Reduce semantic drift among lifecycle contracts.
- Make transition events, guards, terminal behavior, retries, and approvals explicit.
- Add reachability, liveness, and path-based verification.
- Preserve the existing governance and enforcement kernel.
- Avoid a platform-wide rewrite or BEL replacement.
- Keep adoption reversible and evidence-driven.

## Consequences

### Positive

- Future XState work has a narrow, testable purpose.
- Security and approval authority remain outside the candidate machine.
- BEL and domain lifecycles retain their appropriate boundaries.
- Runtime adoption cannot be inferred from documentation or a successful test proof.
- Transition conflicts must be resolved explicitly before code is introduced.

### Negative

- An additional reconciliation phase is required before experimentation.
- Existing lifecycle duplication remains in code until separately approved work resolves it.
- The target vocabulary decision does not by itself settle cancellation, rejection, rerun, or terminal-state semantics.
- A future proof may show that XState adds insufficient value relative to maintained transition tables.

### Neutral

- No current runtime behavior changes.
- No dependency or lockfile changes.
- No persistence migration.
- No production-readiness claim.

## Alternatives Considered

### Keep Existing Transition Tables Only

This avoids a dependency but does not by itself solve duplicated semantics or provide statechart graph/path verification. It remains a valid outcome if the Phase 1 proof does not demonstrate measurable value.

### Replace All Lifecycle Models with XState Immediately

Rejected. This would combine process, workflow, DAG, approval, deliverable, and business-object semantics into an unsafe migration with unclear truth ownership.

### Replace BEL with XState Actors

Rejected. BEL owns arbitrary DAG dependencies, node readiness, retry budgets, outputs, cache hooks, and execution-specific state that should not be collapsed into the parent process machine.

### Start Runtime Actors and Snapshot Persistence First

Rejected. AJ Digital OS has not yet established the persistence, recovery, concurrency, or distributed-worker requirements needed to justify this risk.

### Vendor the Reviewed XState ZIP

Rejected. The archive is useful reference material but does not provide the approved package-manager provenance or upgrade discipline required for repository integration.

## Compliance and Verification

Phase 0 compliance requires:

- documentation-only changes;
- no package, source, test, runtime, configuration, or lockfile changes;
- a clear implementation-authority disclaimer;
- an indexed decision-log entry;
- repo-local Markdown and diff validation.

Any later Phase 1 proposal must satisfy the entry gates in `docs/architecture/XSTATE_LIFECYCLE_SYNTHESIS_SPEC.md`. Audio must separately ratify the transition graph, approve the dependency/lockfile mutation, and then approve the test/prototype source scope. None of those approvals authorizes runtime integration.

## Supersession

This ADR does not supersede an earlier repo ADR. If a later decision changes the XState boundary, preserve this record and mark it superseded with a link to the replacement decision.
