# Memory Router Contract

## Purpose

The Memory Router is the required control layer between agents and memory. Agents request memory through the router. They do not directly read the full vault, query the canonical database, write Markdown files, or update vector and graph stores.

## Responsibilities

The Memory Router decides:

- whether the requesting actor can access memory
- which memory types are relevant
- whether tenant and project scope are satisfied
- whether retrieved memory is fresh enough
- whether confidence is high enough
- whether citations are required and available
- whether a write should be accepted, denied, or queued for approval
- what warnings need to be surfaced to the operator

## Request Shape

The TypeScript contract lives at `src/memory/memory-types.ts`.

An `AgentMemoryRequest` contains:

- `requestId`
- `agentId`
- `task`
- `purpose`
- optional `tenantId`, `projectId`, and `runId`
- requested memory types
- query text
- retrieval policy id
- optional write policy id
- creation timestamp

## Retrieval Output

A `RetrievedMemoryBundle` contains:

- request and policy identifiers
- tenant and project scope when present
- selected memory items
- citation strings
- total token estimate
- truncation status
- warnings

Every selected item must include a source-aware citation. If a source cannot be cited, it should not be promoted into a production retrieval bundle unless the active policy explicitly allows uncited memory.

## Router Decision

A `MemoryRouterDecision` records:

- approve or deny
- requested action
- reason
- active policy
- allowed and denied memory types
- human approval requirement
- approval status
- warnings

Router decisions are future observability events. They should be written to the run/audit layer before any live memory backend receives writes.

## Read Policy

The router must evaluate retrieval before loading content. This matches the existing operational retrieval layer principle: policy decisions run before data is loaded so denials cannot leak cross-tenant chunks.

Minimum read checks:

- actor identity is known
- memory type is allowed
- tenant isolation is satisfied
- project scope is satisfied when provided
- confidence meets policy minimum
- freshness cutoff is satisfied unless explicitly waived
- citations are present when required
- total token estimate is within budget

## Write Policy

The router must evaluate writes before persistence.

Minimum write checks:

- actor identity is known
- memory type is allowed
- scope is allowed
- tenant id is present when required
- source is present
- citation is present when required
- body length is within policy limits
- denied tags are absent
- approval state is valid

Approved writes may go to canonical Postgres after schema approval. Draft writes or agent-generated writes should enter `approval_queue` unless the policy explicitly allows direct writes.

## Markdown To Canonical Promotion

Markdown memory is human-readable working memory. It becomes canonical only through an approved promotion flow:

1. Parse frontmatter.
2. Validate required fields.
3. Check source and confidence.
4. Check tenant and project scope.
5. Queue for review when approval is missing.
6. Write to `memory_records` only after approval.
7. Link specialized tables such as `decisions`, `sops`, or `brand_memory`.

## Existing Layer Relationship

The Memory Router should not replace current local modules:

- `src/memory-runtime` remains the cognitive runtime hook layer.
- `src/retrieval` remains the operational retrieval layer.
- `memory/` remains the human-readable memory vault.
- Postgres becomes canonical only after migration approval.

The router should sit above these layers and enforce access, policy, citations, and approval state.

## Non-Goals

- No direct autonomous vault ingestion.
- No write path that bypasses approval.
- No graph memory access before the canonical record model is stable.
- No production memory writes from draft schemas.
