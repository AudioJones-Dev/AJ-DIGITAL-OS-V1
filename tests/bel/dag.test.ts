import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  createDagRun,
  executeReadyNodes,
  retryNode,
  failNode,
  completeNode,
  getReadyNodes,
  deriveRunStatusFromNodes,
  runDagToCompletion,
  beforeNodeExecute,
  afterNodeComplete,
  dagCacheHooks,
} from "../../src/bel/dag/dag-runtime.js";
import { validateDagPlan } from "../../src/bel/dag/dag-validator.js";
import { getDagAuditEvents } from "../../src/bel/dag/dag-store.js";
import type {
  BelDagEdge,
  BelDagNode,
  BelDagPlan,
} from "../../src/bel/dag/dag-types.js";
import { resolveRuntimePath } from "../../src/core/runtime-paths.js";
import * as attributionTracker from "../../src/attribution/attribution-tracker.js";

// ── Test helpers ──────────────────────────────────────────────────────────
const DAG_DIR = resolveRuntimePath("dag");
const RUNS_FILE = join(DAG_DIR, "dag-runs.json");
const AUDIT_FILE = join(DAG_DIR, "dag-audit.jsonl");
const OUTPUTS_FILE = join(DAG_DIR, "dag-node-outputs.json");

beforeEach(() => {
  if (existsSync(RUNS_FILE)) rmSync(RUNS_FILE);
  if (existsSync(AUDIT_FILE)) rmSync(AUDIT_FILE);
  if (existsSync(OUTPUTS_FILE)) rmSync(OUTPUTS_FILE);
});

let dagCounter = 0;
function uniqueId(prefix: string): string {
  dagCounter += 1;
  return `${prefix}-${Date.now()}-${dagCounter}`;
}

function makeNode(overrides: Partial<BelDagNode> & { nodeId: string; type: BelDagNode["type"]; name: string }): BelDagNode {
  return {
    status: "pending",
    riskLevel: "low",
    inputRefs: [],
    outputRefs: [],
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  };
}

function makePlan(overrides: Partial<BelDagPlan> & { nodes: BelDagNode[]; edges: BelDagEdge[] }): BelDagPlan {
  return {
    dagId: uniqueId("dag"),
    runId: uniqueId("run"),
    name: "test-dag",
    version: "1.0.0",
    environment: "development",
    policyVersion: "v1",
    createdAt: new Date().toISOString(),
    createdBy: "test",
    ...overrides,
  };
}

function buildSimpleValidPlan(): BelDagPlan {
  return makePlan({
    nodes: [
      makeNode({ nodeId: "a", type: "input", name: "Start" }),
      makeNode({ nodeId: "b", type: "transform", name: "Transform" }),
      makeNode({ nodeId: "c", type: "publish", name: "Publish" }),
    ],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
  });
}

// ── 1. valid DAG passes validation ─────────────────────────────────────────
describe("validateDagPlan", () => {
  it("valid DAG passes validation", () => {
    const plan = buildSimpleValidPlan();
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // 2. cycle detection
  it("blocks DAG with cycles", () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "transform", name: "B" }),
        makeNode({ nodeId: "c", type: "transform", name: "C" }),
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "b" },
      ],
    });
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Cycle"))).toBe(true);
  });

  // 3. duplicate nodeId
  it("blocks duplicate nodeIds", () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "a", type: "publish", name: "A2" }),
      ],
      edges: [],
    });
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  // 4. missing edge node reference
  it("blocks edges that reference unknown nodes", () => {
    const plan = makePlan({
      nodes: [makeNode({ nodeId: "a", type: "input", name: "A" })],
      edges: [{ from: "a", to: "ghost" }],
    });
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("ghost"))).toBe(true);
  });

  // 5. orphan non-input node
  it("blocks orphan non-input nodes", () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "transform", name: "B" }),
      ],
      edges: [],
    });
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Orphan"))).toBe(true);
  });

  it("flags high-risk nodes in validation result", () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "publish", name: "B", riskLevel: "high" }),
      ],
      edges: [{ from: "a", to: "b" }],
    });
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(true);
    expect(result.flagged?.highRiskNodes).toContain("b");
  });

  it("flags approval gates in validation result", () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "approval_gate", name: "Gate" }),
      ],
      edges: [{ from: "a", to: "b" }],
    });
    const result = validateDagPlan(plan);
    expect(result.valid).toBe(true);
    expect(result.flagged?.approvalGates).toContain("b");
  });
});

// ── 6. ready nodes computed correctly ──────────────────────────────────────
describe("getReadyNodes", () => {
  it("returns input nodes with no parents as ready immediately", () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    const ready = getReadyNodes(state);
    expect(ready.length).toBe(1);
    expect(ready[0]?.nodeId).toBe("a");
  });

  // 7. node waits for parent completion
  it("does not mark child ready while parent is pending", () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    const ready = getReadyNodes(state);
    expect(ready.map((n) => n.nodeId)).toEqual(["a"]);
    expect(ready.some((n) => n.nodeId === "b")).toBe(false);
  });

  it("marks child ready once parent completes", () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    const next = completeNode(state, "a", { ok: true });
    const ready = getReadyNodes(next);
    expect(ready.some((n) => n.nodeId === "b")).toBe(true);
  });
});

// ── 8. failed parent blocks child ───────────────────────────────────────────
describe("failed-parent propagation", () => {
  it("skips child nodes when parent has failed", async () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    failNode(state, "a", "boom");
    await executeReadyNodes(state);
    const c = state.nodes.find((n) => n.nodeId === "c");
    const b = state.nodes.find((n) => n.nodeId === "b");
    expect(b?.status).toBe("skipped");
    expect(c?.status).toBe("skipped");
  });
});

// ── 9. retry increments attempts ────────────────────────────────────────────
describe("retryNode", () => {
  it("retry increments attempts and resets to pending when under maxAttempts", () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    failNode(state, "a", "transient");
    const before = state.nodes.find((n) => n.nodeId === "a");
    expect(before?.status).toBe("failed");

    const next = retryNode(state, "a");
    const after = next.nodes.find((n) => n.nodeId === "a");
    expect(after?.status).toBe("pending");
    expect(after?.attempts).toBe((before?.attempts ?? 0) + 1);
  });

  it("does not reset to pending once maxAttempts reached", () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A", maxAttempts: 1, attempts: 1, status: "failed" }),
        makeNode({ nodeId: "b", type: "publish", name: "B", maxAttempts: 1 }),
      ],
      edges: [{ from: "a", to: "b" }],
    });
    const state = createDagRun(plan, { skipPersist: true });
    // After createDagRun, attempts reset to 0 — bump them up via failure
    failNode(state, "a", "boom");
    // Manually bump attempts to maxAttempts
    const failedNode = state.nodes.find((n) => n.nodeId === "a")!;
    failedNode.attempts = failedNode.maxAttempts;
    const next = retryNode(state, "a");
    const after = next.nodes.find((n) => n.nodeId === "a");
    expect(after?.status).toBe("failed");
  });
});

// ── 10. completed node does not rerun unless forced ────────────────────────
describe("rerun protection", () => {
  it("completed node does not rerun unless force=true", async () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    completeNode(state, "a", { ok: true });
    const before = state.nodes.find((n) => n.nodeId === "a");
    expect(before?.status).toBe("completed");

    // running again without force — should not flip status away from completed
    await executeReadyNodes(state);
    const after = state.nodes.find((n) => n.nodeId === "a");
    expect(after?.status).toBe("completed");
  });

  it("force=true reruns completed nodes via runDagToCompletion", async () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    completeNode(state, "a", { ok: true });
    const next = await runDagToCompletion(state, { force: true, maxIterations: 10 });
    expect(next.status).toBe("completed");
  });
});

// ── 11. approval gate pauses execution ─────────────────────────────────────
describe("approval gate", () => {
  it("approval_gate node pauses run with status waiting_for_approval", async () => {
    const plan = makePlan({
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "approval_gate", name: "Gate" }),
        makeNode({ nodeId: "c", type: "publish", name: "C" }),
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });
    const state = createDagRun(plan, { skipPersist: true });
    const next = await runDagToCompletion(state, { maxIterations: 10 });
    const b = next.nodes.find((n) => n.nodeId === "b");
    expect(b?.status).toBe("waiting_for_approval");
    expect(next.status).toBe("waiting_for_approval");
  });
});

// ── 12. production run without tenantId is blocked ─────────────────────────
describe("enforcement", () => {
  it("production environment without tenantId is blocked at createDagRun", () => {
    const plan = makePlan({
      environment: "production",
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "publish", name: "B" }),
      ],
      edges: [{ from: "a", to: "b" }],
    });
    expect(() => createDagRun(plan, { skipPersist: true })).toThrow(/tenantId required/);
  });

  it("production with tenantId succeeds", () => {
    const plan = makePlan({
      environment: "production",
      tenantId: "tenant-abc",
      nodes: [
        makeNode({ nodeId: "a", type: "input", name: "A" }),
        makeNode({ nodeId: "b", type: "publish", name: "B" }),
      ],
      edges: [{ from: "a", to: "b" }],
    });
    const state = createDagRun(plan, { skipPersist: true });
    expect(state.tenantId).toBe("tenant-abc");
  });
});

// ── 13. node audit event is written ────────────────────────────────────────
describe("audit log", () => {
  it("writes an audit event for status transitions", () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan);
    completeNode(state, "a", { ok: true });
    const events = getDagAuditEvents({ runId: state.runId });
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.event === "node_completed")).toBe(true);
  });
});

// ── 14, 15. attribution emits + never throws ───────────────────────────────
describe("attribution emission", () => {
  it("attribution emits after node completion (fire-and-forget — does not throw)", async () => {
    const spy = vi.spyOn(attributionTracker, "emitEvent");
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    expect(() => completeNode(state, "a", { ok: true })).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("attribution failure does not throw", async () => {
    const spy = vi
      .spyOn(attributionTracker, "emitEvent")
      .mockImplementation(() => Promise.reject(new Error("attribution down")));
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    expect(() => completeNode(state, "a", { ok: true })).not.toThrow();
    spy.mockRestore();
  });
});

// ── 16. run status derives from node states ────────────────────────────────
describe("deriveRunStatusFromNodes", () => {
  it("returns completed when all nodes are completed", () => {
    const nodes: BelDagNode[] = [
      makeNode({ nodeId: "a", type: "input", name: "A", status: "completed" }),
      makeNode({ nodeId: "b", type: "publish", name: "B", status: "completed" }),
    ];
    expect(deriveRunStatusFromNodes(nodes)).toBe("completed");
  });

  it("returns failed when any node is failed", () => {
    const nodes: BelDagNode[] = [
      makeNode({ nodeId: "a", type: "input", name: "A", status: "completed" }),
      makeNode({ nodeId: "b", type: "publish", name: "B", status: "failed" }),
    ];
    expect(deriveRunStatusFromNodes(nodes)).toBe("failed");
  });

  it("returns waiting_for_approval when any node is waiting", () => {
    const nodes: BelDagNode[] = [
      makeNode({ nodeId: "a", type: "input", name: "A", status: "completed" }),
      makeNode({ nodeId: "b", type: "approval_gate", name: "B", status: "waiting_for_approval" }),
    ];
    expect(deriveRunStatusFromNodes(nodes)).toBe("waiting_for_approval");
  });

  it("returns pending when all nodes are pending", () => {
    const nodes: BelDagNode[] = [
      makeNode({ nodeId: "a", type: "input", name: "A", status: "pending" }),
      makeNode({ nodeId: "b", type: "publish", name: "B", status: "pending" }),
    ];
    expect(deriveRunStatusFromNodes(nodes)).toBe("pending");
  });
});

// ── 17, 18. cache hooks ────────────────────────────────────────────────────
describe("cache hooks", () => {
  it("beforeNodeExecute stub returns null", async () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    const node = state.nodes[0]!;
    const result = await beforeNodeExecute(node);
    expect(result).toBeNull();
  });

  it("afterNodeComplete stub resolves without error", async () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    const node = state.nodes[0]!;
    await expect(afterNodeComplete(node, { ok: true })).resolves.toBeUndefined();
  });

  it("beforeNodeExecute is called during executeNode", async () => {
    const beforeSpy = vi.spyOn(dagCacheHooks, "beforeNodeExecute");
    const afterSpy = vi.spyOn(dagCacheHooks, "afterNodeComplete");
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    await executeReadyNodes(state);
    expect(beforeSpy).toHaveBeenCalled();
    expect(afterSpy).toHaveBeenCalled();
    beforeSpy.mockRestore();
    afterSpy.mockRestore();
  });
});

// ── End-to-end smoke ───────────────────────────────────────────────────────
describe("end-to-end run", () => {
  it("runs a simple linear DAG to completion", async () => {
    const plan = buildSimpleValidPlan();
    const state = createDagRun(plan, { skipPersist: true });
    const final = await runDagToCompletion(state, { maxIterations: 10 });
    expect(final.status).toBe("completed");
    expect(final.nodes.every((n) => n.status === "completed")).toBe(true);
  });
});
