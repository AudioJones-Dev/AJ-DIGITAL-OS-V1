# Tenant Isolation UX Patterns

## Purpose

Define interface patterns that prevent cross-tenant confusion.

## Patterns

- persistent tenant badge
- tenant-scoped list headings
- tenant-aware empty states
- tenant-confirming destructive actions
- tenant-filtered search results

## Anti-Patterns

- unlabeled shared lists
- global search results without tenant markers
- cross-tenant actions in the same visual group

## Acceptance Criteria

- Tenant isolation is visible in the UI, not only enforced in the backend.
- Users can verify the tenant scope of any client-impacting record.
