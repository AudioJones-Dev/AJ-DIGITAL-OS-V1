# Memory Schemas

## Purpose

Stores schema drafts, frontmatter templates, and structured contracts for AJ Digital OS memory.

## What Belongs Here

- YAML frontmatter templates
- SQL schema drafts
- JSON schema drafts
- Type mapping notes
- Migration planning documents

## What Does Not Belong Here

- Live migration output
- Database credentials
- Environment-specific connection strings
- Runtime data

## Write Access

Human operators approve schema changes. Agents may draft schemas, but migrations require a separate approval step.

## Agent Read Access

Agents may read schemas when implementing memory-aware code, docs, or migration plans.

## Promotion Path

Draft schemas become migrations only after review, approval, and a rollback plan.
