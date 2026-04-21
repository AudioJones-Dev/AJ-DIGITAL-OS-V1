import { readdir } from "node:fs/promises";
import path from "node:path";

import { logger } from "../../core/logger.js";
import type { RunStatus } from "../../types/run.types.js";
import {
  RunSummaryService,
  type ModelExecutionSummary,
  type RunSummaryResult,
} from "./run-summary.js";

export interface RunDashboardInput {
  limit?: number;
  modelFilter?: RunModelFilter;
}

export interface RunDashboardItem {
  runId: string;
  clientId?: string;
  workflowId?: string;
  taskType?: string;
  status?: string;
  approvalStatus?: string;
  updatedAt?: string;
  modelOutcome?: string;
  modelProvider?: string;
  publishedPath?: string;
  publishedFiles: string[];
  warningCount: number;
  errorCount: number;
  eventCount: number;
}

export interface ModelHealthCounts {
  notAttempted: number;
  attempted: number;
  succeeded: number;
  repairedSuccess: number;
  failed: number;
  fallbackUsed: number;
}

export interface ModelHealthWindows {
  allTime: ModelHealthCounts;
  last24Hours: ModelHealthCounts;
  last7Days: ModelHealthCounts;
}

export interface ProviderDistributionWindows {
  allTime: Record<string, number>;
  last24Hours: Record<string, number>;
  last7Days: Record<string, number>;
}

export interface RunModelFilter {
  attempted?: boolean;
  succeeded?: boolean;
  repairedSuccess?: boolean;
  failed?: boolean;
  fallbackUsed?: boolean;
  provider?: string;
}

export type ModelHealthTrendStatus = "improving" | "degrading" | "neutral" | "insufficient_data";

export interface ModelHealthTrendMetric {
  recentRate: number | null;
  baselineRate: number | null;
  delta: number | null;
  status: ModelHealthTrendStatus;
}

export interface ModelHealthTrendSummary {
  comparison: "last24Hours_vs_last7Days";
  recentAttempted: number;
  baselineAttempted: number;
  sufficientData: boolean;
  reason?: string;
  successRate: ModelHealthTrendMetric;
  fallbackRate: ModelHealthTrendMetric;
  failureRate: ModelHealthTrendMetric;
}

export interface RunDashboardResult {
  ok: boolean;
  totalRuns: number;
  sourceTotalRuns: number;
  activeModelFilter?: RunModelFilter;
  counts: {
    queued: number;
    pendingApproval: number;
    approved: number;
    executed: number;
    rejected: number;
    revisionRequested: number;
    failed: number;
  };
  modelHealth: ModelHealthCounts;
  providerDistribution: Record<string, number>;
  modelHealthWindows: ModelHealthWindows;
  providerDistributionWindows: ProviderDistributionWindows;
  modelHealthTrend: ModelHealthTrendSummary;
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
    private readonly runsDirectory = path.resolve("data", "runs"),
  ) {}

  /**
   * Returns a system-level dashboard view for persisted runs.
   */
  async getDashboard(input: RunDashboardInput = {}): Promise<RunDashboardResult> {
    const limit = this.normalizeLimit(input.limit);
    const activeModelFilter = this.normalizeModelFilter(input.modelFilter);
    logger.info("Run dashboard requested.", {
      limit,
      ...(activeModelFilter ? { modelFilter: activeModelFilter } : {}),
    });

    const warnings: string[] = [];
    const errors: string[] = [];

    const runIds = await this.listRunIds(warnings, errors);
    const summaries = await this.safeReadRunSummaries(runIds, warnings, errors);
    const now = Date.now();
    const okSummaries = summaries.filter((summary) => summary.ok);
    const filteredSummaries = this.applyModelFilter(okSummaries, activeModelFilter);
    const modelHealthWindows = this.countModelHealthWindows(filteredSummaries, now);
    const providerDistributionWindows = this.countProviderWindows(filteredSummaries, now);
    const items = filteredSummaries.map((summary) => this.buildDashboardItem(summary));

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
      sourceTotalRuns: okSummaries.length,
      ...(activeModelFilter ? { activeModelFilter } : {}),
      counts: this.countStatuses(items),
      modelHealth: this.countModelHealth(filteredSummaries),
      providerDistribution: this.countProviders(filteredSummaries),
      modelHealthWindows,
      providerDistributionWindows,
      modelHealthTrend: this.buildModelHealthTrendSummary(modelHealthWindows),
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
      ...(summary.modelExecution?.lastOutcome ? { modelOutcome: summary.modelExecution.lastOutcome } : {}),
      ...(summary.modelExecution?.provider ? { modelProvider: summary.modelExecution.provider } : {}),
      ...(summary.publishedPath ? { publishedPath: summary.publishedPath } : {}),
      publishedFiles: summary.publishedFiles,
      warningCount: summary.warnings.length,
      errorCount: summary.errors.length,
      eventCount: summary.eventCount,
    };
  }

  private applyModelFilter(
    summaries: RunSummaryResult[],
    modelFilter: RunModelFilter | undefined,
  ): RunSummaryResult[] {
    if (!modelFilter) {
      return summaries;
    }

    return summaries.filter((summary) => this.matchesModelFilter(summary.modelExecution, modelFilter));
  }

  private matchesModelFilter(
    modelExecution: ModelExecutionSummary | undefined,
    modelFilter: RunModelFilter,
  ): boolean {
    if (modelFilter.attempted === true && modelExecution?.attempted !== true) {
      return false;
    }

    if (modelFilter.succeeded === true && modelExecution?.succeeded !== true) {
      return false;
    }

    if (modelFilter.repairedSuccess === true && modelExecution?.repaired !== true) {
      return false;
    }

    if (modelFilter.failed === true && modelExecution?.failed !== true) {
      return false;
    }

    if (modelFilter.fallbackUsed === true && modelExecution?.fallbackUsed !== true) {
      return false;
    }

    if (
      modelFilter.provider
      && modelExecution?.provider?.toLowerCase() !== modelFilter.provider.toLowerCase()
    ) {
      return false;
    }

    return true;
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

  private countModelHealth(summaries: RunSummaryResult[]): ModelHealthCounts {
    const counts = this.createEmptyModelHealthCounts();

    for (const summary of summaries) {
      if (!summary.ok) {
        continue;
      }

      const modelExecution = summary.modelExecution;
      if (!modelExecution) {
        counts.notAttempted += 1;
        continue;
      }

      this.incrementModelHealthCounts(counts, modelExecution);
    }

    return counts;
  }

  private incrementModelHealthCounts(
    counts: ModelHealthCounts,
    modelExecution: ModelExecutionSummary,
  ): void {
    if (modelExecution.attempted) {
      counts.attempted += 1;
    }

    if (modelExecution.succeeded) {
      counts.succeeded += 1;
    }

    if (modelExecution.repaired) {
      counts.repairedSuccess += 1;
    }

    if (modelExecution.failed) {
      counts.failed += 1;
    }

    if (modelExecution.fallbackUsed) {
      counts.fallbackUsed += 1;
    }
  }

  private countModelHealthWindows(summaries: RunSummaryResult[], now: number): ModelHealthWindows {
    return {
      allTime: this.countModelHealth(summaries),
      last24Hours: this.countModelHealth(this.filterSummariesByWindow(summaries, now, 24 * 60 * 60 * 1000)),
      last7Days: this.countModelHealth(this.filterSummariesByWindow(summaries, now, 7 * 24 * 60 * 60 * 1000)),
    };
  }

  private countProviders(summaries: RunSummaryResult[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const summary of summaries) {
      if (!summary.ok) {
        continue;
      }

      const provider = summary.modelExecution?.provider;
      if (!provider) {
        continue;
      }

      distribution[provider] = (distribution[provider] ?? 0) + 1;
    }

    return distribution;
  }

  private countProviderWindows(summaries: RunSummaryResult[], now: number): ProviderDistributionWindows {
    return {
      allTime: this.countProviders(summaries),
      last24Hours: this.countProviders(this.filterSummariesByWindow(summaries, now, 24 * 60 * 60 * 1000)),
      last7Days: this.countProviders(this.filterSummariesByWindow(summaries, now, 7 * 24 * 60 * 60 * 1000)),
    };
  }

  private buildModelHealthTrendSummary(windows: ModelHealthWindows): ModelHealthTrendSummary {
    const recentAttempted = windows.last24Hours.attempted;
    const baselineAttempted = windows.last7Days.attempted;
    const minimumAttemptCount = 2;

    if (recentAttempted < minimumAttemptCount || baselineAttempted < minimumAttemptCount) {
      return {
        comparison: "last24Hours_vs_last7Days",
        recentAttempted,
        baselineAttempted,
        sufficientData: false,
        reason: "Not enough attempted runs in one or both windows to infer a reliable trend.",
        successRate: this.buildInsufficientTrendMetric(),
        fallbackRate: this.buildInsufficientTrendMetric(),
        failureRate: this.buildInsufficientTrendMetric(),
      };
    }

    return {
      comparison: "last24Hours_vs_last7Days",
      recentAttempted,
      baselineAttempted,
      sufficientData: true,
      successRate: this.buildTrendMetric(
        windows.last24Hours.succeeded,
        recentAttempted,
        windows.last7Days.succeeded,
        baselineAttempted,
        "higher_is_better",
      ),
      fallbackRate: this.buildTrendMetric(
        windows.last24Hours.fallbackUsed,
        recentAttempted,
        windows.last7Days.fallbackUsed,
        baselineAttempted,
        "lower_is_better",
      ),
      failureRate: this.buildTrendMetric(
        windows.last24Hours.failed,
        recentAttempted,
        windows.last7Days.failed,
        baselineAttempted,
        "lower_is_better",
      ),
    };
  }

  private buildInsufficientTrendMetric(): ModelHealthTrendMetric {
    return {
      recentRate: null,
      baselineRate: null,
      delta: null,
      status: "insufficient_data",
    };
  }

  private buildTrendMetric(
    recentCount: number,
    recentAttempted: number,
    baselineCount: number,
    baselineAttempted: number,
    direction: "higher_is_better" | "lower_is_better",
  ): ModelHealthTrendMetric {
    const recentRate = recentCount / recentAttempted;
    const baselineRate = baselineCount / baselineAttempted;
    const delta = recentRate - baselineRate;
    const status = this.deriveTrendStatus(delta, direction);

    return {
      recentRate,
      baselineRate,
      delta,
      status,
    };
  }

  private deriveTrendStatus(
    delta: number,
    direction: "higher_is_better" | "lower_is_better",
  ): ModelHealthTrendStatus {
    const neutralThreshold = 0.05;

    if (Math.abs(delta) < neutralThreshold) {
      return "neutral";
    }

    if (direction === "higher_is_better") {
      return delta > 0 ? "improving" : "degrading";
    }

    return delta < 0 ? "improving" : "degrading";
  }

  private filterSummariesByWindow(
    summaries: RunSummaryResult[],
    now: number,
    windowMs: number,
  ): RunSummaryResult[] {
    return summaries.filter((summary) => {
      if (!summary.ok) {
        return false;
      }

      const recencyValue = this.getSummaryRecencyValue(summary);
      if (recencyValue === 0) {
        return false;
      }

      return now - recencyValue <= windowMs;
    });
  }

  private getSummaryRecencyValue(summary: RunSummaryResult): number {
    const timestamp = summary.updatedAt ?? summary.createdAt;
    return timestamp ? Date.parse(timestamp) || 0 : 0;
  }

  private createEmptyModelHealthCounts(): ModelHealthCounts {
    return {
      notAttempted: 0,
      attempted: 0,
      succeeded: 0,
      repairedSuccess: 0,
      failed: 0,
      fallbackUsed: 0,
    };
  }

  private normalizeModelFilter(modelFilter: RunModelFilter | undefined): RunModelFilter | undefined {
    if (!modelFilter) {
      return undefined;
    }

    const normalized: RunModelFilter = {
      ...(modelFilter.attempted === true ? { attempted: true } : {}),
      ...(modelFilter.succeeded === true ? { succeeded: true } : {}),
      ...(modelFilter.repairedSuccess === true ? { repairedSuccess: true } : {}),
      ...(modelFilter.failed === true ? { failed: true } : {}),
      ...(modelFilter.fallbackUsed === true ? { fallbackUsed: true } : {}),
      ...(typeof modelFilter.provider === "string" && modelFilter.provider.trim().length > 0
        ? { provider: modelFilter.provider.trim() }
        : {}),
    };

    return Object.keys(normalized).length > 0 ? normalized : undefined;
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
