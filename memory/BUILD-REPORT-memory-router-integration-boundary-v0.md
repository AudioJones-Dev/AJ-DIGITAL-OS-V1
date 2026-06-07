# Build Report: Memory Router Integration Boundary v0

Date: 2026-06-06
Repo: `C:\dev\AJ-DIGITAL-OS`

## Files Changed

- `src/memory/memory-types.ts`
- `src/memory/agent-context-contracts.ts`
- `src/memory/agent-request-adapters.ts`
- `src/memory/agent-boundary.ts`
- `src/memory/index.ts`
- `tests/memory/agent-boundary.test.ts`
- `tests/memory/fixtures/claude-code-request.json`
- `tests/memory/fixtures/codex-request.json`
- `tests/memory/fixtures/hermes-request.json`
- `tests/memory/fixtures/openclaw-request.json`
- `tests/memory/fixtures/local-agent-request.json`
- `memory/BUILD-REPORT-memory-router-integration-boundary-v0.md`
- `.gitignore`

## Fixtures Created

- Claude Code request fixture
- Codex request fixture
- Hermes request fixture
- OpenClaw request fixture
- Generic local agent request fixture

All fixtures use explicit `tenantId`, `sessionId`, `agentId`, `projectId`, `taskType`, `requestedTypes`, `queryText`, `maxTokens`, `requireCitations`, and `structuredFilters`.

## Test Cases Added

- Claude Code request succeeds with bounded context.
- Codex request succeeds with bounded context.
- Hermes request succeeds with bounded context.
- OpenClaw request succeeds with bounded context.
- Local agent request succeeds with bounded context.
- Missing `sessionId` fails before context bundle is returned.
- Missing `tenantId` fails when tenant isolation is required.
- Disallowed requested memory type is blocked.
- Agent boundary does not expose raw mock memory records or backend-only fields.
- Agent boundary does not expose raw policy objects.
- Returned bundle respects agent `maxTokens`.
- Returned bundle includes citations when policy requires them.
- Different tenants do not receive each other's scoped records.
- Raw agent input cannot override the allowlisted retrieval policy.
- Adapter does not infer `tenantId` from natural language query text.

## What The Boundary Proves

- Agents are clients of the memory boundary, not owners of memory.
- Agent-specific request shapes can normalize into `AgentMemoryRequest`.
- Policy selection is allowlisted by agent client type.
- Raw agent payloads cannot force a different retrieval policy.
- Router policy is still applied after adapter normalization.
- Agents receive bounded context and a router decision only.
- Agents do not receive raw memory store arrays.
- Agents do not receive raw retrieval policy objects.
- Agents do not receive backend handles, vault readers, database clients, or write APIs.
- Tenant isolation, citation requirements, and token budgets survive the adapter boundary.
- Natural language does not determine tenant identity.

## What Remains Mocked

- Records used by the boundary tests are in-memory test records.
- No approved Markdown source adapter exists yet.
- No Postgres, Redis, vector, graph, Langfuse, or OpenTelemetry adapter exists.
- Relevance remains the deterministic router scoring from read-only v0.

## Intentionally Not Implemented

- No migrations.
- No Postgres connection.
- No Redis connection.
- No Qdrant, pgvector, Graphiti, FalkorDB, Neo4j, or graph/vector database connection.
- No full Obsidian vault reads.
- No Langfuse or OpenTelemetry wiring.
- No package installs.
- No deploys.
- No commits or staging.
- No canonical memory writes.
- No live MCP tools.

## Risks

- Fixture shapes are representative, not authoritative product contracts. Operator review should confirm the fields match how Claude Code, Codex, Hermes, OpenClaw, and local agents should request context.
- The boundary currently sanitizes bundle records but still returns cited content. Future UI or API surfaces should keep the same rule: expose bounded context, not backend objects.
- `maxTokens` can lower the policy budget but cannot raise it above the selected policy ceiling.
- Agent clients cannot choose retrieval policy directly; this is safer, but future admin tooling will need an explicit, governed override path if policy routing changes.

## Recommended Next Safe Step

Build Memory Source Adapter v0: file-safe, read-only, approved Markdown only. The adapter should read from approved exported Markdown records, not the full Obsidian vault and not live databases.
