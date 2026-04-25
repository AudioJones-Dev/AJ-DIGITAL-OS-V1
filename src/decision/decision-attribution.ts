import { emitEvent } from "../attribution/attribution-tracker.js";
import type { AttributionEventType } from "../attribution/attribution-types.js";

import type { CeraCycle, CompoundScore, MapEvaluation } from "./decision-types.js";

const TAG = "[DECISION-ATTR]";
const DECISION_AGENT_ID = "decision-engine";

/** Fire-and-forget attribution emit — never throws. */
function fireEvent(
  eventType: AttributionEventType,
  runId: string,
  metadata: Record<string, unknown>,
): void {
  try {
    void emitEvent({
      eventType,
      runId,
      agentId: DECISION_AGENT_ID,
      channel: "unknown",
      metadata,
    }).catch((err: unknown) => {
      console.warn(`${TAG} attribution emit failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  } catch (err) {
    console.warn(`${TAG} attribution emit threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function emitMapEvaluation(evaluation: MapEvaluation): void {
  const runId = evaluation.runId ?? evaluation.evaluationId;
  fireEvent("map_evaluation_created", runId, {
    evaluationId: evaluation.evaluationId,
    category: evaluation.category,
    mapScore: evaluation.mapScore,
    decisionBand: evaluation.decisionBand,
    decision: evaluation.decision,
    ...(evaluation.tenantId !== undefined ? { tenantId: evaluation.tenantId } : {}),
  });

  const decisionEvent: AttributionEventType =
    evaluation.decision === "execute"
      ? "map_decision_execute"
      : evaluation.decision === "improve"
      ? "map_decision_improve"
      : "map_decision_reconsider";

  fireEvent(decisionEvent, runId, {
    evaluationId: evaluation.evaluationId,
    decisionBand: evaluation.decisionBand,
    mapScore: evaluation.mapScore,
    ...(evaluation.tenantId !== undefined ? { tenantId: evaluation.tenantId } : {}),
  });
}

export function emitCeraCycle(cycle: CeraCycle): void {
  const runId = cycle.runId ?? cycle.evaluationId;
  fireEvent("cera_cycle_created", runId, {
    cycleId: cycle.cycleId,
    evaluationId: cycle.evaluationId,
    ceraEfficiencyScore: cycle.ceraEfficiencyScore,
    compoundScore: cycle.compoundScore,
    decisionPath: cycle.decisionPath,
    ...(cycle.tenantId !== undefined ? { tenantId: cycle.tenantId } : {}),
  });

  const pathEvent: AttributionEventType =
    cycle.decisionPath === "scale"
      ? "decision_path_scale"
      : cycle.decisionPath === "kill"
      ? "decision_path_kill"
      : "decision_path_pivot";

  fireEvent(pathEvent, runId, {
    cycleId: cycle.cycleId,
    evaluationId: cycle.evaluationId,
    compoundScore: cycle.compoundScore,
    ...(cycle.tenantId !== undefined ? { tenantId: cycle.tenantId } : {}),
  });
}

export function emitCompoundScore(score: CompoundScore, runId?: string): void {
  fireEvent("compound_score_created", runId ?? score.evaluationId, {
    evaluationId: score.evaluationId,
    cycleId: score.cycleId,
    mapScore: score.mapScore,
    ceraEfficiencyScore: score.ceraEfficiencyScore,
    compoundScore: score.compoundScore,
    decisionPath: score.decisionPath,
  });
}
