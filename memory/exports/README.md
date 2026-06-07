# Export Memory

## Purpose

Stores bounded export artifacts created from approved memory for review, migration, or handoff.

## What Belongs Here

- Redacted memory exports
- Migration-ready snapshots
- Human-review packets
- Source-backed summaries

## What Does Not Belong Here

- Unredacted client data without tenant approval
- Secrets or credentials
- Unbounded raw logs
- Permanent canonical records

## Write Access

Human operators control exports. Agents may create bounded exports only when explicitly requested and scoped.

## Agent Read Access

Agents may read exports only when the export is relevant, approved, and tenant-safe.

## Promotion Path

Exports do not become canonical by themselves. Canonicalization requires Memory Router validation and approved writes to Postgres.
