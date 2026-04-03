import {
  RunDashboardService,
  type RunDashboardItem,
} from "../services/observability/run-dashboard.js";

export interface ListApprovedRunsCommandInput {
  limit?: number;
  json?: boolean;
}

export interface ListApprovedRunsCommandResult {
  ok: boolean;
  command: "list-approved-runs";
  limit?: number;
  rendered: boolean;
  totalApproved: number;
  approvedRuns: RunDashboardItem[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for listing runs that are approved and ready to execute.
 */
export class ListApprovedRunsCommand {
  constructor(private readonly runDashboardService = new RunDashboardService()) {}

  /**
   * Loads the approved runs queue and renders it in human or JSON mode.
   */
  async run(input: ListApprovedRunsCommandInput = {}): Promise<ListApprovedRunsCommandResult> {
    const dashboard = await this.runDashboardService.getDashboard({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

    const approvedRuns = this.applyLimit(
      dashboard.recentRuns.filter((item) => item.status === "approved"),
      input.limit,
    );
    const totalApproved = approvedRuns.length;

    if (input.json === true) {
      this.printJson({ totalApproved, approvedRuns });
    } else {
      this.renderHumanApprovedRuns(totalApproved, approvedRuns, dashboard.warnings, dashboard.errors);
    }

    return {
      ok: dashboard.ok,
      command: "list-approved-runs",
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      rendered: true,
      totalApproved,
      approvedRuns,
      warnings: dashboard.warnings,
      errors: dashboard.errors,
    };
  }

  private applyLimit(items: RunDashboardItem[], limit: number | undefined): RunDashboardItem[] {
    if (limit === undefined) {
      return items;
    }

    return items.slice(0, Math.max(0, Math.floor(limit)));
  }

  private renderHumanApprovedRuns(
    totalApproved: number,
    approvedRuns: RunDashboardItem[],
    warnings: string[],
    errors: string[],
  ): void {
    console.log("AJ DIGITAL OS APPROVED RUNS");
    console.log("===========================");

    if (totalApproved === 0) {
      console.log("No approved runs found.");
      this.renderWarnings(warnings);
      this.renderErrors(errors);
      return;
    }

    console.log(`Total Approved: ${totalApproved}`);
    console.log("");
    console.log("Approved Runs");
    this.renderApprovedRows(approvedRuns);
    console.log("");
    console.log("Next Action");
    console.log("- Use execute-run to execute an approved run.");
    console.log("- Use run-summary to inspect a run before executing it.");
    this.renderWarnings(warnings);
    this.renderErrors(errors);
  }

  private renderApprovedRows(items: RunDashboardItem[]): void {
    for (const [index, item] of items.entries()) {
      console.log(`${index + 1}. ${this.formatApprovedRow(item)}`);
    }
  }

  private formatApprovedRow(item: RunDashboardItem): string {
    return [
      item.runId,
      item.clientId ?? "-",
      item.taskType ?? item.workflowId ?? "-",
      item.status ?? item.approvalStatus ?? "-",
      item.updatedAt ?? "-",
    ].join(" | ");
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

  private printJson(payload: { totalApproved: number; approvedRuns: RunDashboardItem[] }): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
