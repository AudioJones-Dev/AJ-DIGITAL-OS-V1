import type { QualificationRequest } from "../shared-types/index.js";

export interface FixContext {
  demandScore: number;
  economicsScore: number;
  processMaturityScore: number;
  dataMaturityScore: number;
  attributionReadinessScore: number;
}

export function deriveRequiredFixes(input: QualificationRequest["inputs"], scores: FixContext): string[] {
  const fixes: string[] = [];

  if (!input.crm_present || scores.dataMaturityScore < 45) {
    fixes.push("Install CRM foundation");
  }

  if (input.sales_process_present !== true || scores.processMaturityScore < 50) {
    fixes.push("Define sales process");
  }

  if (input.tracking_present !== true || scores.attributionReadinessScore < 45) {
    fixes.push("Establish attribution tracking");
  }

  if ((input.sop_coverage_ratio ?? 0) < 0.6) {
    fixes.push("Document fulfillment SOPs");
  }

  if (typeof input.offer_clarity_score !== "number" || input.offer_clarity_score < 0.4) {
    fixes.push("Improve offer clarity before OS deployment");
  }

  if ((input.monthly_leads ?? 0) < 30 || scores.demandScore < 40) {
    fixes.push("Increase lead volume before automation investment");
  }

  return [...new Set(fixes)];
}
