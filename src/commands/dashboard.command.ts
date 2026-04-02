import {
  RunDashboardService,
  type RunDashboardItem,
  type RunDashboardResult,
} from "../services/observability/run-dashboard.js";

export interface DashboardCommandInput {
  limit?: number;
  json?: boolean;
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
      console.log("No runs found.");
      this.renderWarnings(dashboard.warnings);
      this.renderErrors(dashboard.errors);
      return;
    }

    console.log(`Total Runs: ${dashboard.totalRuns}`);
    console.log("");
    console.log("Counts");
    console.log(`- Queued: ${dashboard.counts.queued}`);
    console.log(`- Pending Approval: ${dashboard.counts.pendingApproval}`);
    console.log(`- Approved: ${dashboard.counts.approved}`);
    console.log(`- Executed: ${dashboard.counts.executed}`);
    console.log(`- Rejected: ${dashboard.counts.rejected}`);
    console.log(`- Revision Requested: ${dashboard.counts.revisionRequested}`);
    console.log(`- Failed: ${dashboard.counts.failed}`);

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
      item.updatedAt ?? "-",
    ];

    if (includePublishedPath) {
      parts.push(item.publishedPath ?? "-");
    }

    return `- ${parts.join(" | ")}`;
  }
}
