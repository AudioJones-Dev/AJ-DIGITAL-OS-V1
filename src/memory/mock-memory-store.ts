import type { MemoryRecord } from "./memory-types.js";

export const MOCK_MEMORY_TENANT_ID = "aj-digital";
export const MOCK_MEMORY_PROJECT_ID = "agent-os";
export const MOCK_MEMORY_SESSION_ID = "session-1";

export function createMockMemoryRecords(): MemoryRecord[] {
  return [
    createRecord({
      id: "mock-working-context",
      type: "working_context",
      title: "Current governed memory objective",
      body: "AJ Digital OS is building a read-only Memory Router before canonical writes, migrations, or graph memory.",
      category: "working_context",
      tags: ["memory-router", "working-context"],
    }),
    createRecord({
      id: "mock-brand-memory",
      type: "brand_memory",
      title: "Audio Jones brand memory",
      body: "Audio Jones uses direct, operational language and avoids hype when describing AI systems.",
      category: "brand",
      tags: ["brand", "voice"],
    }),
    createRecord({
      id: "mock-procedural-sop",
      type: "sop",
      title: "Read-only router procedure",
      body: "Load policy first, evaluate access before content selection, return a cited bundle, and perform no writes.",
      category: "procedural",
      tags: ["sop", "read-only"],
    }),
    createRecord({
      id: "mock-client-profile",
      type: "client_profile",
      title: "AJ Digital internal client profile",
      body: "AJ Digital LLC is the internal tenant for Audio Jones operating-system development.",
      category: "client",
      tags: ["client", "tenant"],
    }),
    createRecord({
      id: "mock-project-context",
      type: "project",
      title: "Agent OS memory project",
      body: "The current project separates human-readable Markdown, canonical Postgres memory, retrieval, runtime memory, graph memory, and observability.",
      category: "project",
      tags: ["project", "memory-layer"],
    }),
    createRecord({
      id: "mock-error-log",
      type: "mistake",
      title: "Do not treat runtime logs as canonical",
      body: "Runtime JSON and log artifacts are useful execution evidence, but they must not become canonical memory without promotion.",
      category: "error_log",
      tags: ["mistake", "runtime-artifacts"],
    }),
    createRecord({
      id: "mock-run-history",
      type: "run_log",
      title: "Memory foundation verification run",
      body: "The memory foundation passed typecheck and Vitest before the read-only router build started.",
      category: "run_history",
      tags: ["run-log", "verification"],
    }),
    createRecord({
      id: "mock-semantic-research",
      type: "research",
      title: "Semantic retrieval should follow governance",
      body: "Semantic retrieval can improve recall, but it should stay behind tenant, citation, and confidence policy checks.",
      category: "semantic",
      tags: ["semantic", "retrieval"],
    }),
    createRecord({
      id: "mock-governance-decision",
      type: "decision",
      title: "Memory Router is mandatory",
      body: "Agents request memory through a Memory Router rather than reading the full vault or writing canonical memory directly.",
      category: "governance",
      tags: ["decision", "governance"],
    }),
  ];
}

interface CreateRecordInput {
  id: string;
  type: MemoryRecord["type"];
  title: string;
  body: string;
  category: string;
  tags: string[];
}

function createRecord(input: CreateRecordInput): MemoryRecord {
  return {
    id: input.id,
    type: input.type,
    status: "approved",
    version: 1,
    scope: "tenant",
    title: input.title,
    body: input.body,
    content: input.body,
    tenantId: MOCK_MEMORY_TENANT_ID,
    projectId: MOCK_MEMORY_PROJECT_ID,
    agentId: "codex",
    runId: "mock-run-memory-router-v0",
    sessionId: MOCK_MEMORY_SESSION_ID,
    source: {
      kind: "validated_workflow",
      uri: `memory/mock/${input.id}.md`,
      title: input.title,
      capturedAt: "2026-06-06T00:00:00.000Z",
      capturedBy: "memory-router-v0",
      hash: `hash-${input.id}`,
    },
    confidence: "high",
    tags: input.tags,
    metadata: {
      category: input.category,
      store: "mock-memory-store",
    },
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    contentHash: `hash-${input.id}`,
    validFrom: "2026-06-06T00:00:00.000Z",
    validTo: "2027-06-06T00:00:00.000Z",
    approvedBy: "operator",
    approvedAt: "2026-06-06T00:00:00.000Z",
    requiresApproval: false,
    sourceUrl: `memory/mock/${input.id}.md`,
    embeddingId: `embedding-${input.id}`,
    graphEntityId: `graph-${input.id}`,
  };
}
