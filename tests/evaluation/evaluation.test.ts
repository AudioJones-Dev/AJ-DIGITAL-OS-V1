import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  createDagRun,
  failNode,
  runDagToCompletion,
} from "../../src/bel/dag/dag-runtime.js";
import type {
  BelDagEdge,
  BelDagNode,
  BelDagPlan,
} from "../../src/bel/dag/dag-types.js";
import { getEventsByRunId, resetEventLedger } from "../../src/core/events/event-ledger.js";

import { scoreRun } from "../../src/evaluation/eval-engine.js";
import { emitRunVerdict } from "../../src/evaluation/eval-emit.js";
import { listVerdicts, getVerdict, EVAL_PATHS } from "../../src/evaluation/eval-store.js";
import { loadGoldenSet, countGoldenCases } from "../../src/evaluation/golden-loader.js";
import type { GoldenCase, RunEvalInput } from "../../src/evaluation/eval-types.js";
import { EvalRunCommand } from "../../src/commands/eval-run.command.js";
import { EvalStatsCommand } from "../../src/commands/eval-stats.command.js";

// ── Isolation ──────────────────────────────────────────────────────────────
const DAG_DIR = join(process.cwd(), "runtime", "dag");
const cleanupFiles = [
  EVAL_PATHS.verdictsFile,
  EVAL_PATHS.auditFile,
  join(DAG_DIR, "dag-runs.json"),
  join(DAG_DIR, "dag-audit.jsonl"),
  join(DAG_DIR, "dag-node-outputs.json"),
];

beforeEach(() => {
  for (const path of cleanupFiles) {
    if (existsSync(path)) rmSync(path);
  }
  resetEventLedger();
});

// ── Helpers ──────────────────────────────────────────────────────────────────
let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function node(nodeId: string, type: BelDagNode["type"] = "transform"): BelDagNode {
  return {
    nodeId,
    type,
    name: nodeId,
    status: "pending",
    riskLevel: "low",
    inputRefs: [],
    outputRefs: [],
    attempts: 0,
    maxAttempts: 3,
  };
}

function plan(nodes: BelDagNode[], edges: BelDagEdge[], tenantId?: string): BelDagPlan {
  const now = new Date().toISOString();
  return {
    dagId: uid("dag"),
    runId: uid("run"),
    name: "test-plan",
    version: "1",
    environment: "development",
    policyVersion: "1.0.0",
    nodes,
    edges,
    createdAt: now,
    createdBy: "test",
    ...(tenantId !== undefined ? { tenantId } : {}),
  };
}

function runInput(overrides: Partial<RunEvalInput> = {}): RunEvalInput {
  return {
    runId: uid("ri"),
    dagId: uid("di"),
    status: "completed",
    environment: "development",
    nodes: [{ nodeId: "n1", status: "completed" }],
    ...overrides,
  };
}

// ── 1. Pure scoring (run_only) ─────────────────────────────────────────────
describe("scoreRun — run_only heuristic", () => {
  it("completed run → pass, score 1", () => {
    const v = scoreRun(runInput({ status: "completed" }));
    expect(v.outcome).toBe("pass");
    expect(v.score).toBe(1);
    expect(v.basis).toBe("run_only");
  });

  it("failed run → fail, score 0", () => {
    const v = scoreRun(runInput({ status: "failed", nodes: [{ nodeId: "n1", status: "failed" }] }));
    expect(v.outcome).toBe("fail");
    expect(v.score).toBe(0);
  });

  it("non-terminal run → partial, score 0.5", () => {
    const v = scoreRun(runInput({ status: "running" }));
    expect(v.outcome).toBe("partial");
    expect(v.score).toBe(0.5);
  });

  it("maps BEL 'development' environment to 'dev'", () => {
    const v = scoreRun(runInput({ environment: "development" }));
    expect(v.environment).toBe("dev");
  });
});

// ── 2. Golden scoring ─────────────────────────────────────────────────────
describe("scoreRun — golden_case", () => {
  const goldenCase: GoldenCase = {
    caseId: "c1",
    engine: "bel-dag-runtime",
    description: "two required nodes",
    runState: runInput({
      status: "completed",
      nodes: [
        { nodeId: "n1", status: "completed" },
        { nodeId: "n2", status: "completed" },
      ],
    }),
    expected: { runStatus: "completed", requiredNodes: ["n1", "n2"] },
  };

  it("full match → pass with golden_case basis and goldenCaseId", () => {
    const v = scoreRun(goldenCase.runState, { goldenCase });
    expect(v.outcome).toBe("pass");
    expect(v.score).toBe(1);
    expect(v.basis).toBe("golden_case");
    expect(v.goldenCaseId).toBe("c1");
  });

  it("missing a required node → partial", () => {
    const run = runInput({
      status: "completed",
      nodes: [{ nodeId: "n1", status: "completed" }],
    });
    const v = scoreRun(run, { goldenCase });
    expect(v.outcome).toBe("partial");
    expect(v.score).toBe(0.5);
  });

  it("status mismatch alone → fail", () => {
    const run = runInput({ status: "failed", nodes: [{ nodeId: "x", status: "failed" }] });
    const gc: GoldenCase = { ...goldenCase, expected: { runStatus: "completed" } };
    const v = scoreRun(run, { goldenCase: gc });
    expect(v.outcome).toBe("fail");
  });
});

// ── 3. Golden set on disk — the CI gate ────────────────────────────────────
describe("golden set (CI gate)", () => {
  it("bel-dag-runtime golden set loads and has >= 20 cases", () => {
    const cases = loadGoldenSet("bel-dag-runtime");
    expect(cases.length).toBeGreaterThanOrEqual(20);
    expect(countGoldenCases("bel-dag-runtime")).toBe(cases.length);
  });

  it("every golden case validates against the schema (loader parses without throwing)", () => {
    expect(() => loadGoldenSet("bel-dag-runtime")).not.toThrow();
  });
});

// ── 4. Emit wiring through the real DAG runtime ────────────────────────────
describe("verdict emission via DAG runtime", () => {
  it("emits a persisted verdict + ledger entry when a run completes", () => {
    const p = plan([node("n1", "input"), node("gen", "generate")], [{ from: "n1", to: "gen" }]);
    const state = createDagRun(p);
    return runDagToCompletion(state).then((final) => {
      expect(final.status).toBe("completed");

      const verdicts = listVerdicts({ runId: final.runId });
      expect(verdicts.length).toBeGreaterThanOrEqual(1);
      expect(verdicts[0]?.outcome).toBe("pass");
      expect(verdicts[0]?.engine).toBe("bel-dag-runtime");

      const ledger = getEventsByRunId(final.runId).filter(
        (e) => e.eventType === "run_verdict_emitted",
      );
      expect(ledger.length).toBeGreaterThanOrEqual(1);
      expect(ledger[0]?.category).toBe("decision");
    });
  });

  it("achieves >= 95% verdict coverage across many runs", async () => {
    // Scope by a unique tenantId so assertions stay deterministic even when
    // other test files write the shared runtime/ stores in parallel.
    const tenantId = uid("cov-tenant");
    const N = 5;
    const runIds: string[] = [];
    for (let i = 0; i < N; i += 1) {
      const p = plan(
        [node(`a${i}`, "input"), node(`b${i}`, "generate")],
        [{ from: `a${i}`, to: `b${i}` }],
        tenantId,
      );
      const state = createDagRun(p);
      const final = await runDagToCompletion(state);
      runIds.push(final.runId);
    }

    const verdictedRuns = new Set(listVerdicts({ tenantId }).map((v) => v.runId));
    const covered = runIds.filter((id) => verdictedRuns.has(id)).length;
    expect(covered / N).toBeGreaterThanOrEqual(0.95);

    const stats = await new EvalStatsCommand().run({ tenantId, json: true });
    expect(stats.stats.verdictedRuns).toBe(N);
    expect(stats.stats.verdictCoverageRate).toBeGreaterThanOrEqual(0.95);
  });

  it("is idempotent per run — repeated terminal transitions do not duplicate verdicts", () => {
    const p = plan([node("n1", "input"), node("n2", "generate")], [{ from: "n1", to: "n2" }]);
    const state = createDagRun(p);
    failNode(state, "n1", "boom"); // status -> failed, emits verdict #1
    failNode(state, "n2", "boom again"); // still failed — must NOT add a second row
    const verdicts = listVerdicts({ runId: state.runId });
    expect(verdicts.length).toBe(1);
    expect(verdicts[0]?.outcome).toBe("fail");
  });

  it("emitRunVerdict never throws and returns the verdict", () => {
    let result: ReturnType<typeof emitRunVerdict> = null;
    expect(() => {
      result = emitRunVerdict(runInput({ status: "completed" }));
    }).not.toThrow();
    expect(result).not.toBeNull();
    if (result) expect(getVerdict(result.verdictId)).toBeDefined();
  });
});

// ── 5. CLI commands ─────────────────────────────────────────────────────────
describe("eval CLI commands", () => {
  it("eval-run --golden scores the whole golden set", async () => {
    const result = await new EvalRunCommand().run({ golden: true, engine: "bel-dag-runtime", json: true });
    expect(result.ok).toBe(true);
    expect(result.verdicts.length).toBeGreaterThanOrEqual(20);
    expect(result.verdicts.every((v) => v.basis === "golden_case")).toBe(true);
  });

  it("eval-run --golden without engine fails cleanly", async () => {
    const result = await new EvalRunCommand().run({ golden: true, json: true });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("engine");
  });

  it("eval-stats reports golden pass rate after a golden run", async () => {
    await new EvalRunCommand().run({ golden: true, engine: "bel-dag-runtime", json: true });
    const stats = await new EvalStatsCommand().run({ engine: "bel-dag-runtime", json: true });
    expect(stats.stats.goldenCaseCount).toBeGreaterThanOrEqual(20);
    expect(stats.stats.goldenPassRate).toBeGreaterThan(0);
  });

  it("golden replay does not inflate a real run's coverage or outcomes", async () => {
    const tenantId = uid("cov-tenant");
    const final = await runDagToCompletion(createDagRun(plan([node("only", "input")], [], tenantId)));
    expect(final.status).toBe("completed");
    // 22 golden passes exist globally but must NOT leak into this tenant's stats.
    await new EvalRunCommand().run({ golden: true, engine: "bel-dag-runtime", json: true });
    const stats = await new EvalStatsCommand().run({ tenantId, json: true });
    expect(stats.stats.totalRuns).toBe(1);
    expect(stats.stats.verdictedRuns).toBe(1);
    expect(stats.stats.verdictCoverageRate).toBe(1);
    expect(stats.stats.byOutcome.pass).toBe(1);
  });
});
