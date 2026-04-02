import {
  RunDashboardService,
  type RunDashboardItem,
} from "../services/observability/run-dashboard.js";

export interface ListFailedRunsCommandInput {
  limit?: number;
  json?: boolean;
}

export interface ListFailedRunsCommandResult {
  ok: boolean;
  command: "list-failed-runs";
  limit?: number;
  rendered: boolean;
  totalFailed: number;
  failedRuns: RunDashboardItem[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for listing failed runs.
 */
export class ListFailedRunsCommand {
  constructor(private readonly runDashboardService = new RunDashboardService()) {}

  /**
   * Loads the failed runs queue and renders it in human or JSON mode.
   */
  async run(input: ListFailedRunsCommandInput = {}): Promise<ListFailedRunsCommandResult> {
    const dashboard = await this.runDashboardService.getDashboard({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

    const failedRuns = input.limit === undefined
      ? dashboard.recentFailures
      : dashboard.recentFailures.slice(0, Math.max(0, Math.floor(input.limit)));
    const totalFailed = failedRuns.length;

    if (input.json === true) {
      this.printJson({ totalFailed, failedRuns });
    } else {
      this.renderHumanFailedRuns(totalFailed, failedRuns, dashboard.warnings, dashboard.errors);
    }

    return {
      ok: dashboard.ok,
      command: "list-failed-runs",
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      rendered: true,
      totalFailed,
      failedRuns,
      warnings: dashboard.warnings,
      errors: dashboard.errors,
    };
  }

  private renderHumanFailedRuns(
    totalFailed: number,
    failedRuns: RunDashboardItem[],
    warnings: string[],
    errors: string[],
  ): void {
    console.log("AJ DIGITAL OS FAILED RUNS");
    console.log("=========================");

    if (totalFailed === 0) {
      console.log("No failed runs found.");
      this.renderWarnings(warnings);
      this.renderErrors(errors);
      return;
    }

    console.log(`Total Failed: ${totalFailed}`);
    console.log("");
    console.log("Failed Runs");
    this.renderFailedRows(failedRuns);
    console.log("");
    console.log("Next Action");
    console.log("- Use run-summary or run-events to inspect details for a failed run.");
    console.log("- Use resume-run only if the run is resumable and policy allows it.");
    this.renderWarnings(warnings);
    this.renderErrors(errors);
  }

  private renderFailedRows(items: RunDashboardItem[]): void {
    for (const [index, item] of items.entries()) {
      console.log(`${index + 1}. ${this.formatFailedRow(item)}`);
    }
  }

  private formatFailedRow(item: RunDashboardItem): string {
    return [
      item.runId,
      item.clientId ?? "-",
      item.taskType ?? item.workflowId ?? "-",
      item.status ?? "-",
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

  private printJson(payload: { totalFailed: number; failedRuns: RunDashboardItem[] }): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
