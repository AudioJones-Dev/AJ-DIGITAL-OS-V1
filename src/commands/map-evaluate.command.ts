import {
  evaluateMap,
} from "../decision/decision-engine.js";
import {
  saveEvaluation,
  appendDecisionAuditEvent,
} from "../decision/decision-store.js";
import { emitMapEvaluation } from "../decision/decision-attribution.js";
import { applyDecisionPolicy, validateProductionTenant } from "../decision/decision-policy.js";
import type {
  DecisionCategory,
  DecisionEnvironment,
  DecisionInput,
  MapEvaluation,
} from "../decision/decision-types.js";

export interface MapEvaluateCommandInput {
  title: string;
  description: string;
  category: DecisionCategory;
  meaningful: number;
  actionable: number;
  profitable: number;
  aeoScore?: number;
  tenantId?: string;
  runId?: string;
  createdBy?: string;
  environment?: DecisionEnvironment;
  json?: boolean;
}

export interface MapEvaluateCommandResult {
  ok: boolean;
  command: "map-evaluate";
  evaluation?: MapEvaluation;
  error?: string;
}

export class MapEvaluateCommand {
  async run(input: MapEvaluateCommandInput): Promise<MapEvaluateCommandResult> {
    if (!input.title || !input.description || !input.category) {
      const error = "title, description, and category are required";
      console.error(error);
      return { ok: false, command: "map-evaluate", error };
    }

    const decisionInput: DecisionInput = {
      title: input.title,
      description: input.description,
      category: input.category,
      meaningfulScore: input.meaningful,
      actionableScore: input.actionable,
      profitableScore: input.profitable,
      createdBy: input.createdBy ?? "cli",
      environment: input.environment ?? "local",
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.runId !== undefined ? { runId: input.runId } : {}),
      ...(input.aeoScore !== undefined ? { aeoScore: input.aeoScore } : {}),
    };

    const tenantCheck = validateProductionTenant(decisionInput);
    if (!tenantCheck.ok) {
      console.error(tenantCheck.reason ?? "tenant check failed");
      return { ok: false, command: "map-evaluate", error: tenantCheck.reason ?? "tenant check failed" };
    }

    const evaluation = evaluateMap(decisionInput);
    saveEvaluation(evaluation);
    appendDecisionAuditEvent({
      evaluationId: evaluation.evaluationId,
      event: "map_evaluation_created",
      actorId: evaluation.createdBy,
      ...(evaluation.tenantId !== undefined ? { tenantId: evaluation.tenantId } : {}),
      payload: {
        mapScore: evaluation.mapScore,
        decisionBand: evaluation.decisionBand,
        decision: evaluation.decision,
        category: evaluation.category,
      },
    });
    emitMapEvaluation(evaluation);
    const policy = applyDecisionPolicy(evaluation);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, evaluation, policy }, null, 2));
    } else {
      console.log("MAP EVALUATION");
      console.log("==============");
      console.log(`Id:        ${evaluation.evaluationId}`);
      console.log(`Title:     ${evaluation.title}`);
      console.log(`Category:  ${evaluation.category}`);
      console.log(`Scores:    M=${evaluation.meaningfulScore} A=${evaluation.actionableScore} P=${evaluation.profitableScore}`);
      console.log(`MAP Score: ${evaluation.mapScore}/9`);
      console.log(`Band:      ${evaluation.decisionBand}`);
      console.log(`Decision:  ${evaluation.decision}`);
      console.log(`Routed To: ${policy.routedTo}`);
      if (policy.reason) console.log(`Reason:    ${policy.reason}`);
    }

    return { ok: true, command: "map-evaluate", evaluation };
  }
}
