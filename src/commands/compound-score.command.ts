import { getCompoundScore } from "../decision/decision-engine.js";
import {
  appendDecisionAuditEvent,
  getEvaluation,
  listCycles,
} from "../decision/decision-store.js";
import { emitCompoundScore } from "../decision/decision-attribution.js";
import type { CompoundScore } from "../decision/decision-types.js";

export interface CompoundScoreCommandInput {
  evaluationId: string;
  json?: boolean;
}

export interface CompoundScoreCommandResult {
  ok: boolean;
  command: "compound-score";
  score?: CompoundScore;
  error?: string;
}

export class CompoundScoreCommand {
  async run(input: CompoundScoreCommandInput): Promise<CompoundScoreCommandResult> {
    if (!input.evaluationId) {
      const error = "evaluationId is required";
      console.error(error);
      return { ok: false, command: "compound-score", error };
    }
    const evaluation = getEvaluation(input.evaluationId);
    if (!evaluation) {
      const error = `Evaluation not found: ${input.evaluationId}`;
      console.error(error);
      return { ok: false, command: "compound-score", error };
    }
    const cycle = listCycles({ evaluationId: input.evaluationId, limit: 1 })[0];
    if (!cycle) {
      const error = `No CERA cycle for evaluation: ${input.evaluationId}`;
      console.error(error);
      return { ok: false, command: "compound-score", error };
    }
    const score = getCompoundScore(evaluation, cycle);
    appendDecisionAuditEvent({
      evaluationId: evaluation.evaluationId,
      cycleId: cycle.cycleId,
      event: "compound_score_created",
      ...(evaluation.tenantId !== undefined ? { tenantId: evaluation.tenantId } : {}),
      payload: {
        mapScore: score.mapScore,
        ceraEfficiencyScore: score.ceraEfficiencyScore,
        compoundScore: score.compoundScore,
        decisionPath: score.decisionPath,
      },
    });
    emitCompoundScore(score, evaluation.runId);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, score }, null, 2));
    } else {
      console.log("COMPOUND SCORE");
      console.log("==============");
      console.log(`Evaluation:    ${score.evaluationId}`);
      console.log(`Cycle:         ${score.cycleId}`);
      console.log(`MAP Score:     ${score.mapScore}/9`);
      console.log(`CERA Score:    ${score.ceraEfficiencyScore.toFixed(2)}/10`);
      console.log(`Compound:      ${score.compoundScore.toFixed(2)}/90`);
      console.log(`Decision Path: ${score.decisionPath}`);
    }

    return { ok: true, command: "compound-score", score };
  }
}
