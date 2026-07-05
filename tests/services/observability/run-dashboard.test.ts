import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { RunDashboardService } from "../../../src/services/observability/run-dashboard.js";
import { RunSummaryService } from "../../../src/services/observability/run-summary.js";
import type {
  BelDagNode,
  BelDagRunState,
  BelDagRunStatus,
} from "../../../src/bel/dag/dag-types.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("RunDashboardService DAG summaries", () => {
  it("includes DAG totals, status counts, and recent DAG runs", async () => {
    const service = createService([
      makeDagRun({
        runId: "run-completed",
        dagId: "dag-completed",
        status: "completed",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
      makeDagRun({
        runId: "run-waiting",
        dagId: "dag-waiting",
        status: "waiting_for_approval",
        tenantId: "tenant-a",
        updatedAt: "2025-01-02T00:00:00.000Z",
        nodes: [
          makeNode({ nodeId: "approval", status: "waiting_for_approval" }),
          makeNode({ nodeId: "failed", status: "failed" }),
        ],
      }),
      makeDagRun({
        runId: "run-failed",
        dagId: "dag-failed",
        status: "failed",
        updatedAt: "2025-01-03T00:00:00.000Z",
      }),
    ]);

    const dashboard = await service.getDashboard({ limit: 2 });

    expect(dashboard.ok).toBe(true);
    expect(dashboard.totalDagRuns).toBe(3);
    expect(dashboard.dagCounts).toEqual({
      pending: 0,
      running: 0,
      waitingForApproval: 1,
      completed: 1,
      failed: 1,
      cancelled: 0,
    });
    expect(dashboard.recentDagRuns.map((run) => run.runId)).toEqual([
      "run-failed",
      "run-waiting",
    ]);
    expect(dashboard.recentDagRuns[1]).toMatchObject({
      runId: "run-waiting",
      dagId: "dag-waiting",
      status: "waiting_for_approval",
      environment: "development",
      tenantId: "tenant-a",
      nodeCount: 2,
      waitingNodeCount: 1,
      failedNodeCount: 1,
    });
  });

  it("reports DAG reader failures without throwing", async () => {
    const service = createService(() => {
      throw new Error("dag store unavailable");
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.ok).toBe(false);
    expect(dashboard.totalDagRuns).toBe(0);
    expect(dashboard.recentDagRuns).toEqual([]);
    expect(dashboard.dagCounts).toEqual({
      pending: 0,
      running: 0,
      waitingForApproval: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    });
    expect(dashboard.errors).toContain("Failed to enumerate DAG runs: dag store unavailable");
  });
});

function createService(
  dagRunsOrReader: BelDagRunState[] | (() => BelDagRunState[]),
): RunDashboardService {
  const runsDirectory = mkdtempSync(join(tmpdir(), "aj-run-dashboard-test-"));
  tempDirs.push(runsDirectory);
  const dagReader =
    typeof dagRunsOrReader === "function" ? dagRunsOrReader : () => dagRunsOrReader;

  return new RunDashboardService(new RunSummaryService(), runsDirectory, dagReader);
}

function makeDagRun(overrides: Partial<BelDagRunState> & {
  runId: string;
  dagId: string;
  status: BelDagRunStatus;
}): BelDagRunState {
  return {
    runId: overrides.runId,
    dagId: overrides.dagId,
    status: overrides.status,
    environment: overrides.environment ?? "development",
    tenantId: overrides.tenantId,
    nodes: overrides.nodes ?? [makeNode({ nodeId: "start", status: "completed" })],
    edges: overrides.edges ?? [],
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2025-01-01T00:00:00.000Z",
    createdBy: overrides.createdBy ?? "test",
  };
}

function makeNode(overrides: {
  nodeId: string;
  status: BelDagNode["status"];
}): BelDagNode {
  return {
    nodeId: overrides.nodeId,
    type: "transform",
    name: overrides.nodeId,
    status: overrides.status,
    riskLevel: "low",
    inputRefs: [],
    outputRefs: [],
    attempts: 0,
    maxAttempts: 1,
  };
}
