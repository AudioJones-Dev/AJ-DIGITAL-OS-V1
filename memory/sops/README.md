# SOP Memory

## Purpose

Stores standard operating procedures for repeatable workflows in AJ Digital OS.

## What Belongs Here

- Step-by-step procedures
- Preconditions and approval gates
- Validation commands
- Rollback guidance
- Known risks and exceptions

## What Does Not Belong Here

- One-off task notes
- Unapproved process experiments
- Raw command output without interpretation
- Secrets or client-private values

## Write Access

Human operators approve SOPs. Agents may draft or update SOPs when the workflow has been validated.

## Agent Read Access

Agents may read SOPs through the Memory Router when they are relevant to the current tool, repo, or workflow.

## Promotion Path

Approved SOPs become canonical `sops` and `memory_records` rows. Deprecated SOPs must keep a replacement or deprecation note.
