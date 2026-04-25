import { randomUUID } from "node:crypto";

import type {
  CeraCycle,
  CompoundDecisionPath,
  CompoundScore,
  DecisionInput,
  MapDecision,
  MapDecisionBand,
  MapEvaluation,
  CeraSignals,
} from "./decision-types.js";
import { DECISION_POLICY_VERSION } from "./decision-types.js";

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function calculateMapScore(
  meaningful: number,
  actionable: number,
  profitable: number,
): number {
  const m = clamp(Math.floor(meaningful), 0, 3);
  const a = clamp(Math.floor(actionable), 0, 3);
  const p = clamp(Math.floor(profitable), 0, 3);
  return clamp(m + a + p, 0, 9);
}

export function deriveMapDecisionBand(mapScore: number): MapDecisionBand {
  if (mapScore >= 8) return "strong_alignment";
  if (mapScore >= 5) return "moderate_alignment";
  return "weak_alignment";
}

export function deriveMapDecision(band: MapDecisionBand): MapDecision {
  switch (band) {
    case "strong_alignment":
      return "execute";
    case "moderate_alignment":
      return "improve";
    case "weak_alignment":
      return "reconsider";
  }
}

export function calculateCeraEfficiencyScore(
  captureSignals: string[],
  extractedInsights: string[],
  refinementActions: string[],
  amplificationActions: string[],
): number {
  const total =
    captureSignals.length +
    extractedInsights.length +
    refinementActions.length +
    amplificationActions.length;
  return Math.min(10, Math.max(0, total / 2));
}

export function calculateCompoundScore(mapScore: number, ceraEfficiencyScore: number): number {
  return clamp(mapScore, 0, 9) * clamp(ceraEfficiencyScore, 0, 10);
}

export function deriveCompoundDecisionPath(
  mapScore: number,
  ceraEfficiencyScore: number,
): CompoundDecisionPath {
  if (mapScore <= 4 || ceraEfficiencyScore <= 4) return "kill";
  if (mapScore >= 8 && ceraEfficiencyScore >= 8) return "scale";
  if (mapScore >= 5 && ceraEfficiencyScore >= 5) return "pivot";
  return "pivot";
}

function applyAeoInfluence(input: DecisionInput): {
  meaningfulScore: number;
  actionableScore: number;
  profitableScore: number;
} {
  let meaningfulScore = clamp(Math.floor(input.meaningfulScore), 0, 3);
  let actionableScore = clamp(Math.floor(input.actionableScore), 0, 3);
  let profitableScore = clamp(Math.floor(input.profitableScore), 0, 3);

  if (typeof input.aeoScore === "number") {
    if (input.aeoScore >= 70) {
      profitableScore = clamp(profitableScore + 1, 0, 3);
    }
    if (input.aeoScore >= 80) {
      actionableScore = clamp(actionableScore + 1, 0, 3);
    }
  }

  return { meaningfulScore, actionableScore, profitableScore };
}

function buildReasoning(
  band: MapDecisionBand,
  decision: MapDecision,
  mapScore: number,
  meaningful: number,
  actionable: number,
  profitable: number,
  aeoScore: number | undefined,
): string {
  const parts: string[] = [];
  parts.push(`mapScore=${mapScore} (M=${meaningful}, A=${actionable}, P=${profitable})`);
  parts.push(`band=${band}`);
  parts.push(`decision=${decision}`);
  if (typeof aeoScore === "number") {
    parts.push(`aeoScore=${aeoScore}`);
  }
  return parts.join("; ");
}

export function evaluateMap(input: DecisionInput): MapEvaluation {
  const { meaningfulScore, actionableScore, profitableScore } = applyAeoInfluence(input);
  const mapScore = calculateMapScore(meaningfulScore, actionableScore, profitableScore);
  const band = deriveMapDecisionBand(mapScore);
  const decision = deriveMapDecision(band);

  const reasoning = buildReasoning(
    band,
    decision,
    mapScore,
    meaningfulScore,
    actionableScore,
    profitableScore,
    input.aeoScore,
  );

  const evaluation: MapEvaluation = {
    evaluationId: randomUUID(),
    title: input.title,
    description: input.description,
    category: input.category,
    meaningfulScore,
    actionableScore,
    profitableScore,
    mapScore,
    decisionBand: band,
    decision,
    reasoning,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    environment: input.environment,
    policyVersion: input.policyVersion ?? DECISION_POLICY_VERSION,
    ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    ...(input.runId !== undefined ? { runId: input.runId } : {}),
  };

  return evaluation;
}

export function createCeraCycle(
  evaluation: Pick<MapEvaluation, "evaluationId" | "mapScore"> & { tenantId?: string; runId?: string },
  signals: CeraSignals,
): CeraCycle {
  const ceraEfficiencyScore = calculateCeraEfficiencyScore(
    signals.captureSignals,
    signals.extractedInsights,
    signals.refinementActions,
    signals.amplificationActions,
  );
  const compoundScore = calculateCompoundScore(evaluation.mapScore, ceraEfficiencyScore);
  const decisionPath = deriveCompoundDecisionPath(evaluation.mapScore, ceraEfficiencyScore);
  const now = new Date().toISOString();

  const tenantId = signals.tenantId ?? evaluation.tenantId;
  const runId = signals.runId ?? evaluation.runId;

  const cycle: CeraCycle = {
    cycleId: randomUUID(),
    evaluationId: evaluation.evaluationId,
    captureSignals: [...signals.captureSignals],
    extractedInsights: [...signals.extractedInsights],
    refinementActions: [...signals.refinementActions],
    amplificationActions: [...signals.amplificationActions],
    ceraEfficiencyScore,
    compoundScore,
    decisionPath,
    createdAt: now,
    updatedAt: now,
    ...(tenantId !== undefined ? { tenantId } : {}),
    ...(runId !== undefined ? { runId } : {}),
  };

  return cycle;
}

export function getCompoundScore(
  evaluation: Pick<MapEvaluation, "evaluationId" | "mapScore">,
  cycle: Pick<CeraCycle, "cycleId" | "ceraEfficiencyScore">,
): CompoundScore {
  const compoundScore = calculateCompoundScore(evaluation.mapScore, cycle.ceraEfficiencyScore);
  const decisionPath = deriveCompoundDecisionPath(evaluation.mapScore, cycle.ceraEfficiencyScore);
  return {
    evaluationId: evaluation.evaluationId,
    cycleId: cycle.cycleId,
    mapScore: evaluation.mapScore,
    ceraEfficiencyScore: cycle.ceraEfficiencyScore,
    compoundScore,
    decisionPath,
  };
}
