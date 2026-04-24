import { getTopOpportunities } from "../intelligence/opportunity-store.js";
import type { OpportunityScore } from "../intelligence/opportunity-scorer.js";

export interface ScoreOpportunitiesCommandInput {
  top?: number;
  tier?: "high" | "medium" | "low";
  json?: boolean;
}

export interface ScoreOpportunitiesCommandResult {
  ok: boolean;
  command: "score-opportunities";
  rendered: boolean;
  opportunities: OpportunityScore[];
  total: number;
  warnings: string[];
  errors: string[];
}

export class ScoreOpportunitiesCommand {
  async run(input: ScoreOpportunitiesCommandInput = {}): Promise<ScoreOpportunitiesCommandResult> {
    const limit = input.top ?? 10;
    const all = await getTopOpportunities(limit);
    const opportunities = input.tier ? all.filter((o) => o.tier === input.tier) : all;

    const result: ScoreOpportunitiesCommandResult = {
      ok: true,
      command: "score-opportunities",
      rendered: true,
      opportunities,
      total: opportunities.length,
      warnings: [],
      errors: [],
    };

    if (input.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    this.renderTable(opportunities);
    return result;
  }

  private renderTable(opportunities: OpportunityScore[]): void {
    console.log("AJ DIGITAL OS OPPORTUNITY SCORES");
    console.log("=================================");

    if (opportunities.length === 0) {
      console.log("No opportunities found.");
      return;
    }

    const colW = [40, 8, 8, 10];
    const header = [
      "Keyword".padEnd(colW[0]!),
      "Score".padEnd(colW[1]!),
      "Tier".padEnd(colW[2]!),
      "Scored At",
    ].join("  ");

    console.log(header);
    console.log("-".repeat(header.length));

    for (const o of opportunities) {
      const row = [
        o.keyword.slice(0, colW[0]! - 1).padEnd(colW[0]!),
        String(o.score).padEnd(colW[1]!),
        o.tier.padEnd(colW[2]!),
        o.scoredAt.slice(0, 10),
      ].join("  ");
      console.log(row);
    }

    console.log("");
    console.log(`Total: ${opportunities.length}`);
  }
}
