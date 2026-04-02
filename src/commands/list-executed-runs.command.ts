import {
  RunDashboardService,
  type RunDashboardItem,
} from "../services/observability/run-dashboard.js";

export interface ListExecutedRunsCommandInput {
  limit?: number;
  json?: boolean;
}

export interface ListExecutedRunsCommandResult {
  ok: boolean;
  command: "list-executed-runs";
  limit?: number;
  rendered: boolean;
  totalExecuted: number;
  executedRuns: RunDashboardItem[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for listing runs that completed execution.
 */
export class ListExecutedRunsCommand {
  constructor(private readonly runDashboardService = new RunDashboardService()) {}

  /**
   * Loads the executed runs queue and renders it in human or JSON mode.
   */
  async run(input: ListExecutedRunsCommandInput = {}): Promise<ListExecutedRunsCommandResult> {
    const dashboard = await this.runDashboardService.getDashboard({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

    const executedRuns = input.limit === undefined
      ? dashboard.recentlyPublished
      : dashboard.recentlyPublished.slice(0, Math.max(0, Math.floor(input.limit)));
    const totalExecuted = executedRuns.length;

    if (input.json === true) {
      this.printJson({ totalExecuted, executedRuns });
    } else {
      this.renderHumanExecutedRuns(totalExecuted, executedRuns, dashboard.warnings, dashboard.errors);
    }

    return {
      ok: dashboard.ok,
      command: "list-executed-runs",
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      rendered: true,
      totalExecuted,
      executedRuns,
      warnings: dashboard.warnings,
      errors: dashboard.errors,
    };
  }

  private renderHumanExecutedRuns(
    totalExecuted: number,
    executedRuns: RunDashboardItem[],
    warnings: string[],
    errors: string[],
  ): void {
    console.log("AJ DIGITAL OS EXECUTED RUNS");
    console.log("===========================");

    if (totalExecuted === 0) {
      console.log("No executed runs found.");
      this.renderWarnings(warnings);
      this.renderErrors(errors);
      return;
    }

    console.log(`Total Executed: ${totalExecuted}`);
    console.log("");
    console.log("Executed Runs");
    this.renderExecutedRows(executedRuns);
    this.renderWarnings(warnings);
    this.renderErrors(errors);
  }

  private renderExecutedRows(items: RunDashboardItem[]): void {
    for (const [index, item] of items.entries()) {
      console.log(`${index + 1}. ${this.formatExecutedRow(item)}`);
      console.log(`   Path: ${item.publishedPath ?? "-"}`);
      if (index < items.length - 1) {
        console.log("");
      }
    }
  }

  private formatExecutedRow(item: RunDashboardItem): string {
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

  private printJson(payload: { totalExecuted: number; executedRuns: RunDashboardItem[] }): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
