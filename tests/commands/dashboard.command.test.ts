import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardCommand } from "../../src/commands/dashboard.command.js";
import {
  RunDashboardService,
  type RunDashboardResult,
} from "../../src/services/observability/run-dashboard.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardCommand DAG rendering", () => {
  it("renders DAG summary in the human dashboard", async () => {
    const dashboard = makeDashboard({
      totalRuns: 1,
      totalDagRuns: 2,
      dagCounts: {
        pending: 0,
        running: 1,
        waitingForApproval: 1,
        completed: 0,
        failed: 0,
        cancelled: 0,
      },
      recentDagRuns: [
        {
          runId: "dag-run-waiting",
          dagId: "client-onboarding",
          status: "waiting_for_approval",
          environment: "development",
          tenantId: "tenant-a",
          nodeCount: 4,
          waitingNodeCount: 1,
          failedNodeCount: 0,
          updatedAt: "2026-07-05T12:00:00.000Z",
        },
      ],
    });
    const logs = await renderDashboard(dashboard);

    expect(logs).toContain("DAG Runs");
    expect(logs).toContain("- Total DAG Runs: 2");
    expect(logs).toContain("- Waiting Approval: 1");
    expect(logs).toContain("Recent DAG Runs");
    expect(logs).toContain(
      "- dag-run-waiting | client-onboarding | waiting_for_approval | development | tenant-a | nodes=4 | waiting=1 | failed=0 | 2026-07-05T12:00:00.000Z",
    );
  });

  it("renders DAG summary when no standard runs exist", async () => {
    const dashboard = makeDashboard({
      totalRuns: 0,
      totalDagRuns: 1,
      recentRuns: [],
      dagCounts: {
        pending: 1,
        running: 0,
        waitingForApproval: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      },
      recentDagRuns: [
        {
          runId: "dag-run-pending",
          dagId: "daily-ops",
          status: "pending",
          environment: "development",
          nodeCount: 2,
          waitingNodeCount: 0,
          failedNodeCount: 0,
          updatedAt: "2026-07-05T13:00:00.000Z",
        },
      ],
    });
    const logs = await renderDashboard(dashboard);

    expect(logs).toContain("No runs found.");
    expect(logs).toContain("DAG Runs");
    expect(logs).toContain("- Total DAG Runs: 1");
    expect(logs).toContain("Recent DAG Runs");
  });
});

async function renderDashboard(dashboard: RunDashboardResult): Promise<string[]> {
  const logs: string[] = [];
  vi.spyOn(console, "log").mockImplementation((message = "") => {
    logs.push(String(message));
  });

  const command = new DashboardCommand({
    getDashboard: async () => dashboard,
  } as unknown as RunDashboardService);

  await command.run();
  return logs;
}

function makeDashboard(overrides: Partial<RunDashboardResult> = {}): RunDashboardResult {
  return {
    ok: true,
    totalRuns: 1,
    totalDagRuns: 0,
    sourceTotalRuns: 1,
    counts: {
      queued: 0,
      pendingApproval: 0,
      approved: 0,
      executed: 1,
      rejected: 0,
      revisionRequested: 0,
      failed: 0,
    },
    modelHealth: {
      notAttempted: 0,
      attempted: 1,
      succeeded: 1,
      repairedSuccess: 0,
      failed: 0,
      fallbackUsed: 0,
    },
    providerDistribution: {
      openai: 1,
    },
    modelHealthWindows: {
      allTime: {
        notAttempted: 0,
        attempted: 1,
        succeeded: 1,
        repairedSuccess: 0,
        failed: 0,
        fallbackUsed: 0,
      },
      last24Hours: {
        notAttempted: 0,
        attempted: 1,
        succeeded: 1,
        repairedSuccess: 0,
        failed: 0,
        fallbackUsed: 0,
      },
      last7Days: {
        notAttempted: 0,
        attempted: 1,
        succeeded: 1,
        repairedSuccess: 0,
        failed: 0,
        fallbackUsed: 0,
      },
    },
    providerDistributionWindows: {
      allTime: {
        openai: 1,
      },
      last24Hours: {
        openai: 1,
      },
      last7Days: {
        openai: 1,
      },
    },
    modelHealthTrend: {
      comparison: "last24Hours_vs_last7Days",
      recentAttempted: 1,
      baselineAttempted: 1,
      sufficientData: false,
      reason: "Not enough attempted runs in one or both windows to infer a reliable trend.",
      successRate: {
        recentRate: null,
        baselineRate: null,
        delta: null,
        status: "insufficient_data",
      },
      fallbackRate: {
        recentRate: null,
        baselineRate: null,
        delta: null,
        status: "insufficient_data",
      },
      failureRate: {
        recentRate: null,
        baselineRate: null,
        delta: null,
        status: "insufficient_data",
      },
    },
    recentRuns: [
      {
        runId: "run-1",
        clientId: "client-a",
        taskType: "diagnostic",
        status: "executed",
        updatedAt: "2026-07-05T11:00:00.000Z",
        modelOutcome: "succeeded",
        modelProvider: "openai",
        publishedFiles: [],
        warningCount: 0,
        errorCount: 0,
        eventCount: 1,
      },
    ],
    recentDagRuns: [],
    dagCounts: {
      pending: 0,
      running: 0,
      waitingForApproval: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },
    recentFailures: [],
    pendingApprovals: [],
    recentlyPublished: [],
    warnings: [],
    errors: [],
    ...overrides,
  };
}
