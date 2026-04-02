import {
  RunDashboardService,
  type RunDashboardItem,
} from "../services/observability/run-dashboard.js";

export interface ListPendingApprovalsCommandInput {
  limit?: number;
  json?: boolean;
}

export interface ListPendingApprovalsCommandResult {
  ok: boolean;
  command: "list-pending-approvals";
  limit?: number;
  rendered: boolean;
  totalPending: number;
  pendingApprovals: RunDashboardItem[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for listing runs that are awaiting approval.
 */
export class ListPendingApprovalsCommand {
  constructor(private readonly runDashboardService = new RunDashboardService()) {}

  /**
   * Loads the pending approval queue and renders it in human or JSON mode.
   */
  async run(
    input: ListPendingApprovalsCommandInput = {},
  ): Promise<ListPendingApprovalsCommandResult> {
    const dashboard = await this.runDashboardService.getDashboard({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

    const pendingApprovals = input.limit === undefined
      ? dashboard.pendingApprovals
      : dashboard.pendingApprovals.slice(0, Math.max(0, Math.floor(input.limit)));
    const totalPending = pendingApprovals.length;

    if (input.json === true) {
      this.printJson({ totalPending, pendingApprovals });
    } else {
      this.renderHumanQueue(totalPending, pendingApprovals, dashboard.warnings, dashboard.errors);
    }

    return {
      ok: dashboard.ok,
      command: "list-pending-approvals",
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      rendered: true,
      totalPending,
      pendingApprovals,
      warnings: dashboard.warnings,
      errors: dashboard.errors,
    };
  }

  private renderHumanQueue(
    totalPending: number,
    pendingApprovals: RunDashboardItem[],
    warnings: string[],
    errors: string[],
  ): void {
    console.log("AJ DIGITAL OS PENDING APPROVALS");
    console.log("===============================");

    if (totalPending === 0) {
      console.log("No pending approvals found.");
      this.renderWarnings(warnings);
      this.renderErrors(errors);
      return;
    }

    console.log(`Total Pending: ${totalPending}`);
    console.log("");
    console.log("Queue");
    this.renderQueueRows(pendingApprovals);
    console.log("");
    console.log("Next Action");
    console.log("- Use approve-run to approve, reject, or request revision for a specific run.");
    this.renderWarnings(warnings);
    this.renderErrors(errors);
  }

  private renderQueueRows(items: RunDashboardItem[]): void {
    for (const [index, item] of items.entries()) {
      console.log(`${index + 1}. ${this.formatQueueRow(item)}`);
    }
  }

  private formatQueueRow(item: RunDashboardItem): string {
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

  private printJson(payload: { totalPending: number; pendingApprovals: RunDashboardItem[] }): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
