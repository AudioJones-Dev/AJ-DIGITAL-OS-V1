import { randomUUID } from "node:crypto";

import type { FounderOpportunityScoringResult } from "../scoring/founderOpportunityScorer.js";
import type { FounderOfferType, FounderOpportunity, FounderSignal } from "../types.js";

export interface FounderOpportunityOutputOptions {
  id?: string;
  businessId?: string;
  researchBriefRef?: string | null;
  now?: Date;
}

export function createFounderOpportunityOutput(
  result: FounderOpportunityScoringResult,
  options: FounderOpportunityOutputOptions = {},
): FounderOpportunity | null {
  if (result.status !== "QUALIFIED") {
    return null;
  }

  const now = (options.now ?? new Date()).toISOString();
  const candidate = result.candidate;

  return {
    kind: "founder-opportunity",
    id: options.id ?? randomUUID(),
    businessId: options.businessId ?? candidate.id ?? candidate.placeId,
    businessName: candidate.businessName,
    domain: candidate.domain,
    placeId: candidate.placeId,
    city: candidate.city,
    state: candidate.state,
    industry: candidate.industry,
    opportunityScore: result.opportunityScore,
    offerType: recommendedOfferType(result.firedSignals),
    subscores: result.subscores,
    firedSignals: result.firedSignals,
    recommendedOffer: "AI Receptionist / ResponseOS",
    outreachHooks: outreachHooksFromSignals(result.firedSignals),
    researchBriefRef: options.researchBriefRef ?? null,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
  };
}

function recommendedOfferType(signals: readonly FounderSignal[]): FounderOfferType {
  if (signals.some((signal) => signal.type === "NO_ONLINE_BOOKING" || signal.type === "WEAK_WEBSITE")) {
    return "AI_RECEPTIONIST";
  }
  if (signals.some((signal) => signal.type === "FOLLOWUP_GAP")) {
    return "CRM";
  }
  return "AI_RECEPTIONIST";
}

function outreachHooksFromSignals(signals: readonly FounderSignal[]): string[] {
  const hooks: string[] = [];

  if (signals.some((signal) => signal.type === "RESPONSIVENESS_COMPLAINTS")) {
    hooks.push("Recent public feedback suggests some customers may have trouble reaching the business or getting callbacks.");
  }

  if (signals.some((signal) => signal.type === "AFTER_HOURS_GAP")) {
    hooks.push("The business category and hours suggest calls may arrive when staff are unavailable.");
  }

  if (signals.some((signal) => signal.type === "NO_ONLINE_BOOKING")) {
    hooks.push("The rendered website did not expose a confirmed online booking path.");
  }

  if (signals.some((signal) => signal.type === "NO_CHAT")) {
    hooks.push("The rendered website did not expose a known instant-response or chat path.");
  }

  return hooks.slice(0, 3);
}
