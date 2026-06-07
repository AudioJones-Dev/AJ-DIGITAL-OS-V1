# Build Report: Memory Layer Foundation

Date: 2026-06-05
Repo: `C:\dev\AJ-DIGITAL-OS`

## Files Created

Folder discipline:

- `memory/working-context/README.md`
- `memory/logs/README.md`
- `memory/mistakes/README.md`
- `memory/decisions/README.md`
- `memory/clients/README.md`
- `memory/projects/README.md`
- `memory/agents/README.md`
- `memory/sops/README.md`
- `memory/brand/README.md`
- `memory/research/README.md`
- `memory/retrieval/README.md`
- `memory/schemas/README.md`
- `memory/exports/README.md`

Frontmatter templates:

- `memory/schemas/frontmatter/decision.yaml`
- `memory/schemas/frontmatter/sop.yaml`
- `memory/schemas/frontmatter/client-profile.yaml`
- `memory/schemas/frontmatter/project.yaml`
- `memory/schemas/frontmatter/mistake.yaml`
- `memory/schemas/frontmatter/research.yaml`
- `memory/schemas/frontmatter/agent-profile.yaml`

Policy and context files:

- `memory/retrieval/retrieval-policy-agent-default.json`
- `memory/retrieval/retrieval-policy-codex.json`
- `memory/retrieval/retrieval-policy-claude.json`
- `memory/retrieval/retrieval-policy-hermes.json`
- `memory/working-context/working-context.md`
- `memory/decisions/2026-06-05-agent-os-memory-layer-architecture.md`

Contracts and schema:

- `src/memory/memory-types.ts`
- `memory/schemas/postgres-memory-schema.sql`

Architecture docs:

- `docs/architecture/memory-layer-foundation.md`
- `docs/architecture/memory-router-contract.md`
- `docs/architecture/retrieval-discipline.md`

Supporting repo hygiene:

- `.gitignore` now keeps arbitrary memory contents ignored while allowing the requested governance READMEs, templates, policy examples, schema draft, decision record, working-context starter, and build report to be tracked.

## Decisions Encoded

- Obsidian and Markdown are the human-readable memory layer.
- Graphify is visual exploration, not the agent memory backend.
- Postgres is the first canonical structured memory target.
- Vector retrieval, runtime working memory, graph memory, and observability are separate layers.
- The Memory Router is the mandatory control layer for agent reads and writes.
- Agents should not directly read the full vault or write canonical memory.
- Memory writes must be typed, scoped, sourced, confidence-labeled, and approval-aware.
- Retrieval must be bounded, cited, tenant-safe, and policy-governed.

## What Is Now True

- The requested memory folder structure exists with operating rules.
- Frontmatter templates exist for decisions, SOPs, clients, projects, mistakes, research, and agent profiles.
- Retrieval policy examples exist for default agents, Codex, Claude, and Hermes.
- A working-context starter file exists.
- The memory-layer architecture decision is captured.
- A TypeScript contract now defines memory records, policies, agent requests, retrieval bundles, and router decisions.
- A Postgres schema draft now defines canonical memory tables and indexes.
- Architecture docs now describe the foundation, router contract, and retrieval discipline.
- Existing `MemoryReference`, `MemoryIndex`, and semantic memory summary interfaces in `src/memory/memory-types.ts` were preserved while adding the new Memory Router contract.

## What Is Not Yet Implemented

- No SQL migration has been run.
- No live database has been connected.
- No pgvector, Qdrant, Redis, Valkey, Graphiti, FalkorDB, Neo4j, Kuzu, Langfuse, or OpenTelemetry integration has been added.
- No autonomous memory-writing agent has been built.
- No Memory Router runtime implementation exists yet.
- Existing `src/memory-runtime` and `src/retrieval` behavior has not been changed.

## Recommended Next Step

Build a read-only Memory Router prototype. It should load retrieval policies, accept an `AgentMemoryRequest`, evaluate tenant and policy rules, assemble a cited `RetrievedMemoryBundle`, emit a `MemoryRouterDecision`, and perform no canonical writes.

## Risks And Constraints

- The schema is a draft and must be reviewed before migration.
- Tenant id strategy must be finalized before production use.
- Markdown memory should not be treated as canonical after Postgres is approved.
- Agent-generated memory should stay draft or pending review unless a write policy explicitly allows direct approval.
- Runtime JSON and logs should not become canonical memory without promotion.
