import { describe, expect, it } from "vitest";

import { routeMemoryRequest } from "../../src/memory/memory-router.js";
import type {
  AgentMemoryRequest,
  MemoryRecord,
  MemoryRetrievalPolicy,
  MemoryType,
} from "../../src/memory/memory-types.js";

const NOW = new Date("2026-06-06T12:00:00.000Z");

const basePolicy: MemoryRetrievalPolicy = {
  policyId: "test-policy",
  allowedTypes: ["working_context", "decision", "sop", "project", "mistake", "research"],
  maxTotalTokens: 1000,
  maxTokensPerMemoryType: {},
  freshnessCutoffDays: 365,
  minimumConfidence: "medium",
  citationsRequired: true,
  tenantIsolationRequired: true,
  retrievalOrder: ["working_context", "decision", "project", "sop", "mistake", "research"],
};

function makeRequest(overrides: Partial<AgentMemoryRequest> = {}): AgentMemoryRequest {
  return {
    requestId: "request-1",
    agentId: "codex",
    sessionId: "session-1",
    task: "Build read-only Memory Router v0.",
    purpose: "implementation",
    tenantId: "tenant-1",
    projectId: "project-1",
    requestedTypes: ["decision"],
    query: "memory router policy",
    retrievalPolicyId: "test-policy",
    createdAt: "2026-06-06T12:00:00.000Z",
    ...overrides,
  };
}

function makeRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: "record-1",
    type: "decision",
    status: "approved",
    version: 1,
    scope: "tenant",
    title: "Memory Router decision",
    body: "The Memory Router controls agent memory access before any canonical writes are allowed.",
    content: "The Memory Router controls agent memory access before any canonical writes are allowed.",
    tenantId: "tenant-1",
    projectId: "project-1",
    agentId: "codex",
    runId: "run-1",
    sessionId: "session-1",
    source: {
      kind: "operator_decision",
      uri: "memory/decisions/router.md",
      title: "Memory Router decision",
      capturedAt: "2026-06-06T12:00:00.000Z",
      capturedBy: "operator",
      hash: "hash-record-1",
    },
    confidence: "high",
    tags: ["memory", "router"],
    metadata: {},
    createdAt: "2026-06-06T12:00:00.000Z",
    updatedAt: "2026-06-06T12:00:00.000Z",
    contentHash: "hash-record-1",
    validFrom: "2026-06-06T00:00:00.000Z",
    validTo: "2027-06-06T00:00:00.000Z",
    approvedBy: "operator",
    approvedAt: "2026-06-06T12:00:00.000Z",
    requiresApproval: false,
    sourceUrl: "memory/decisions/router.md",
    embeddingId: "embedding-record-1",
    graphEntityId: "graph-record-1",
    ...overrides,
  };
}

describe("routeMemoryRequest", () => {
  it("returns a bundle for a valid read-only request", () => {
    const result = routeMemoryRequest(makeRequest(), {
      policy: basePolicy,
      policyName: "test-policy",
      records: [makeRecord()],
      now: NOW,
    });

    expect(result.decision.approved).toBe(true);
    expect(result.decision.allowed).toBe(true);
    expect(result.bundle?.items).toHaveLength(1);
    expect(result.bundle?.items[0]?.citation).toContain("memory/decisions/router.md");
    expect(result.decision.recordsReturned).toBe(1);
  });

  it("fails when tenantId is missing and tenant isolation is required", () => {
    const result = routeMemoryRequest(makeRequest({ tenantId: undefined }), {
      policy: basePolicy,
      policyName: "test-policy",
      records: [makeRecord()],
      now: NOW,
    });

    expect(result.decision.approved).toBe(false);
    expect(result.bundle).toBeNull();
    expect(result.decision.tenantIsolationRequired).toBe(true);
    expect(result.decision.tenantIsolationPassed).toBe(false);
    expect(result.decision.reason).toContain("requires tenantId");
  });

  it("blocks requested memory types that are not allowed by policy", () => {
    const result = routeMemoryRequest(makeRequest({ requestedTypes: ["brand_memory"] }), {
      policy: basePolicy,
      policyName: "test-policy",
      records: [makeRecord({ type: "brand_memory" })],
      now: NOW,
    });

    expect(result.decision.approved).toBe(false);
    expect(result.bundle).toBeNull();
    expect(result.decision.blockedTypes).toEqual(["brand_memory"]);
  });

  it("flags and excludes uncited records when citations are required", () => {
    const result = routeMemoryRequest(makeRequest(), {
      policy: basePolicy,
      policyName: "test-policy",
      records: [
        makeRecord({
          id: "missing-citation",
          source: { kind: "agent_generated" },
          sourceUrl: undefined,
        }),
        makeRecord({ id: "cited-record" }),
      ],
      now: NOW,
    });

    expect(result.decision.approved).toBe(true);
    expect(result.bundle?.items.map((item) => item.record.id)).toEqual(["cited-record"]);
    expect(result.decision.warnings.join("\n")).toContain("requires citations");
  });

  it("truncates records that exceed the token budget", () => {
    const tinyPolicy: MemoryRetrievalPolicy = {
      ...basePolicy,
      maxTotalTokens: 24,
      maxTokensPerMemoryType: { decision: 24 },
    };

    const result = routeMemoryRequest(makeRequest(), {
      policy: tinyPolicy,
      policyName: "tiny-policy",
      records: [
        makeRecord({ id: "small-record", body: "small router note", content: "small router note" }),
        makeRecord({ id: "large-record", body: "x".repeat(200), content: "x".repeat(200) }),
      ],
      now: NOW,
    });

    expect(result.bundle?.items.map((item) => item.record.id)).toEqual(["small-record"]);
    expect(result.bundle?.truncated).toBe(true);
    expect(result.decision.warnings.join("\n")).toContain("token budget");
  });

  it("excludes deprecated records by default", () => {
    const result = routeMemoryRequest(makeRequest(), {
      policy: basePolicy,
      policyName: "test-policy",
      records: [
        makeRecord({
          id: "deprecated-record",
          status: "deprecated",
          deprecatedAt: "2026-06-06T12:00:00.000Z",
        }),
        makeRecord({ id: "active-record" }),
      ],
      now: NOW,
    });

    expect(result.bundle?.items.map((item) => item.record.id)).toEqual(["active-record"]);
    expect(result.decision.warnings.join("\n")).toContain("deprecated");
  });

  it("excludes records below minimum confidence", () => {
    const result = routeMemoryRequest(makeRequest(), {
      policy: basePolicy,
      policyName: "test-policy",
      records: [
        makeRecord({ id: "low-confidence", confidence: "low" }),
        makeRecord({ id: "medium-confidence", confidence: "medium" }),
      ],
      now: NOW,
    });

    expect(result.bundle?.items.map((item) => item.record.id)).toEqual(["medium-confidence"]);
  });

  it("returns records in retrieval order defined by policy", () => {
    const orderedPolicy: MemoryRetrievalPolicy = {
      ...basePolicy,
      retrievalOrder: ["sop", "decision"],
      allowedTypes: ["decision", "sop"],
    };

    const result = routeMemoryRequest(makeRequest({ requestedTypes: ["decision", "sop"] }), {
      policy: orderedPolicy,
      policyName: "ordered-policy",
      records: [
        makeRecord({ id: "decision-record", type: "decision" }),
        makeRecord({
          id: "sop-record",
          type: "sop",
          title: "Router SOP",
          body: "Apply the retrieval policy before selecting memory.",
          content: "Apply the retrieval policy before selecting memory.",
        }),
      ],
      now: NOW,
    });

    const returnedTypes: MemoryType[] = result.bundle?.items.map((item) => item.record.type) ?? [];
    expect(returnedTypes).toEqual(["sop", "decision"]);
  });
});
