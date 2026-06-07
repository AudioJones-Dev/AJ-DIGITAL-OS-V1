# Memory Source Adapter v0 Build Report

Date: 2026-06-06

## Scope

Implemented a file-safe, read-only Markdown source adapter for approved exported memory records.

Allowed source:

```txt
memory/exports/approved-markdown/
```

The adapter accepts only the logical source name:

```txt
approved_markdown_exports
```

## Files Changed

- `src/memory/memory-types.ts`
- `src/memory/memory-source-types.ts`
- `src/memory/memory-source-allowlist.ts`
- `src/memory/markdown-frontmatter.ts`
- `src/memory/markdown-memory-source.ts`
- `src/memory/index.ts`
- `tests/memory/markdown-memory-source.test.ts`
- `tests/memory/fixtures/approved-markdown/valid-decision.md`
- `tests/memory/fixtures/approved-markdown/valid-sop.md`
- `tests/memory/fixtures/approved-markdown/valid-client-memory.md`
- `tests/memory/fixtures/approved-markdown/invalid-missing-status.md`
- `tests/memory/fixtures/approved-markdown/draft-not-approved.md`
- `tests/memory/fixtures/approved-markdown/deprecated-record.md`
- `memory/exports/approved-markdown/.gitkeep`
- `.gitignore`

## Safety Restrictions

- No npm packages installed.
- No pip packages installed.
- No MongoDB, Graphifyy, graph database, vector database, Redis, Langfuse, or external service wiring added.
- No secrets read.
- No env credential files opened.
- No database connections made.
- No canonical memory writes implemented.
- No recursive vault scan implemented.
- No arbitrary filesystem source accepted.
- No staging, commit, deploy, or migrations performed.

## Frontmatter Fields

Required fields:

- `type`
- `status`
- `version`
- `scope`
- `source`
- `confidence`
- `created_at`
- `updated_at`

Optional fields:

- `tenant_id`
- `project_id`
- `agent_id`
- `approved_by`
- `deprecated_at`
- `tags`

Supported parser behavior:

- Frontmatter must be wrapped in `---` markers.
- Scalar string, number, boolean, and null values are supported.
- Simple inline arrays are supported.
- The parser is intentionally not a full YAML implementation.

## Behavior

- Top-level `.md` files in the approved export directory are read.
- Non-Markdown files are skipped.
- `status: approved` records are mapped into `MemoryRecord` objects.
- `status: draft`, `pending_review`, `review`, `rejected`, or unknown statuses are not loaded.
- Deprecated records are skipped when `status: deprecated` or `deprecated_at` is present.
- `scope: global` is normalized to `system`.
- Numeric confidence is normalized to `low`, `medium`, or `high`.
- `source: obsidian_export` is supported as a `MemorySourceKind`.
- Deterministic `contentHash` and `id` values are generated from approved content.
- `sourceUrl` remains a logical relative path under `memory/exports/approved-markdown/`.
- Loaded records can be passed into the existing read-only router through the existing `records` option.

## Tests Added

Added coverage for:

- approved-only loading
- draft skip behavior
- deprecated skip behavior
- missing required frontmatter rejection
- unsupported source rejection
- path traversal source rejection
- absolute path source rejection
- `MemoryRecord` mapping
- deterministic content hashes
- deterministic ids
- no raw filesystem path exposure in record source fields
- router integration through the existing `records` option
- router default mock-record behavior when no records option is supplied

## Not Implemented

- No database-backed canonical memory adapter.
- No promotion gate.
- No Markdown write path.
- No full Obsidian vault ingestion.
- No recursive directory loading.
- No frontmatter schema file enforcement.
- No embedding, vector, graph, or search index generation.

## Architectural Issues

No blocking architectural issue was discovered in this adapter layer.

The main constraint is intentional: this adapter is only a controlled source loader. It does not decide canonical storage or promotion. That should remain separate so the backend choice can be evaluated after the promotion contract is defined.

## Recommended Next Safe Step

Implement the promotion gate after this adapter:

```txt
Approved Markdown Adapter -> Promotion Gate -> Canonical DB adapter evaluation
```

The promotion gate should validate approved Markdown records against the memory contract before any canonical write path or database backend is introduced.
