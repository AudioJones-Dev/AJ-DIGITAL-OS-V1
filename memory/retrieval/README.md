# Retrieval Memory

## Purpose

Stores retrieval policy examples, context bundle formats, and Memory Router retrieval rules.

## What Belongs Here

- Retrieval policy JSON
- Context bundle examples
- Citation requirements
- Freshness and confidence rules
- Tenant isolation rules

## What Does Not Belong Here

- Raw vector index data
- Large embedded documents
- Runtime trace files
- Secrets or private data outside tenant scope

## Write Access

Human operators approve policy changes. Agents may draft policies for review when a task requires a new retrieval mode.

## Agent Read Access

Agents may read retrieval policies through the Memory Router or direct local inspection during implementation work.

## Promotion Path

Approved retrieval policies become canonical `retrieval_policies` rows once the Postgres memory layer is implemented.
