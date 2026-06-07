# Decision Memory

## Purpose

Stores accepted architecture, product, naming, stack, and operating decisions for AJ Digital OS.

## What Belongs Here

- Decision records
- Rationale and tradeoffs
- Scope and status
- Reversal or deprecation notes

## What Does Not Belong Here

- Brainstorming notes
- Draft options that have not been accepted
- Implementation logs
- Secrets or private client data

## Write Access

Human operators approve decision records. Agents may draft records but should not mark strategic decisions accepted unless approval is clear.

## Agent Read Access

Agents may read accepted decisions through the Memory Router when they are relevant to the requested task.

## Promotion Path

Decisions are canonical when approved and should be mirrored into the structured `memory_records` Postgres table once the canonical memory layer is implemented.
