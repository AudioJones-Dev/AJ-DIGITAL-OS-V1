export type FounderSignalSource = "website-analyzer" | "places-runtime" | "scoring";

export type FounderSignalType =
  | "NO_ONLINE_BOOKING"
  | "NO_CHAT"
  | "WEAK_WEBSITE"
  | "FOLLOWUP_GAP"
  | "NO_CLICK_TO_CALL"
  | "ALREADY_SOLVED"
  | "OWNER_OPERATED"
  | "HIGH_CALL_DEMAND"
  | "CALL_FIRST_CATEGORY"
  | "AFTER_HOURS_GAP"
  | "RESPONSIVENESS_COMPLAINTS"
  | "LOCAL_REGIONAL"
  | "REACHABLE_CONTACT_INFO";

export interface FounderSignal {
  type: FounderSignalType;
  score: number;
  source: FounderSignalSource;
  derivedAt: string;
  rationale: string;
}

export type FounderDisqualifierCode =
  | "NOT_OPERATIONAL"
  | "NOT_CUSTOMER_FACING_SERVICE"
  | "ALREADY_SOLVED"
  | "NATIONAL_CHAIN"
  | "BELOW_REVIEW_FLOOR";

export interface FounderDisqualifier {
  code: FounderDisqualifierCode;
  reason: string;
}

export interface FounderBusinessCandidate {
  id?: string;
  businessName: string;
  domain: string;
  placeId: string;
  city: string;
  state: string;
  industry: string;
  operational?: boolean;
  customerFacingService?: boolean;
  nationalChain?: boolean;
  localRegional?: boolean;
  reachableContactInfo?: boolean;
}

export interface FounderOpportunitySubscores {
  demand: number;
  leak: number;
  fit: number;
  fitFactor: number;
}

export type FounderOpportunityScoringStatus =
  | "DISQUALIFIED"
  | "PARK"
  | "WATCH"
  | "QUALIFIED";

export type FounderOfferType = "AI_RECEPTIONIST" | "CRM" | "AUTOMATION" | "WEBSITE";

export type FounderOpportunityLifecycleStatus =
  | "OPEN"
  | "CONTACTED"
  | "DISCOVERY"
  | "PROPOSAL"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "DISQUALIFIED";

export interface FounderOpportunity {
  kind: "founder-opportunity";
  id: string;
  businessId: string;
  businessName: string;
  domain: string;
  placeId: string;
  city: string;
  state: string;
  industry: string;
  opportunityScore: number;
  offerType: FounderOfferType;
  subscores: FounderOpportunitySubscores;
  firedSignals: FounderSignal[];
  recommendedOffer: string;
  outreachHooks: string[];
  researchBriefRef: string | null;
  status: FounderOpportunityLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}
