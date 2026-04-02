import { readdir } from "node:fs/promises";
import path from "node:path";

import { logger } from "../../core/logger.js";
import type { RunStatus } from "../../types/run.types.js";
import { RunSummaryService, type RunSummaryResult } from "./run-summary.js";

export interface RunDashboardInput {
  limit?: number;
}

export interface RunDashboardItem {
  runId: string;
  clientId?: string;
  workflowId?: string;
  taskType?: string;
  status?: string;
  approvalStatus?: string;
  updatedAt?: string;
  publishedPath?: string;
  publishedFiles: string[];
  warningCount: number;
  errorCount: number;
  eventCount: number;
}

export interface RunDashboardResult {
  ok: boolean;
  totalRuns: number;
  counts: {
    queued: number;
    pendingApproval: number;
    approved: number;
    executed: number;
    rejected: number;
    revisionRequested: number;
    failed: number;
  };
  recentRuns: RunDashboardItem[];
  recentFailures: RunDashboardItem[];
  pendingApprovals: RunDashboardItem[];
  recentlyPublished: RunDashboardItem[];
  warnings: string[];
  errors: string[];
}

/**
 * Read-only dashboard aggregator for persisted runs.
 */
export class RunDashboardService {
  constructor(
    private readonly runSummaryService = new RunSummaryService(),
    private readonly runsDirectory = path.resolve("src", "data", "runs"),
  ) {}

  /**
   * Returns a system-level dashboard view for persisted runs.
   */
  async getDashboard(input: RunDashboardInput = {}): Promise<RunDashboardResult> {
    const limit = this.normalizeLimit(input.limit);
    logger.info("Run dashboard requested.", {
      limit,
    });

    const warnings: string[] = [];
    const errors: string[] = [];

    const runIds = await this.listRunIds(warnings, errors);
    const summaries = await this.safeReadRunSummaries(runIds, warnings, errors);
    const items = summaries
      .filter((summary) => summary.ok)
      .map((summary) => this.buildDashboardItem(summary));

    const sortedItems = this.sortByRecency(items);
    const cappedRecentRuns = this.capItems(sortedItems, limit);
    const recentFailures = this.capItems(sortedItems.filter((item) => this.isFailureRun(item)), limit);
    const pendingApprovals = this.capItems(sortedItems.filter((item) => this.isPendingApprovalRun(item)), limit);
    const recentlyPublished = this.capItems(sortedItems.filter((item) => this.isPublishedRun(item)), limit);

    logger.info("Run dashboard aggregated.", {
      totalRuns: items.length,
      recentRuns: cappedRecentRuns.length,
      failures: recentFailures.length,
    });

    return {
      ok: errors.length === 0,
      totalRuns: items.length,
      counts: this.countStatuses(items),
      recentRuns: cappedRecentRuns,
      recentFailures,
      pendingApprovals,
      recentlyPublished,
      warnings,
      errors,
    };
  }

  private async listRunIds(warnings: string[], errors: string[]): Promise<string[]> {
    try {
      const entries = await readdir(this.runsDirectory, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => path.basename(entry.name, ".json"));
    } catch (error) {
      if (this.isFileMissingError(error)) {
        warnings.push("Run storage directory does not exist yet.");
        return [];
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Failed to enumerate run files: ${message}`);
      logger.error("Run dashboard failed to enumerate runs.", {
        error: message,
      });
      return [];
    }
  }

  private async safeReadRunSummaries(
    runIds: string[],
    warnings: string[],
    errors: string[],
  ): Promise<RunSummaryResult[]> {
    const summaries = await Promise.all(
      runIds.map(async (runId) => {
        try {
          const summary = await this.runSummaryService.getSummary({ runId });
          if (!summary.ok) {
            warnings.push(`Run summary unavailable for \"${runId}\".`);
          }
          return summary;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Failed to build summary for \"${runId}\": ${message}`);
          logger.error("Run dashboard failed to build run summary.", {
            runId,
            error: message,
          });
          return this.buildErroredSummary(runId, message);
        }
      }),
    );

    return summaries;
  }

  private buildDashboardItem(summary: RunSummaryResult): RunDashboardItem {
    return {
      runId: summary.runId,
      ...(summary.clientId ? { clientId: summary.clientId } : {}),
      ...(summary.workflowId ? { workflowId: summary.workflowId } : {}),
      ...(summary.taskType ? { taskType: summary.taskType } : {}),
      ...(summary.status ? { status: summary.status } : {}),
      ...(summary.approvalStatus ? { approvalStatus: summary.approvalStatus } : {}),
      ...(summary.updatedAt ? { updatedAt: summary.updatedAt } : {}),
      ...(summary.publishedPath ? { publishedPath: summary.publishedPath } : {}),
      publishedFiles: summary.publishedFiles,
      warningCount: summary.warnings.length,
      errorCount: summary.errors.length,
      eventCount: summary.eventCount,
    };
  }

  private sortByRecency(items: RunDashboardItem[]): RunDashboardItem[] {
    return [...items].sort((left, right) => this.getRecencyValue(right) - this.getRecencyValue(left));
  }

  private getRecencyValue(item: RunDashboardItem): number {
    const timestamp = item.updatedAt;
    return timestamp ? Date.parse(timestamp) || 0 : 0;
  }

  private countStatuses(items: RunDashboardItem[]): RunDashboardResult["counts"] {
    const counts: RunDashboardResult["counts"] = {
      queued: 0,
      pendingApproval: 0,
      approved: 0,
      executed: 0,
      rejected: 0,
      revisionRequested: 0,
      failed: 0,
    };

    for (const item of items) {
      switch (item.status as RunStatus | undefined) {
        case "queued":
          counts.queued += 1;
          break;
        case "pending_approval":
          counts.pendingApproval += 1;
          break;
        case "approved":
          counts.approved += 1;
          break;
        case "executed":
          counts.executed += 1;
          break;
        case "rejected":
          counts.rejected += 1;
          break;
        case "revision_requested":
          counts.revisionRequested += 1;
          break;
      }

      if (this.isFailureRun(item)) {
        counts.failed += 1;
      }
    }

    return counts;
  }

  private isFailureRun(item: RunDashboardItem): boolean {
    return item.status === "validation_failed" || (item.errorCount > 0 && item.status !== "executed");
  }

  private isPendingApprovalRun(item: RunDashboardItem): boolean {
    return item.status === "pending_approval" || item.approvalStatus === "pending";
  }

  private isPublishedRun(item: RunDashboardItem): boolean {
    return item.status === "executed" && (!!item.publishedPath || item.publishedFiles.length > 0);
  }

  private capItems(items: RunDashboardItem[], limit: number | undefined): RunDashboardItem[] {
    return limit === undefined ? items : items.slice(0, limit);
  }

  private normalizeLimit(limit: number | undefined): number | undefined {
    if (limit === undefined) {
      return undefined;
    }

    return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined;
  }

  private buildErroredSummary(runId: string, error: string): RunSummaryResult {
    return {
      ok: false,
      runId,
      publishedFiles: [],
      eventCount: 0,
      warnings: [],
      errors: [error],
      events: [],
    };
  }

  private isFileMissingError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  }
}
