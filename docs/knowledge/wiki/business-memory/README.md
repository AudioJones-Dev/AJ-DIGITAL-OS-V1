# Business Memory COS Pilot

## Status

This is a 30-day Cognitive Operating System pilot for the Business Memory domain.

Pilot rules are approved by Audio for controlled implementation. Business Memory notes, concepts, principles, decisions, and learnings created during the pilot are not ratified doctrine unless Audio explicitly marks them ratified.

## Purpose

The Business Memory pilot tests whether the AJ Digital Cognitive Operating System lifecycle can turn business reality into reusable knowledge, better decisions, and measurable learning without reorganizing the repository or vault.

The pilot is limited to planning artifacts and templates. It must not ingest client-private data, secrets, credentials, or founder journal material by default.

## Source-Of-Truth Hierarchy

Use this hierarchy during the pilot:

1. Ratified repo or vault docs.
2. Decision history.
3. Source-backed evidence.
4. Current project context.
5. AI memory.

AI memory never overrides vault files, repo files, source documents, or decision records.

## Lifecycle

Business Memory uses this pilot lifecycle:

```txt
Reality
-> Observation
-> Pattern
-> Question / Hypothesis
-> Evidence
-> Interpretation
-> Knowledge
-> Memory
-> Principle
-> Decision
-> Action
-> Measurement
-> Feedback
-> Learning
-> Reality
```

No note should skip lifecycle stages without recording the reason in a Decision note.

## Included Template Types

- Observation
- Question
- Evidence
- Pattern
- Interpretation
- Knowledge
- Principle
- Decision
- Learning

## Excluded By Default

- Client-private data.
- Secrets, credentials, tokens, or environment values.
- Founder journal material.
- Public marketing copy.
- Runtime memory artifacts.
- Generated implementation output.
- Unsourced doctrine.

## Promotion Rules

| Move | Requirement |
| --- | --- |
| `raw` to `working` | Source exists, note type is clear, and scope is Business Memory. |
| `working` to `reviewed` | Required metadata is complete, facts and inferences are separated, and contradiction check is recorded. |
| `reviewed` to `candidate-canonical` | Note is reusable beyond one case, supported by evidence, and has no unresolved fatal conflict. |
| `candidate-canonical` to `ratified` | Audio explicitly approves the note as ratified. |
| `ratified` to `superseded` | A newer ratified note replaces it and links back to the older note. |
| `ratified` to `deprecated` | The note remains historically useful but is no longer recommended. |

## Confidence Scale

| Confidence | Meaning |
| --- | --- |
| 0 | Unverified. |
| 1 | Plausible. |
| 2 | Supported. |
| 3 | Repeatedly supported. |
| 4 | Operationally validated. |
| 5 | Ratified canonical. |

## Governance Gates

Audio approval is required before:

- Marking any note ratified.
- Adding founder journal material.
- Ingesting client-private data.
- Changing the source-of-truth hierarchy.
- Publishing COS language externally.
- Creating public positioning from pilot material.
- Expanding the pilot beyond Business Memory.
- Reorganizing folders or moving existing files.

## AI Usage Rules

ChatGPT may help synthesize founder reasoning, identify contradictions, and draft candidate principles.

Claude may help organize vault-facing notes, routing maps, and review packets when explicitly assigned.

Codex may inspect repo docs, create approved templates, update docs-only planning artifacts, and validate diffs.

Future agents may retrieve reviewed or ratified Business Memory notes, but they must cite sources, preserve uncertainty, and avoid treating draft material as doctrine.

## Retrieval Rules

| Question Type | Retrieval Order |
| --- | --- |
| Strategy | Ratified principles, decisions, evidence, patterns, observations. |
| Client context | Approved client context, evidence, decisions, patterns, notes. |
| Implementation | AGENTS and policy docs, specs, architecture, decisions, Business Memory. |
| Sales or marketing | Ratified brand and offer docs, Business Memory principles, evidence, examples. |
| Doctrine | Ratified doctrine, candidate principles, contradictions, source evidence. |

## Rollback Plan

If the pilot creates complexity without improving decisions, stop creating new Business Memory notes, mark pilot artifacts as archived or deprecated, preserve source evidence, and record the failure as a Learning note.

If later implementation work creates files that need removal, revert the pilot branch or follow-up commit through normal Git review. Do not delete raw source material as part of rollback.

## 30-Day Evaluation

The pilot passes if Business Memory improves retrieval, reduces rediscovery, makes contradictions visible, and supports clearer decisions without weakening source-of-truth discipline.

The pilot fails if it adds maintenance burden without improving judgment, execution, or learning.
