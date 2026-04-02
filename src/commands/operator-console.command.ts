import { type RunDashboardItem } from "../services/observability/run-dashboard.js";
import {
  DashboardCommand,
  type DashboardCommandResult,
} from "./dashboard.command.js";
import {
  ListPendingApprovalsCommand,
  type ListPendingApprovalsCommandResult,
} from "./list-pending-approvals.command.js";
import {
  ListApprovedRunsCommand,
  type ListApprovedRunsCommandResult,
} from "./list-approved-runs.command.js";
import {
  ListFailedRunsCommand,
  type ListFailedRunsCommandResult,
} from "./list-failed-runs.command.js";
import {
  ListExecutedRunsCommand,
  type ListExecutedRunsCommandResult,
} from "./list-executed-runs.command.js";

export interface OperatorConsoleCommandInput {
  limit?: number;
  json?: boolean;
}

export interface OperatorConsoleCommandResult {
  ok: boolean;
  command: "operator-console";
  limit?: number;
  rendered: boolean;
  dashboard?: DashboardCommandResult;
  pendingApprovals?: ListPendingApprovalsCommandResult;
  approvedRuns?: ListApprovedRunsCommandResult;
  failedRuns?: ListFailedRunsCommandResult;
  executedRuns?: ListExecutedRunsCommandResult;
  warnings: string[];
  errors: string[];
}

/**
 * Unified operator-facing terminal console for AJ Digital OS.
 */
export class OperatorConsoleCommand {
  constructor(
    private readonly dashboardCommand = new DashboardCommand(),
    private readonly listPendingApprovalsCommand = new ListPendingApprovalsCommand(),
    private readonly listApprovedRunsCommand = new ListApprovedRunsCommand(),
    private readonly listFailedRunsCommand = new ListFailedRunsCommand(),
    private readonly listExecutedRunsCommand = new ListExecutedRunsCommand(),
  ) {}

  /**
   * Loads the operator console sections and renders them in human or JSON mode.
   */
  async run(input: OperatorConsoleCommandInput = {}): Promise<OperatorConsoleCommandResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const [dashboard, pendingApprovals, approvedRuns, failedRuns, executedRuns] = await this.withSuppressedConsole(
        () => Promise.all([
          this.dashboardCommand.run({ ...(input.limit !== undefined ? { limit: input.limit } : {}), json: true }),
          this.listPendingApprovalsCommand.run({ ...(input.limit !== undefined ? { limit: input.limit } : {}), json: true }),
          this.listApprovedRunsCommand.run({ ...(input.limit !== undefined ? { limit: input.limit } : {}), json: true }),
          this.listFailedRunsCommand.run({ ...(input.limit !== undefined ? { limit: input.limit } : {}), json: true }),
          this.listExecutedRunsCommand.run({ ...(input.limit !== undefined ? { limit: input.limit } : {}), json: true }),
        ]),
      );

      const result: OperatorConsoleCommandResult = {
        ok: dashboard.ok && pendingApprovals.ok && approvedRuns.ok && failedRuns.ok && executedRuns.ok,
        command: "operator-console",
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        rendered: true,
        dashboard,
        pendingApprovals,
        approvedRuns,
        failedRuns,
        executedRuns,
        warnings,
        errors,
      };

      if (input.json === true) {
        this.printJson({ dashboard, pendingApprovals, approvedRuns, failedRuns, executedRuns });
      } else {
        this.renderHumanConsole(result);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown operator console error.";
      errors.push(message);

      if (input.json === true) {
        this.printJson({ ok: false, command: "operator-console", ...(input.limit !== undefined ? { limit: input.limit } : {}), errors });
      } else {
        console.log("AJ DIGITAL OS OPERATOR CONSOLE");
        console.log("==============================");
        console.log("Failed to load operator console.");
        this.renderErrors(errors);
      }

      return {
        ok: false,
        command: "operator-console",
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        rendered: true,
        warnings,
        errors,
      };
    }
  }

  private async withSuppressedConsole<T>(callback: () => Promise<T>): Promise<T> {
    const originalLog = console.log;
    console.log = () => undefined;

    try {
      return await callback();
    } finally {
      console.log = originalLog;
    }
  }

  private renderHumanConsole(result: OperatorConsoleCommandResult): void {
    console.log("AJ DIGITAL OS OPERATOR CONSOLE");
    console.log("==============================");

    if (result.limit !== undefined) {
      console.log(`Limit: ${result.limit}`);
    }

    const totalRuns = result.dashboard?.dashboard?.totalRuns ?? 0;
    if (totalRuns === 0) {
      console.log("No runs found.");
      this.renderNestedWarnings(result);
      this.renderNestedErrors(result);
      this.renderWarnings(result.warnings);
      this.renderErrors(result.errors);
      return;
    }

    this.renderOverview(result.dashboard);
    this.renderRunSection(
      "Pending Approvals",
      result.pendingApprovals?.pendingApprovals ?? [],
      "No pending approvals.",
    );
    this.renderRunSection(
      "Approved Runs",
      result.approvedRuns?.approvedRuns ?? [],
      "No approved runs ready for execution.",
    );
    this.renderRunSection(
      "Failed Runs",
      result.failedRuns?.failedRuns ?? [],
      "No failed runs.",
    );
    this.renderRunSection(
      "Recently Executed",
      result.executedRuns?.executedRuns ?? [],
      "No executed runs found.",
      true,
    );
    this.renderNextActions();
    this.renderNestedWarnings(result);
    this.renderNestedErrors(result);
    this.renderWarnings(result.warnings);
    this.renderErrors(result.errors);
  }

  private renderOverview(dashboard: DashboardCommandResult | undefined): void {
    const metrics = dashboard?.dashboard;
    if (!metrics) {
      return;
    }

    console.log("");
    console.log("System Overview");
    console.log(`- Total Runs: ${metrics.totalRuns}`);
    console.log(`- Queued: ${metrics.counts.queued}`);
    console.log(`- Pending Approval: ${metrics.counts.pendingApproval}`);
    console.log(`- Approved: ${metrics.counts.approved}`);
    console.log(`- Executed: ${metrics.counts.executed}`);
    console.log(`- Rejected: ${metrics.counts.rejected}`);
    console.log(`- Revision Requested: ${metrics.counts.revisionRequested}`);
    console.log(`- Failed: ${metrics.counts.failed}`);
  }

  private renderRunSection(
    title: string,
    items: RunDashboardItem[],
    emptyMessage: string,
    includePublishedPath = false,
  ): void {
    console.log("");
    console.log(title);

    if (items.length === 0) {
      console.log(emptyMessage);
      return;
    }

    for (const [index, item] of items.entries()) {
      console.log(`${index + 1}. ${this.formatRunRow(item)}`);
      if (includePublishedPath) {
        console.log(`   Path: ${item.publishedPath ?? "-"}`);
      }
    }
  }

  private renderNextActions(): void {
    console.log("");
    console.log("Next Actions");
    console.log("- Use approve-run to resolve pending approvals.");
    console.log("- Use execute-run to run approved items.");
    console.log("- Use run-summary or track-run to inspect failed runs.");
  }

  private renderNestedWarnings(result: OperatorConsoleCommandResult): void {
    const warnings = this.collectNestedIssues(result, "warnings");
    this.renderWarnings(warnings);
  }

  private renderNestedErrors(result: OperatorConsoleCommandResult): void {
    const errors = this.collectNestedIssues(result, "errors");
    this.renderErrors(errors);
  }

  private collectNestedIssues(
    result: OperatorConsoleCommandResult,
    key: "warnings" | "errors",
  ): string[] {
    const sections: Array<[string, string[] | undefined]> = [
      ["dashboard", result.dashboard?.[key]],
      ["pending-approvals", result.pendingApprovals?.[key]],
      ["approved-runs", result.approvedRuns?.[key]],
      ["failed-runs", result.failedRuns?.[key]],
      ["executed-runs", result.executedRuns?.[key]],
    ];

    const issues = sections.flatMap(([label, values]) =>
      (values ?? []).map((value) => `[${label}] ${value}`),
    );

    return [...new Set(issues)];
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

  private printJson(payload: unknown): void {
    console.log(JSON.stringify(payload, null, 2));
  }

  private formatRunRow(item: RunDashboardItem): string {
    return [
      item.runId,
      item.clientId ?? "-",
      item.taskType ?? item.workflowId ?? "-",
      item.status ?? item.approvalStatus ?? "-",
      item.updatedAt ?? "-",
    ].join(" | ");
  }
}
