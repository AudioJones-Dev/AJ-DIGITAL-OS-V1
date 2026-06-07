# Decision: Agent OS Memory Layer Architecture

Date: 2026-06-05
Status: Accepted
System: AJ Digital OS
Layer: Memory Layer

## Decision

AJ Digital OS will not treat Obsidian or Graphify as the full agent memory layer.

Obsidian is the human-readable knowledge vault. Graphify is a visual exploration layer for Obsidian relationships. Postgres is the canonical structured memory layer. pgvector or Qdrant will provide semantic retrieval when approved. Redis or Valkey will provide runtime working memory when approved. Graphiti, FalkorDB, Neo4j, Kuzu, or a comparable graph database will provide true relationship memory when approved. Langfuse or OpenTelemetry will provide run history, audit trails, and observability. A custom Memory Router will govern all agent memory reads and writes.

## Rationale

Agent OS memory requires durability, retrieval discipline, source citation, tenant isolation, structured state, runtime context, and auditability. Obsidian and Graphify are useful, but they do not provide enough control for governed multi-agent memory.

## Architecture Principle

Agents do not directly read the vault, database, vector store, or graph database.

Agents request memory through a Memory Router. The Memory Router decides what memory is relevant, allowed, fresh, tenant-safe, writable, and approval-gated.

## Layer Definitions

| Layer | Role |
| --- | --- |
| Obsidian | Human-readable knowledge layer |
| Graphify | Visual exploration layer |
| Postgres | Canonical structured memory |
| pgvector or Qdrant | Semantic retrieval memory |
| Redis or Valkey | Runtime working memory |
| Graphiti, FalkorDB, Neo4j, or Kuzu | Relationship and graph memory |
| Langfuse or OpenTelemetry | Run history, audit, and observability |
| Memory Router | Governance and access-control layer |

## Next Build Step

Build the minimum viable memory layer before adding another memory tool:

- Obsidian memory folder structure
- Frontmatter standard
- Postgres memory schema draft
- `MemoryRecord` TypeScript interface
- Memory Router read/write contract
- Basic retrieval bundle format
- Agent working-context file
- Langfuse or OpenTelemetry run logging plan

## Constraints

- Do not run migrations until the schema is reviewed.
- Do not connect this layer to production memory stores in this step.
- Do not build graph memory before structured memory is normalized.
- Do not bypass tenant isolation or approval state.
