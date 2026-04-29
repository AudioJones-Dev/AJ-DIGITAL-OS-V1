import type { QualificationRequest, QualificationResult } from "../shared-types/index.js";
import { detectDisqualifiers } from "./disqualifiers.js";
import {
  computeReadinessScore,
  scoreAttributionReadiness,
  scoreDataMaturity,
  scoreDemand,
  scoreEconomics,
  scoreProcessMaturity,
} from "./scoring.js";
import { deriveRequiredFixes } from "./rules.js";
import { determineDeploymentTier, determineNextStep } from "./tiering.js";

export function evaluateBusinessQualification(input: QualificationRequest): QualificationResult {
  const demand = scoreDemand(input.inputs);
  const economics = scoreEconomics(input.inputs);
  const processMaturity = scoreProcessMaturity(input.inputs);
  const dataMaturity = scoreDataMaturity(input.inputs);
  const attributionReadiness = scoreAttributionReadiness(input.inputs);

  const readinessScore = computeReadinessScore({
    demandScore: demand.score,
    economicsScore: economics.score,
    processMaturityScore: processMaturity.score,
    dataMaturityScore: dataMaturity.score,
    attributionReadinessScore: attributionReadiness.score,
  });

  const disqualifiers = detectDisqualifiers(input.inputs);
  const deploymentTier = determineDeploymentTier(readinessScore, disqualifiers);
  const requiredFixes = deriveRequiredFixes(input.inputs, {
    demandScore: demand.score,
    economicsScore: economics.score,
    processMaturityScore: processMaturity.score,
    dataMaturityScore: dataMaturity.score,
    attributionReadinessScore: attributionReadiness.score,
  });
  const recommendedNextStep = determineNextStep({
    deploymentTier,
    disqualifiers,
    readinessScore,
  });

  const notes: string[] = [
    "Deterministic qualification engine v1 evaluation completed.",
    "No external model calls were used.",
  ];

  return {
    case_id: input.case_id,
    status: "evaluated",
    readiness_score: readinessScore,
    demand_score: demand.detail,
    economics_score: economics.detail,
    process_maturity_score: processMaturity.detail,
    data_maturity_score: dataMaturity.detail,
    attribution_readiness_score: attributionReadiness.detail,
    deployment_tier: deploymentTier,
    disqualifiers,
    required_fixes: requiredFixes,
    recommended_next_step: recommendedNextStep,
    notes,
  };
}
