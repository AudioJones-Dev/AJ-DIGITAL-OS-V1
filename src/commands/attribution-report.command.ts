import { generateSummary } from "../attribution/attribution-report.js";
import type { AttributionSummary } from "../attribution/attribution-types.js";

export interface AttributionReportCommandInput {
  agent?: string;
  days?: number;
  json?: boolean;
}

export interface AttributionReportCommandResult {
  ok: boolean;
  command: "attribution-report";
  rendered: boolean;
  summary?: AttributionSummary;
  warnings: string[];
  errors: string[];
}

export class AttributionReportCommand {
  async run(input: AttributionReportCommandInput = {}): Promise<AttributionReportCommandResult> {
    const agentId = input.agent ?? "orchestrator";
    const days = input.days ?? 30;

    try {
      const summary = await generateSummary(agentId, days);

      if (input.json === true) {
        this.printJson(summary);
      } else {
        this.renderHuman(summary, days);
      }

      return {
        ok: true,
        command: "attribution-report",
        rendered: true,
        summary,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown attribution report error.";
      return {
        ok: false,
        command: "attribution-report",
        rendered: false,
        warnings: [],
        errors: [message],
      };
    }
  }

  private renderHuman(summary: AttributionSummary, days: number): void {
    console.log("ATTRIBUTION REPORT");
    console.log("==================");
    console.log(`Agent:   ${summary.agentId}`);
    console.log(`Period:  ${days} days`);
    console.log(`From:    ${summary.periodStart}`);
    console.log(`To:      ${summary.periodEnd}`);
    console.log(`Channel: ${summary.channel}`);
    console.log("");
    console.log("Counts");
    console.log(`- Total Runs:       ${summary.totalRuns}`);
    console.log(`- Completed:        ${summary.completedRuns}`);
    console.log(`- Failed:           ${summary.failedRuns}`);
    console.log(`- Published Content:${summary.publishedContent}`);
  }

  private printJson(summary: AttributionSummary): void {
    console.log(JSON.stringify(summary, null, 2));
  }
}
