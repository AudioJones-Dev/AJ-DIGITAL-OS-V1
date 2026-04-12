import {
  RunDashboardService,
  type RunDashboardItem,
  type RunDashboardResult,
  type RunModelFilter,
} from "../services/observability/run-dashboard.js";

export interface DashboardCommandInput {
  limit?: number;
  json?: boolean;
  modelFilter?: RunModelFilter;
}

export interface DashboardCommandResult {
  ok: boolean;
  command: "dashboard";
  limit?: number;
  rendered: boolean;
  dashboard?: RunDashboardResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for rendering the AJ Digital OS run dashboard.
 */
export class DashboardCommand {
  constructor(private readonly runDashboardService = new RunDashboardService()) {}

  /**
   * Loads and renders the dashboard in human or JSON mode.
   */
  async run(input: DashboardCommandInput = {}): Promise<DashboardCommandResult> {
    const dashboard = await this.runDashboardService.getDashboard({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.modelFilter ? { modelFilter: input.modelFilter } : {}),
    });

    if (input.json === true) {
      this.printJson(dashboard);
    } else {
      this.renderHumanDashboard(dashboard);
    }

    return {
      ok: dashboard.ok,
      command: "dashboard",
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      rendered: true,
      dashboard,
      warnings: dashboard.warnings,
      errors: dashboard.errors,
    };
  }

  private renderHumanDashboard(dashboard: RunDashboardResult): void {
    console.log("AJ DIGITAL OS DASHBOARD");
    console.log("=======================");

    if (dashboard.totalRuns === 0) {
      console.log(
        dashboard.activeModelFilter
          ? "No runs matched the active model filters."
          : "No runs found.",
      );
      if (dashboard.activeModelFilter) {
        console.log(`Source Runs: ${dashboard.sourceTotalRuns}`);
        this.renderActiveFilters(dashboard.activeModelFilter);
      }
      this.renderWarnings(dashboard.warnings);
      this.renderErrors(dashboard.errors);
      return;
    }

    console.log(`Total Runs: ${dashboard.totalRuns}`);
    if (dashboard.activeModelFilter) {
      console.log(`Source Runs: ${dashboard.sourceTotalRuns}`);
      this.renderActiveFilters(dashboard.activeModelFilter);
    }
    console.log("");
    console.log("Counts");
    console.log(`- Queued: ${dashboard.counts.queued}`);
    console.log(`- Pending Approval: ${dashboard.counts.pendingApproval}`);
    console.log(`- Approved: ${dashboard.counts.approved}`);
    console.log(`- Executed: ${dashboard.counts.executed}`);
    console.log(`- Rejected: ${dashboard.counts.rejected}`);
    console.log(`- Revision Requested: ${dashboard.counts.revisionRequested}`);
    console.log(`- Failed: ${dashboard.counts.failed}`);
    this.renderModelHealth(dashboard);
    this.renderModelTrend(dashboard);

    this.renderRunList("Pending Approvals", dashboard.pendingApprovals);
    this.renderRunList("Recent Failures", dashboard.recentFailures);
    this.renderRunList("Recently Published", dashboard.recentlyPublished, true);
    this.renderRunList("Recent Runs", dashboard.recentRuns);
    this.renderWarnings(dashboard.warnings);
    this.renderErrors(dashboard.errors);
  }

  private renderRunList(title: string, items: RunDashboardItem[], includePublishedPath = false): void {
    console.log("");
    console.log(title);

    if (items.length === 0) {
      console.log("- None");
      return;
    }

    for (const item of items) {
      console.log(this.formatRunItem(item, includePublishedPath));
    }
  }

  private renderModelHealth(dashboard: RunDashboardResult): void {
    console.log("");
    console.log("Model Health");
    this.renderModelHealthWindow("All Time", dashboard.modelHealthWindows.allTime);
    this.renderModelHealthWindow("Last 24 Hours", dashboard.modelHealthWindows.last24Hours);
    this.renderModelHealthWindow("Last 7 Days", dashboard.modelHealthWindows.last7Days);

    console.log("");
    console.log("Provider Distribution");
    this.renderProviderDistributionWindow("All Time", dashboard.providerDistributionWindows.allTime);
    this.renderProviderDistributionWindow("Last 24 Hours", dashboard.providerDistributionWindows.last24Hours);
    this.renderProviderDistributionWindow("Last 7 Days", dashboard.providerDistributionWindows.last7Days);
  }

  private renderActiveFilters(modelFilter: RunModelFilter): void {
    console.log("");
    console.log("Active Filters");

    for (const entry of this.formatModelFilterEntries(modelFilter)) {
      console.log(`- ${entry}`);
    }
  }

  private renderModelHealthWindow(
    label: string,
    counts: RunDashboardResult["modelHealth"],
  ): void {
    console.log(`- ${label}`);
    console.log(`  Not Attempted: ${counts.notAttempted}`);
    console.log(`  Attempted: ${counts.attempted}`);
    console.log(`  Succeeded: ${counts.succeeded}`);
    console.log(`  Repaired Success: ${counts.repairedSuccess}`);
    console.log(`  Failed: ${counts.failed}`);
    console.log(`  Fallback Used: ${counts.fallbackUsed}`);
  }

  private renderProviderDistributionWindow(
    label: string,
    distribution: Record<string, number>,
  ): void {
    const providers = Object.entries(distribution).sort(([left], [right]) =>
      left.localeCompare(right),
    );

    if (providers.length === 0) {
      console.log(`- ${label}: None`);
      return;
    }

    const providerSummary = providers
      .map(([provider, count]) => `${provider}=${count}`)
      .join(", ");
    console.log(`- ${label}: ${providerSummary}`);
  }

  private renderModelTrend(dashboard: RunDashboardResult): void {
    console.log("");
    console.log("Model Trend");
    console.log(`- Comparison: ${dashboard.modelHealthTrend.comparison}`);
    console.log(`- Recent Attempted Runs: ${dashboard.modelHealthTrend.recentAttempted}`);
    console.log(`- Baseline Attempted Runs: ${dashboard.modelHealthTrend.baselineAttempted}`);

    if (!dashboard.modelHealthTrend.sufficientData) {
      console.log(`- Status: insufficient_data`);
      console.log(`- Reason: ${dashboard.modelHealthTrend.reason ?? "Not enough data."}`);
      return;
    }

    this.renderTrendMetric("Success Rate", dashboard.modelHealthTrend.successRate);
    this.renderTrendMetric("Fallback Rate", dashboard.modelHealthTrend.fallbackRate);
    this.renderTrendMetric("Failure Rate", dashboard.modelHealthTrend.failureRate);
  }

  private renderTrendMetric(
    label: string,
    metric: RunDashboardResult["modelHealthTrend"]["successRate"],
  ): void {
    console.log(
      `- ${label}: ${this.formatPercent(metric.recentRate)} vs ${this.formatPercent(metric.baselineRate)} `
      + `(delta ${this.formatSignedPercent(metric.delta)}, ${metric.status})`,
    );
  }

  private formatPercent(value: number | null): string {
    if (value === null) {
      return "-";
    }

    return `${(value * 100).toFixed(1)}%`;
  }

  private formatSignedPercent(value: number | null): string {
    if (value === null) {
      return "-";
    }

    const percent = value * 100;
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
  }

  private formatModelFilterEntries(modelFilter: RunModelFilter): string[] {
    const entries: string[] = [];

    if (modelFilter.attempted === true) {
      entries.push("modelAttempted=true");
    }

    if (modelFilter.succeeded === true) {
      entries.push("modelSucceeded=true");
    }

    if (modelFilter.repairedSuccess === true) {
      entries.push("repairedSuccess=true");
    }

    if (modelFilter.failed === true) {
      entries.push("modelFailed=true");
    }

    if (modelFilter.fallbackUsed === true) {
      entries.push("fallbackUsed=true");
    }

    if (modelFilter.provider) {
      entries.push(`provider=${modelFilter.provider}`);
    }

    return entries;
  }

  private renderWarnings(warnings: string[]): void {
    if (warnings.length === 0) {
      return;
    }

    console.log("");
    console.log("Warnings");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  private renderErrors(errors: string[]): void {
    if (errors.length === 0) {
      return;
    }

    console.log("");
    console.log("Errors");
    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }

  private printJson(dashboard: RunDashboardResult): void {
    console.log(JSON.stringify(dashboard, null, 2));
  }

  private formatRunItem(item: RunDashboardItem, includePublishedPath: boolean): string {
    const parts = [
      item.runId,
      item.clientId ?? "-",
      item.taskType ?? "-",
      item.status ?? "-",
      item.modelOutcome ?? "not_attempted",
      item.modelProvider ?? "-",
      item.updatedAt ?? "-",
    ];

    if (includePublishedPath) {
      parts.push(item.publishedPath ?? "-");
    }

    return `- ${parts.join(" | ")}`;
  }
}
