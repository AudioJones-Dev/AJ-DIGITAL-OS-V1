import { getEvaluation } from "../decision/decision-store.js";
import { getDecisionAuditEvents } from "../decision/decision-store.js";
import type { MapEvaluation } from "../decision/decision-types.js";

export interface MapInspectCommandInput {
  evaluationId: string;
  json?: boolean;
}

export interface MapInspectCommandResult {
  ok: boolean;
  command: "map-inspect";
  evaluation?: MapEvaluation;
  error?: string;
}

export class MapInspectCommand {
  async run(input: MapInspectCommandInput): Promise<MapInspectCommandResult> {
    if (!input.evaluationId) {
      const error = "evaluationId is required";
      console.error(error);
      return { ok: false, command: "map-inspect", error };
    }
    const evaluation = getEvaluation(input.evaluationId);
    if (!evaluation) {
      const error = `Evaluation not found: ${input.evaluationId}`;
      console.error(error);
      return { ok: false, command: "map-inspect", error };
    }
    const events = getDecisionAuditEvents({ evaluationId: input.evaluationId, limit: 20 });

    if (input.json) {
      console.log(JSON.stringify({ ok: true, evaluation, audit: events }, null, 2));
    } else {
      console.log(`MAP EVALUATION: ${evaluation.evaluationId}`);
      console.log("============================");
      console.log(`Title:     ${evaluation.title}`);
      console.log(`Category:  ${evaluation.category}`);
      console.log(`Description: ${evaluation.description}`);
      console.log(`Scores:    M=${evaluation.meaningfulScore} A=${evaluation.actionableScore} P=${evaluation.profitableScore}`);
      console.log(`MAP Score: ${evaluation.mapScore}/9`);
      console.log(`Band:      ${evaluation.decisionBand}`);
      console.log(`Decision:  ${evaluation.decision}`);
      console.log(`Reasoning: ${evaluation.reasoning}`);
      console.log(`Created:   ${evaluation.createdAt} by ${evaluation.createdBy}`);
      if (evaluation.tenantId) console.log(`Tenant:    ${evaluation.tenantId}`);
      if (evaluation.runId) console.log(`Run:       ${evaluation.runId}`);

      if (events.length > 0) {
        console.log("");
        console.log("Audit Trail");
        console.log("-----------");
        for (const e of events) {
          console.log(`[${e.timestamp}] ${e.event}`);
        }
      }
    }

    return { ok: true, command: "map-inspect", evaluation };
  }
}
