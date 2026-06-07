# Retrieval Discipline

## Purpose

Retrieval in AJ Digital OS must be bounded, source-aware, tenant-safe, and auditable. Better recall is not the first goal. Controlled recall is the first goal.

## Core Rules

1. Agents request memory through the Memory Router.
2. Policy runs before content is loaded.
3. Tenant-scoped memory requires tenant isolation.
4. Retrieval bundles must be bounded by token budget.
5. Results need citations when policy requires them.
6. Draft, stale, or low-confidence memory should not silently influence execution.
7. Runtime artifacts are not canonical memory unless promoted through approval.

## Retrieval Inputs

A retrieval request should declare:

- task and purpose
- actor or agent id
- tenant and project scope
- requested memory types
- query
- retrieval policy id
- freshness and confidence requirements through policy

## Retrieval Ordering

Default ordering should prioritize memory that reduces immediate execution risk:

1. Working context
2. Accepted decisions
3. Active project context
4. Approved SOPs
5. Mistakes and known failure patterns
6. Brand memory when producing user-facing text
7. Research only when current enough and cited

Policies under `memory/retrieval/` can adjust this order for Codex, Claude, Hermes, or a general agent.

## Citation Requirements

Each retrieved memory item should include enough information to audit the source:

- memory id
- source URI or file path
- title
- source kind
- timestamp or version where available

If the source is a Markdown file, the citation should point to the file. If the source is a canonical row, the citation should include the record id and the source metadata stored with the row.

## Freshness

Freshness is policy-specific. A Codex implementation task may safely use older architecture decisions, while a market, pricing, or vendor recommendation may need current verification.

The router should treat freshness as a risk signal, not just a hard date check:

- accepted architecture decisions can remain valid until deprecated
- SOPs need review when tool behavior changes
- research should expire faster than decisions
- runtime logs should be weighted toward recent runs

## Tenant Isolation

Tenant isolation is mandatory for client-scoped memory.

The router must not retrieve client memory without a matching tenant id when the memory type or namespace is tenant-scoped. Production retrieval should fail closed when tenant scope is missing.

## Confidence

Memory confidence levels:

- `low` - useful as a lead, not enough to guide execution alone
- `medium` - usable with citation and task fit
- `high` - accepted or strongly validated

Policies define the minimum allowed confidence. Strategic decisions and client facts should prefer `high`.

## Runtime Versus Canonical Memory

Runtime memory helps the system execute. Canonical memory tells the system what is true enough to reuse.

Examples:

- `src/memory-runtime` can load recent context for a run.
- `src/retrieval` can produce policy-governed local context packs.
- `memory_records` should hold approved structured memory after schema approval.

The Memory Router coordinates these layers instead of collapsing them into one store.

## Failure Modes To Prevent

- Agent reads an entire vault folder and leaks unrelated context.
- Agent uses uncited research as an accepted decision.
- Client memory crosses tenant boundaries.
- Runtime logs become permanent truth without review.
- Graph or vector tooling is added before write approval exists.
- Draft Markdown frontmatter is treated as canonical memory.

## Safe Next Implementation

Build a read-only router prototype that:

- loads policy JSON from `memory/retrieval/`
- accepts an `AgentMemoryRequest`
- evaluates scope, confidence, citation, and budget rules
- returns a `RetrievedMemoryBundle`
- logs a `MemoryRouterDecision`
- performs no canonical writes
