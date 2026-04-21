# Conversation Memory And Context Stitching Spec

## Purpose

This patch adds a local-first conversation layer so AJ Digital OS can:

- persist actual user and assistant turns
- continue an existing thread by id
- stitch bounded recent context back into runtime execution
- keep the full behavior inspectable from local files

It does not add embeddings, semantic search, vector retrieval, or autonomous memory loops.

## Session Metadata Versus Conversation Transcript

The system now keeps two separate persistence layers:

- `data/assistant/history/`
  - high-level assistant session metadata
  - one record per invocation or shell turn
  - operational fields such as route, mode, run id, warnings, errors, brand, model, and agent profile
- `data/conversations/threads/` and `data/conversations/turns/`
  - actual conversational continuity
  - thread records describe the conversation container
  - turn records store persisted user and assistant content

Session metadata remains the operator audit surface.
Conversation transcript remains the conversational continuity surface.

## Runtime Storage

- `data/conversations/threads/`
- `data/conversations/turns/`
- `data/conversations/context-cache/`

`context-cache/` stores the stitched bundle metadata actually used by runtime assembly for inspectability and debugging.

## Thread Model

Each conversation thread stores:

- `threadId`
- title
- source command
- status
- client and brand linkage when available
- timestamps
- turn count
- latest linked session/run metadata

Threads are resolved as:

1. continue the explicit `threadId` when provided
2. create a new thread when no thread id is provided

If an explicit thread id is requested and no local thread exists, the runtime fails clearly.

## Turn Model

Each persisted turn stores:

- `turnId`
- `threadId`
- role
- content
- timestamps
- source command
- mode
- route/model metadata when available
- workflow / skill / run linkage when available

The first version persists user and assistant turns only. It does not persist hidden system prompts.

## Stitch Order

The stitcher assembles bounded context in deterministic order:

1. current task metadata
2. recent conversation turns from the active thread
3. selected brand context summary
4. recent assistant session metadata for the same thread
5. recent deliverable metadata for the same brand or client

This order is fixed so prompt growth remains predictable.

## Bounded Memory Rules

Default limits:

- max recent turns: `6`
- max stitched characters: `6000`

Rules:

- ordering is deterministic
- older context is dropped first by inclusion order
- each included source is counted explicitly
- the stitched bundle records whether truncation occurred
- the runtime exposes stitched bundle metadata in the assistant result

This patch intentionally uses character budgeting as a simple local approximation. It does not attempt provider-specific token accounting.

## Persisted Versus Non-Persisted Context

Persisted:

- conversation threads
- conversation turns
- stitched context bundle metadata and included source material
- assistant session metadata
- deliverable metadata

Not persisted in this patch:

- hidden provider/system prompt internals beyond the existing prompt builder outputs
- semantic embeddings
- vector indexes
- long-term summarization memory beyond the existing memory layer

## UI And CLI Expectations

The local web shell and CLI can now:

- create new conversation threads automatically
- continue an existing thread with `--threadId`
- inspect thread lists and recent turns

The UI remains local-first and thin. It does not yet provide:

- transcript editing
- branch/merge thread controls
- semantic recall
- cross-thread retrieval

## Out Of Scope

- vector database integration
- embeddings
- semantic search
- automatic summarization compaction
- autonomous memory management
- cross-device sync
