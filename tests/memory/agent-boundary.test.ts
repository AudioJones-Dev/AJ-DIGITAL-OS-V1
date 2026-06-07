import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { requestBoundedAgentContext } from "../../src/memory/agent-boundary.js";
import { normalizeCodexMemoryRequest } from "../../src/memory/agent-request-adapters.js";
import type {
  AgentBoundaryRequestInput,
  AgentClientType,
} from "../../src/memory/agent-context-contracts.js";
import type { MemoryRecord, MemoryType } from "../../src/memory/memory-types.js";

const NOW = new Date("2026-06-06T12:00:00.000Z");

const FIXTURE_BY_AGENT: Record<AgentClientType, string> = {
  claude_code: "claude-code-request.json",
  codex: "codex-request.json",
  hermes: "hermes-request.json",
  openclaw: "openclaw-request.json",
  local_agent: "local-agent-request.json",
};

describe("Memory Router agent integration boundary", () => {
  it.each([
    ["claude_code"],
    ["codex"],
    ["hermes"],
    ["openclaw"],
    ["local_agent"],
  ] as const)("%s request succeeds with bounded context", (agentClient) => {
    const result = requestBoundedAgentContext(loadFixture(FIXTURE_BY_AGENT[agentClient]), {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.decision.approved).toBe(true);
    expect(result.bundle).not.toBeNull();
    expect(result.bundle?.items.length).toBeGreaterThan(0);
    expect(result.bundle?.totalTokenEstimate).toBeLessThanOrEqual(result.normalizedRequest.maxTokens ?? Number.MAX_SAFE_INTEGER);
    expect(result.normalizedRequest.agentClient).toBe(agentClient);
  });

  it("fails missing sessionId before returning a context bundle", () => {
    const fixture = loadFixture("codex-request.json") as Record<string, unknown>;
    delete fixture["sessionId"];

    const result = requestBoundedAgentContext(fixture as AgentBoundaryRequestInput, {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.decision.approved).toBe(false);
    expect(result.bundle).toBeNull();
    expect(result.decision.reason).toContain("sessionId is required");
  });

  it("fails missing tenantId when selected policy requires tenant isolation", () => {
    const fixture = loadFixture("codex-request.json") as Record<string, unknown>;
    delete fixture["tenantId"];
    fixture["queryText"] = "Use the aj-digital tenant for this task";

    const result = requestBoundedAgentContext(fixture as AgentBoundaryRequestInput, {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.normalizedRequest.tenantId).toBeUndefined();
    expect(result.decision.approved).toBe(false);
    expect(result.decision.tenantIsolationPassed).toBe(false);
    expect(result.bundle).toBeNull();
  });

  it("blocks disallowed requested memory types through policy", () => {
    const fixture = {
      ...loadFixture("codex-request.json"),
      requestedTypes: ["brand_memory"],
    } satisfies AgentBoundaryRequestInput;

    const result = requestBoundedAgentContext(fixture, {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.decision.approved).toBe(false);
    expect(result.decision.blockedTypes).toEqual(["brand_memory"]);
    expect(result.bundle).toBeNull();
  });

  it("does not expose raw mock memory records or backend-only record fields", () => {
    const result = requestBoundedAgentContext(loadFixture("codex-request.json"), {
      records: createBoundaryRecords(),
      now: NOW,
    });

    const publicRecord = result.bundle?.items[0]?.record as Record<string, unknown> | undefined;

    expect(result).not.toHaveProperty("records");
    expect(publicRecord).toBeDefined();
    expect(publicRecord).not.toHaveProperty("metadata");
    expect(publicRecord).not.toHaveProperty("contentHash");
    expect(publicRecord).not.toHaveProperty("sourceUrl");
    expect(publicRecord).not.toHaveProperty("embeddingId");
    expect(publicRecord).not.toHaveProperty("graphEntityId");
  });

  it("does not expose the raw retrieval policy object", () => {
    const result = requestBoundedAgentContext(loadFixture("hermes-request.json"), {
      records: createBoundaryRecords(),
      now: NOW,
    }) as unknown as Record<string, unknown>;

    expect(result).not.toHaveProperty("policy");
    expect(result).not.toHaveProperty("rawPolicy");
    expect(result["decision"]).toBeDefined();
    expect(result["bundle"]).toBeDefined();
  });

  it("respects the agent max token budget", () => {
    const fixture = {
      ...loadFixture("local-agent-request.json"),
      maxTokens: 12,
      requestedTypes: ["decision", "sop", "project"],
    } satisfies AgentBoundaryRequestInput;

    const result = requestBoundedAgentContext(fixture, {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.bundle?.totalTokenEstimate).toBeLessThanOrEqual(12);
    expect(result.decision.tokenBudgetRequested).toBe(12);
    expect(result.bundle?.truncated).toBe(true);
  });

  it("preserves citation requirements in returned bundles", () => {
    const result = requestBoundedAgentContext(loadFixture("openclaw-request.json"), {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.decision.citationRequired).toBe(true);
    expect(result.bundle?.items.length).toBeGreaterThan(0);
    for (const item of result.bundle?.items ?? []) {
      expect(item.citation).toContain("memory/mock/");
      expect(item.record.source.uri).toContain("memory/mock/");
    }
  });

  it("does not return scoped records from another tenant", () => {
    const fixture = {
      ...loadFixture("local-agent-request.json"),
      tenantId: "tenant-other",
      requestedTypes: ["decision"],
    } satisfies AgentBoundaryRequestInput;

    const result = requestBoundedAgentContext(fixture, {
      records: [
        makeBoundaryRecord({ id: "aj-decision", type: "decision", tenantId: "aj-digital" }),
        makeBoundaryRecord({ id: "other-decision", type: "decision", tenantId: "tenant-other" }),
      ],
      now: NOW,
    });

    expect(result.decision.approved).toBe(true);
    expect(result.bundle?.items.map((item) => item.record.id)).toEqual(["other-decision"]);
  });

  it("does not let raw agent input override the allowlisted retrieval policy", () => {
    const fixture = {
      ...loadFixture("codex-request.json"),
      retrievalPolicyId: "hermes",
      policyName: "hermes",
      requestedTypes: ["run_log"],
    } as AgentBoundaryRequestInput & { retrievalPolicyId: string; policyName: string };

    const result = requestBoundedAgentContext(fixture, {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.normalizedRequest.retrievalPolicyId).toBe("codex");
    expect(result.decision.approved).toBe(false);
    expect(result.decision.blockedTypes).toEqual(["run_log"]);
  });

  it("does not infer tenantId from natural language query text", () => {
    const normalized = normalizeCodexMemoryRequest({
      agentClient: "codex",
      agentId: "codex-aj-os",
      sessionId: "session-codex-tenant-inference",
      taskType: "implementation",
      requestedTypes: ["decision"],
      queryText: "Please use aj-digital tenant context for this task.",
    });

    expect(normalized.tenantId).toBeUndefined();

    const result = requestBoundedAgentContext({
      agentClient: "codex",
      agentId: "codex-aj-os",
      sessionId: "session-codex-tenant-inference",
      taskType: "implementation",
      requestedTypes: ["decision"],
      queryText: "Please use aj-digital tenant context for this task.",
    }, {
      records: createBoundaryRecords(),
      now: NOW,
    });

    expect(result.decision.approved).toBe(false);
    expect(result.bundle).toBeNull();
  });
});

function loadFixture(fileName: string): AgentBoundaryRequestInput {
  const fixturePath = path.resolve("tests", "memory", "fixtures", fileName);
  return JSON.parse(readFileSync(fixturePath, "utf-8")) as AgentBoundaryRequestInput;
}

function createBoundaryRecords(): MemoryRecord[] {
  return [
    makeBoundaryRecord({ id: "working-context", type: "working_context", body: "Current work is Memory Router boundary testing." }),
    makeBoundaryRecord({ id: "decision-router", type: "decision", body: "Agents request memory through a governed router." }),
    makeBoundaryRecord({ id: "sop-router", type: "sop", body: "Normalize request, route through policy, return bounded context." }),
    makeBoundaryRecord({ id: "project-router", type: "project", body: "The project keeps memory backends behind a router boundary." }),
    makeBoundaryRecord({ id: "mistake-runtime", type: "mistake", body: "Runtime logs must not become canonical memory without promotion." }),
    makeBoundaryRecord({ id: "research-semantic", type: "research", body: "Semantic retrieval stays behind citation and tenant checks." }),
    makeBoundaryRecord({ id: "run-history", type: "run_log", body: "Read-only router tests passed before boundary tests were added." }),
    makeBoundaryRecord({ id: "agent-profile", type: "agent_profile", body: "Agent clients receive bounded context only." }),
  ];
}

function makeBoundaryRecord(input: {
  id: string;
  type: MemoryType;
  tenantId?: string;
  body?: string;
}): MemoryRecord {
  const tenantId = input.tenantId ?? "aj-digital";
  const body = input.body ?? `Bounded ${input.type} memory for ${tenantId}.`;

  return {
    id: input.id,
    type: input.type,
    status: "approved",
    version: 1,
    scope: "tenant",
    title: `${input.type} ${input.id}`,
    body,
    content: body,
    tenantId,
    projectId: "agent-os",
    source: {
      kind: "validated_workflow",
      uri: `memory/mock/${input.id}.md`,
      title: `${input.type} ${input.id}`,
      capturedAt: "2026-06-06T12:00:00.000Z",
      capturedBy: "boundary-test",
      hash: `hash-${input.id}`,
    },
    confidence: "high",
    tags: ["memory-router", input.type],
    metadata: {
      store: "raw-mock-store",
      shouldNotReachBoundary: true,
    },
    createdAt: "2026-06-06T12:00:00.000Z",
    updatedAt: "2026-06-06T12:00:00.000Z",
    contentHash: `hash-${input.id}`,
    validFrom: "2026-06-06T00:00:00.000Z",
    validTo: "2027-06-06T00:00:00.000Z",
    approvedBy: "operator",
    approvedAt: "2026-06-06T12:00:00.000Z",
    requiresApproval: false,
    sourceUrl: `memory/mock/${input.id}.md`,
    embeddingId: `embedding-${input.id}`,
    graphEntityId: `graph-${input.id}`,
  };
}
