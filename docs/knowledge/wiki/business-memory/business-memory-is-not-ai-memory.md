---
type: knowledge
status: working
confidence: 2
source: Audio instruction, 2026-07-06
scope: business-memory
owner: Audio
created: 2026-07-06
last_reviewed: 2026-07-06
supports:
  - docs/knowledge/wiki/business-memory/README.md
contradicts: []
derived_from:
  - docs/architecture/semantic-memory-and-retrieval-spec.md
  - docs/knowledge/wiki/business-memory/README.md
open_questions:
  - Which future notes belong in Business Memory versus runtime AI memory?
---

# Knowledge: Business Memory Is Not AI Memory

## Stable Understanding

Business Memory is a governed knowledge domain. AI memory is a retrieval/context mechanism.

## Scope

Business Memory pilot, semantic retrieval, future agent behavior, and knowledge-layer governance.

## Evidence Base

The pilot README states that AI memory never overrides source documents or decision records. The semantic memory spec defines AI memory as retrieval over approved artifacts, not canonical truth.

## Retrieval Use

Retrieve this note when an agent is about to treat remembered context as source-of-truth knowledge.

## Known Limits

Business Memory notes may later be indexed for retrieval, but indexing does not make AI memory canonical.

## Related Decisions

- COS is internal-only during the pilot.

## Review Notes

Use this boundary to prevent memory poisoning and source-of-truth confusion during the 30-day pilot.
