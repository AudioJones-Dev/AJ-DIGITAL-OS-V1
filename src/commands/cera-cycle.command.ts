import { createCeraCycle } from "../decision/decision-engine.js";
import {
  getEvaluation,
  saveCycle,
  appendDecisionAuditEvent,
} from "../decision/decision-store.js";
import { emitCeraCycle } from "../decision/decision-attribution.js";
import type { CeraCycle, CeraSignals } from "../decision/decision-types.js";

export interface CeraCycleCommandInput {
  evaluationId: string;
  capture?: string[];
  extract?: string[];
  refine?: string[];
  amplify?: string[];
  tenantId?: string;
  runId?: string;
  json?: boolean;
}

export interface CeraCycleCommandResult {
  ok: boolean;
  command: "cera-cycle";
  cycle?: CeraCycle;
  error?: string;
}

export class CeraCycleCommand {
  async run(input: CeraCycleCommandInput): Promise<CeraCycleCommandResult> {
    if (!input.evaluationId) {
      const error = "evaluationId is required";
      console.error(error);
      return { ok: false, command: "cera-cycle", error };
    }
    const evaluation = getEvaluation(input.evaluationId);
    if (!evaluation) {
      const error = `Evaluation not found: ${input.evaluationId}`;
      console.error(error);
      return { ok: false, command: "cera-cycle", error };
    }

    const signals: CeraSignals = {
      captureSignals: input.capture ?? [],
      extractedInsights: input.extract ?? [],
      refinementActions: input.refine ?? [],
      amplificationActions: input.amplify ?? [],
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.runId !== undefined ? { runId: input.runId } : {}),
    };

    const cycle = createCeraCycle(evaluation, signals);
    saveCycle(cycle);
    appendDecisionAuditEvent({
      evaluationId: cycle.evaluationId,
      cycleId: cycle.cycleId,
      event: "cera_cycle_created",
      ...(cycle.tenantId !== undefined ? { tenantId: cycle.tenantId } : {}),
      payload: {
        ceraEfficiencyScore: cycle.ceraEfficiencyScore,
        compoundScore: cycle.compoundScore,
        decisionPath: cycle.decisionPath,
      },
    });
    emitCeraCycle(cycle);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, cycle }, null, 2));
    } else {
      console.log("CERA CYCLE");
      console.log("==========");
      console.log(`Cycle:          ${cycle.cycleId}`);
      console.log(`Evaluation:     ${cycle.evaluationId}`);
      console.log(`Capture:        ${cycle.captureSignals.length} signals`);
      console.log(`Extract:        ${cycle.extractedInsights.length} insights`);
      console.log(`Refine:         ${cycle.refinementActions.length} actions`);
      console.log(`Amplify:        ${cycle.amplificationActions.length} actions`);
      console.log(`Efficiency:     ${cycle.ceraEfficiencyScore.toFixed(2)}/10`);
      console.log(`Compound Score: ${cycle.compoundScore.toFixed(2)}/90`);
      console.log(`Path:           ${cycle.decisionPath}`);
    }

    return { ok: true, command: "cera-cycle", cycle };
  }
}
