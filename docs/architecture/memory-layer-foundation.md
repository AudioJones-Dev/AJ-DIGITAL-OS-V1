# AJ Digital OS Memory Layer Foundation

## Problem

AJ Digital OS already has local memory and retrieval capabilities, but the memory stack needs a clearer governance layer before adding more tools. Obsidian and Markdown are useful for human-readable knowledge, and existing local runtime modules are useful for execution continuity, but neither should become an unbounded agent memory backend.

## Desired Outcome

Define the minimum governed memory foundation:

- folder discipline for human-readable memory
- frontmatter standards for Markdown memory
- TypeScript contract for memory records and router decisions
- Postgres schema draft for canonical structured memory
- retrieval policies for bounded agent reads
- clear separation between human vault, retrieval, runtime memory, graph memory, and observability

## Success Criteria

- Agents cannot be assumed to read or write the full vault directly.
- Memory writes are typed, scoped, sourced, confidence-labeled, and approval-aware.
- Retrieval is bounded by memory type, tenant, freshness, confidence, and citation rules.
- Postgres is defined as the first canonical structured memory layer, but no migration is run.
- Existing local memory and retrieval modules remain untouched.

## Scope

This foundation covers documentation, contracts, schemas, policies, and starter folder structure under:

- `memory/`
- `src/memory/`
- `docs/architecture/`

## Out Of Scope

- Live database connection
- SQL migrations
- pgvector or Qdrant implementation
- Redis or Valkey working memory
- Graphiti, FalkorDB, Neo4j, or Kuzu implementation
- Langfuse or OpenTelemetry integration
- Autonomous memory-writing agents
- Replacing existing `src/memory-runtime` or `src/retrieval`

## Constraints

- No secrets or credentials in memory files.
- No production database writes.
- No direct full-vault agent access.
- No graph memory before structured memory is normalized.
- No public copy changes as part of this foundation.
- Keep all changes additive unless a later task explicitly approves integration.

## Existing Assets Inspected

- `memory/MEMORY.md` - existing memory index.
- `src/memory-runtime/types.ts` - current cognitive runtime record and hook types.
- `src/retrieval/retrieval-types.ts` - current operational retrieval primitives.
- `src/retrieval/retrieval-policy.ts` - current tenant-aware retrieval policy evaluator.
- `docs/architecture/semantic-memory-and-retrieval-spec.md` - local semantic memory spec.
- `docs/architecture/conversation-memory-and-context-stitching-spec.md` - local conversation persistence and context stitching spec.

## Layer Model

| Layer | Role | Current Status |
| --- | --- | --- |
| Obsidian / Markdown | Human-readable knowledge vault | Started under `memory/` |
| Graphify | Visual exploration of Obsidian relationships | Not canonical memory |
| Postgres | Canonical structured memory | Draft schema only |
| pgvector or Qdrant | Semantic retrieval memory | Future decision |
| Redis or Valkey | Runtime working memory | Future decision |
| Graphiti, FalkorDB, Neo4j, or Kuzu | Relationship and graph memory | Future decision |
| Langfuse or OpenTelemetry | Run history and observability | Future decision |
| Memory Router | Governance and access-control layer | Contract drafted |

## Proposed Plan

1. Approve the folder discipline and frontmatter templates.
2. Review the TypeScript memory contract and align field names with existing runtime types.
3. Review the Postgres schema draft and decide the first database target.
4. Build a read-only Memory Router adapter over Markdown and existing local retrieval.
5. Add approval-gated canonical write flow after schema approval.
6. Add observability and graph/vector layers only after the canonical record model is stable.

## Risks

- Duplicating `memory-runtime` behavior instead of defining a router over it.
- Letting Markdown files become the source of truth after Postgres is approved.
- Adding vector or graph tooling before tenant isolation and write approval exist.
- Treating runtime JSON artifacts as canonical memory.
- Allowing agents to silently promote drafts into accepted memory.

## Open Questions

- Which Postgres environment should host the first canonical memory database?
- Should `tenant_id` use brand/client identifiers or a stricter internal tenant registry?
- Should vector retrieval use pgvector inside Postgres first, or remain file-backed until a later phase?
- What UI or command should review and approve memory writes?
- Which observability layer should record Memory Router decisions first?

## Recommended Next Step

Review and approve the schema plus Memory Router contract. The next implementation task should be a read-only Memory Router that can assemble a cited retrieval bundle without writing canonical memory.
