import type { QualificationRequest, QualificationScoreDetail } from "../shared-types/index.js";

interface ScoreResult {
  score: number;
  detail: QualificationScoreDetail;
}

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export function scoreDemand(input: QualificationRequest["inputs"]): ScoreResult {
  let score = 0;
  const rationale: string[] = [];

  const monthlyLeads = input.monthly_leads;
  if (typeof monthlyLeads === "number") {
    if (monthlyLeads >= 100) {
      score += 40;
      rationale.push("Monthly lead volume is strong (100+). ");
    } else if (monthlyLeads >= 30) {
      score += 25;
      rationale.push("Monthly lead volume is moderate (30-99).");
    } else {
      score += 8;
      rationale.push("Monthly lead volume is weak (<30).");
    }
  } else {
    rationale.push("Monthly lead volume missing; demand confidence reduced.");
  }

  const demandSignalScore = input.demand_signal_score;
  if (typeof demandSignalScore === "number") {
    const normalizedDemandSignal = Math.max(0, Math.min(1, demandSignalScore));
    score += normalizedDemandSignal * 35;
    rationale.push(`Demand signal contributes ${Math.round(normalizedDemandSignal * 35)} points.`);
  } else {
    rationale.push("Demand signal score missing.");
  }

  const offerClarityScore = input.offer_clarity_score;
  if (typeof offerClarityScore === "number") {
    const normalizedOfferClarity = Math.max(0, Math.min(1, offerClarityScore));
    score += normalizedOfferClarity * 25;
    if (normalizedOfferClarity < 0.4) {
      score -= 15;
      rationale.push("Offer clarity is below 0.4 and materially drags demand readiness.");
    }
  } else {
    rationale.push("Offer clarity score missing.");
  }

  const normalizedScore = clampScore(score);
  return {
    score: normalizedScore,
    detail: {
      score: normalizedScore,
      rationale,
    },
  };
}

export function scoreEconomics(input: QualificationRequest["inputs"]): ScoreResult {
  let score = 0;
  const rationale: string[] = [];

  const avgCustomerValue = input.avg_customer_value;
  if (typeof avgCustomerValue !== "number") {
    rationale.push("Average customer value missing.");
  } else if (avgCustomerValue < 500) {
    score = 25;
    rationale.push("Average customer value under 500 is weak for OS economics.");
  } else if (avgCustomerValue < 2000) {
    score = 55;
    rationale.push("Average customer value between 500 and 1999 is moderate.");
  } else if (avgCustomerValue < 5000) {
    score = 78;
    rationale.push("Average customer value between 2000 and 4999 is strong.");
  } else {
    score = 92;
    rationale.push("Average customer value 5000+ is very strong.");
  }

  return {
    score,
    detail: {
      score,
      rationale,
    },
  };
}

export function scoreProcessMaturity(input: QualificationRequest["inputs"]): ScoreResult {
  let score = 0;
  const rationale: string[] = [];

  if (input.sales_process_present) {
    score += 35;
    rationale.push("Sales process is defined.");
  } else {
    rationale.push("Sales process is missing.");
  }

  if (input.fulfillment_capacity_defined) {
    score += 25;
    rationale.push("Fulfillment capacity is defined.");
  } else {
    rationale.push("Fulfillment capacity is not defined.");
  }

  const sopCoverageRatio = input.sop_coverage_ratio;
  if (typeof sopCoverageRatio !== "number") {
    rationale.push("SOP coverage ratio missing.");
  } else if (sopCoverageRatio < 0.3) {
    score += 10;
    rationale.push("SOP coverage below 0.3 is weak.");
  } else if (sopCoverageRatio <= 0.6) {
    score += 25;
    rationale.push("SOP coverage between 0.3 and 0.6 is moderate.");
  } else {
    score += 40;
    rationale.push("SOP coverage above 0.6 is strong.");
  }

  const normalizedScore = clampScore(score);
  return {
    score: normalizedScore,
    detail: {
      score: normalizedScore,
      rationale,
    },
  };
}

export function scoreDataMaturity(input: QualificationRequest["inputs"]): ScoreResult {
  let score = 0;
  const rationale: string[] = [];

  if (input.crm_present) {
    score += 45;
    rationale.push("CRM is present.");
  } else {
    rationale.push("CRM is not present.");
  }

  const databaseSize = input.database_size;
  if (typeof databaseSize !== "number" || databaseSize <= 0) {
    score += 5;
    rationale.push("Database size is missing or empty.");
  } else if (databaseSize < 500) {
    score += 20;
    rationale.push("Database size 1-499 is emerging.");
  } else if (databaseSize < 5000) {
    score += 35;
    rationale.push("Database size 500-4999 is viable.");
  } else {
    score += 50;
    rationale.push("Database size 5000+ is strong.");
  }

  const normalizedScore = clampScore(score);
  return {
    score: normalizedScore,
    detail: {
      score: normalizedScore,
      rationale,
    },
  };
}

export function scoreAttributionReadiness(input: QualificationRequest["inputs"]): ScoreResult {
  let score = 0;
  const rationale: string[] = [];

  if (input.tracking_present) {
    score += 55;
    rationale.push("Attribution tracking is present.");
  } else {
    score += 10;
    rationale.push("Attribution tracking is missing; score is capped.");
  }

  if (input.crm_present) {
    score += 20;
    rationale.push("CRM presence supports attribution continuity.");
  }

  const leadSourceDiversity = input.lead_source_diversity;
  if (typeof leadSourceDiversity === "number") {
    const normalizedLeadSourceDiversity = Math.max(0, Math.min(1, leadSourceDiversity));
    score += normalizedLeadSourceDiversity * 25;
    rationale.push(`Lead source diversity contributes ${Math.round(normalizedLeadSourceDiversity * 25)} points.`);
  } else {
    rationale.push("Lead source diversity is not measurable.");
  }

  if (!input.tracking_present && score > 35) {
    score = 35;
    rationale.push("No tracking present; attribution readiness capped at 35.");
  }

  const normalizedScore = clampScore(score);
  return {
    score: normalizedScore,
    detail: {
      score: normalizedScore,
      rationale,
    },
  };
}

export function computeReadinessScore(scores: {
  demandScore: number;
  economicsScore: number;
  processMaturityScore: number;
  dataMaturityScore: number;
  attributionReadinessScore: number;
}): number {
  const weighted =
    scores.demandScore * 0.2 +
    scores.economicsScore * 0.2 +
    scores.processMaturityScore * 0.25 +
    scores.dataMaturityScore * 0.2 +
    scores.attributionReadinessScore * 0.15;

  return clampScore(weighted);
}
