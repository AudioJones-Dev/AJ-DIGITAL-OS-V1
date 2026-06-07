# Build Report: Memory Router Read-Only v0

Date: 2026-06-06
Repo: `C:\dev\AJ-DIGITAL-OS`

## Files Changed

- `src/memory/memory-types.ts`
- `src/memory/policy-loader.ts`
- `src/memory/context-bundle-builder.ts`
- `src/memory/memory-router-decision.ts`
- `src/memory/mock-memory-store.ts`
- `src/memory/memory-router.ts`
- `src/memory/index.ts`
- `tests/memory/policy-loader.test.ts`
- `tests/memory/memory-router.test.ts`
- `memory/BUILD-REPORT-memory-router-readonly-v0.md`

## Behavior Implemented

- Added a read-only `routeMemoryRequest()` entrypoint.
- Added retrieval policy loading from `memory/retrieval/retrieval-policy-*.json`.
- Added typed `MemoryPolicyError` failures for invalid policy name, missing file, invalid JSON, and invalid policy shape.
- Added deterministic mock memory records for working context, brand, procedural, client, project, error log, run history, semantic, and governance categories.
- Added request validation for `agentId`, `sessionId`, requested memory types, tenant isolation, and policy compatibility.
- Added filtering for tenant, project, agent, session, deprecated status, validity windows, freshness, confidence, and citation requirements.
- Added deterministic token estimation with `Math.ceil(text.length / 4)`.
- Added token-budget enforcement across total policy budget and per-memory-type budget.
- Added retrieval-order sorting based on policy order.
- Added `RetrievedMemoryBundle` generation with citations, token estimates, warnings, and truncation state.
- Added `MemoryRouterDecision` output with requested, allowed, and blocked types plus tenant, citation, token, and record-count metadata.

## Tests Added

- Valid request returns a bundle.
- Missing `tenantId` fails when tenant isolation is required.
- Disallowed memory type is blocked.
- Citation-required policy excludes uncited records and reports warnings.
- Token budget truncates records.
- Deprecated records are excluded.
- Low-confidence records are excluded.
- Retrieval order follows policy.
- Checked-in policy JSON loads and normalizes.
- Invalid policy JSON throws a typed loader error.
- Missing required policy fields throw a typed loader error.
- Policy path escape attempts are rejected.

## Verification

Passed:

- `NODE_DISABLE_COMPILE_CACHE=1 npm run typecheck -- --pretty false`
- `npm test -- --reporter=dot tests/memory`
  - 2 test files passed
  - 12 tests passed
- `npm test -- --reporter=dot`
  - 37 test files passed
  - 441 tests passed

## What Is Still Mocked

- Memory records are in-memory mock records only.
- The router does not read Postgres.
- The router does not query a vector database.
- The router does not query graph memory.
- The router does not read the full Markdown/Obsidian vault.
- Relevance scoring is deterministic keyword scoring, not embedding-based ranking.

## Intentionally Not Implemented

- No migrations.
- No live database connection.
- No canonical memory writes.
- No vector search.
- No Graphiti, FalkorDB, Neo4j, or Kuzu integration.
- No Redis or Valkey runtime memory.
- No Langfuse or OpenTelemetry wiring.
- No agent automation.
- No production config changes.
- No package installs.
- No deploys.
- No commit.

## Risks

- `AgentMemoryRequest.sessionId` is now required by router behavior but remains optional in the shared type for compatibility.
- The checked-in retrieval policy JSON uses snake_case fields, while TypeScript uses camelCase. The loader normalizes this boundary, but future policy edits should keep tests around it.
- Mock records intentionally model categories through existing `MemoryType` values plus metadata. A future canonical schema may need stricter category-to-table mapping.
- The router currently excludes uncited records when citations are required. If a future policy allows uncited records, that must be explicit in the policy contract.

## Safe Next Step

Build a Memory Router integration boundary test that exercises Claude, Codex, and Hermes-style context requests without granting direct access to Obsidian, Postgres, vector DB, graph DB, or canonical writes.
