# Semantic Memory And Retrieval Spec

## Purpose

AJ Digital OS now includes a local-first semantic memory layer on top of conversation transcripts, deliverables, and manually ingested knowledge text.

This layer is intended to make the assistant more continuous and useful across time without adding a cloud vector database, embeddings service, or opaque retrieval behavior.

## Memory Types

- `conversation_memory`
- `deliverable_memory`
- `knowledge_ingestion_memory`

## Storage Layout

Local semantic memory artifacts are stored under:

- `data/memory/chunks/`
- `data/memory/embeddings/`
- `data/memory/index/`

## Embedding Flow

The first version uses a deterministic local hashed-token embedding model:

- no cloud dependency
- no remote embedding API
- stable vectors for the same text on the same code path

## Retrieval Flow

1. Build a local query embedding from the current task text.
2. Read local index entries and embedding vectors from disk.
3. Filter by brand, client, and thread context when available.
4. Score candidates with cosine similarity.
5. Return top-k results in deterministic order.

## Context Injection Rules

Semantic retrieval is stitched into the existing bounded context bundle.

- recent turns still come first
- semantic memory results are labeled as explicit sources
- the same stitched character cap still applies
- included versus truncated sources remain visible in metadata

## CLI Surface

- `memory-index`
- `memory-search --query "..."`
- `memory-stats`

## UI Surface

The local web shell includes a thin Memory panel showing:

- current semantic query
- selected source count
- retrieved source labels and scores

## Out Of Scope

- external vector databases
- cloud embedding services
- semantic reranking APIs
- autonomous ingestion crawlers
- full document management UI
