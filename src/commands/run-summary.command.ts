import {
  RunSummaryService,
  type RunSummaryResult,
} from "../services/observability/run-summary.js";

export interface RunSummaryCommandInput {
  runId: string;
  json?: boolean;
}

export interface RunSummaryCommandResult {
  ok: boolean;
  command: "run-summary";
  runId: string;
  rendered: boolean;
  summary?: RunSummaryResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for rendering a single run summary.
 */
export class RunSummaryCommand {
  constructor(private readonly runSummaryService = new RunSummaryService()) {}

  /**
   * Loads and renders a run summary in human or JSON mode.
   */
  async run(input: RunSummaryCommandInput): Promise<RunSummaryCommandResult> {
    const runId = input.runId.trim();

    if (runId.length === 0) {
      const error = "A non-empty runId is required.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId: input.runId, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS RUN SUMMARY");
        console.log("=========================");
        console.log(error);
      }

      return {
        ok: false,
        command: "run-summary",
        runId: input.runId,
        rendered: true,
        warnings: [],
        errors: [error],
      };
    }

    const summary = await this.runSummaryService.getSummary({ runId });

    if (input.json === true) {
      this.printJson(summary);
    } else {
      this.renderHumanSummary(summary);
    }

    return {
      ok: summary.ok,
      command: "run-summary",
      runId,
      rendered: true,
      summary,
      warnings: summary.warnings,
      errors: summary.errors,
    };
  }

  private renderHumanSummary(summary: RunSummaryResult): void {
    console.log("AJ DIGITAL OS RUN SUMMARY");
    console.log("=========================");

    if (!summary.ok) {
      console.log(`Run ID: ${summary.runId}`);
      console.log("Run not found.");
      this.renderWarnings(summary.warnings);
      this.renderErrors(summary.errors);
      return;
    }

    this.renderMetadataSection(summary);
    this.renderPublishedOutput(summary);
    this.renderWarnings(summary.warnings);
    this.renderErrors(summary.errors);
    this.renderEvents(summary);
  }

  private renderMetadataSection(summary: RunSummaryResult): void {
    console.log(`Run ID: ${summary.runId}`);
    console.log(`Client: ${summary.clientId ?? "-"}`);
    console.log(`Workflow: ${summary.workflowId ?? "-"}`);
    console.log(`Task Type: ${summary.taskType ?? "-"}`);
    console.log(`Status: ${summary.status ?? "-"}`);
    console.log(`Approval Status: ${summary.approvalStatus ?? "-"}`);
    console.log(`Created At: ${summary.createdAt ?? "-"}`);
    console.log(`Updated At: ${summary.updatedAt ?? "-"}`);
    console.log(`Approved At: ${summary.approvedAt ?? "-"}`);
    console.log(`Approved By: ${summary.approvedBy ?? "-"}`);
    console.log(`Approval Message ID: ${summary.approvalMessageId ?? "-"}`);
    console.log(`Revision Count: ${summary.revisionCount ?? 0}`);
    console.log(`Event Count: ${summary.eventCount}`);
    console.log(`Last Event Type: ${summary.lastEventType ?? "-"}`);
  }

  private renderPublishedOutput(summary: RunSummaryResult): void {
    console.log("");
    console.log("Published Output");
    console.log(`- Path: ${summary.publishedPath ?? "-"}`);
    console.log("- Files:");

    if (summary.publishedFiles.length === 0) {
      console.log("  - None");
      return;
    }

    for (const file of summary.publishedFiles) {
      console.log(`  - ${file}`);
    }
  }

  private renderWarnings(warnings: string[]): void {
    console.log("");
    console.log("Warnings");

    if (warnings.length === 0) {
      console.log("- None");
      return;
    }

    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  private renderErrors(errors: string[]): void {
    console.log("");
    console.log("Errors");

    if (errors.length === 0) {
      console.log("- None");
      return;
    }

    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }

  private renderEvents(summary: RunSummaryResult): void {
    console.log("");
    console.log("Events");

    if (summary.events.length === 0) {
      console.log("- None");
      return;
    }

    for (const event of summary.events) {
      const parts = [event.timestamp, event.type];
      if (event.message) {
        parts.push(event.message);
      }
      console.log(`- ${parts.join(" | ")}`);
    }
  }

  private printJson(summary: RunSummaryResult): void {
    console.log(JSON.stringify(summary, null, 2));
  }
}
