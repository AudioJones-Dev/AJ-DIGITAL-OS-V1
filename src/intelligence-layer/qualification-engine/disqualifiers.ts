import type { QualificationRequest } from "../shared-types/index.js";

export function detectDisqualifiers(input: QualificationRequest["inputs"]): string[] {
  const disqualifiers: string[] = [];

  const weakDemandSignal = typeof input.demand_signal_score !== "number" || input.demand_signal_score < 0.7;
  if ((input.monthly_leads ?? 0) < 10 && weakDemandSignal) {
    disqualifiers.push("No meaningful demand signal detected");
  }

  if (typeof input.avg_customer_value === "number" && input.avg_customer_value < 300) {
    disqualifiers.push("Average customer value too low for OS deployment");
  }

  if (input.sales_process_present === false) {
    disqualifiers.push("No sales process present");
  }

  if (input.crm_present === false && (!input.database_size || input.database_size <= 0)) {
    disqualifiers.push("No CRM and no usable business database");
  }

  if (typeof input.offer_clarity_score === "number" && input.offer_clarity_score < 0.25) {
    disqualifiers.push("Offer clarity too low to support deployment");
  }

  return disqualifiers;
}
