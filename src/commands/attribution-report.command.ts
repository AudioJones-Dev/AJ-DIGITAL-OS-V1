import { generateSummary } from "../attribution/attribution-report.js";
import { getRecentEvents } from "../attribution/attribution-tracker.js";
import { filterMAPCompliant, getMAPStats } from "../attribution/map-validator.js";
import type { AttributionSummary } from "../attribution/attribution-types.js";

export interface AttributionReportCommandInput {
  agent?: string;
  days?: number;
  json?: boolean;
  map?: boolean;
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

      if (input.map) {
        const events = getRecentEvents(500);
        const compliant = filterMAPCompliant(events);
        const stats = getMAPStats(events);
        if (input.json) {
          console.log(JSON.stringify({ ok: true, mapStats: stats, compliantEvents: compliant }, null, 2));
        } else {
          console.log("MAP ATTRIBUTION REPORT");
          console.log("======================");
          console.log(`Total events:      ${stats.total}`);
          console.log(`MAP-compliant:     ${stats.compliant}`);
          console.log(`Non-compliant:     ${stats.nonCompliant}`);
          console.log(`Compliance rate:   ${stats.complianceRate}%`);
        }
        return { ok: true, command: "attribution-report", rendered: true, summary, warnings: [], errors: [] };
      }

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
