import type { DerivedSignals } from "../places-runtime/index.js";
import type {
  FounderBusinessCandidate,
  FounderDisqualifier,
  FounderOpportunityScoringStatus,
  FounderOpportunitySubscores,
  FounderSignal,
  FounderSignalType,
} from "../types.js";
import type { WebsiteAnalysisResult } from "../website-analyzer/index.js";

export interface FounderOpportunityScoringInput {
  candidate: FounderBusinessCandidate;
  websiteAnalysis: WebsiteAnalysisResult;
  derivedSignals: DerivedSignals;
  scoredAt?: Date;
}

export interface FounderOpportunityScoringResult {
  candidate: FounderBusinessCandidate;
  status: FounderOpportunityScoringStatus;
  opportunityScore: number;
  subscores: FounderOpportunitySubscores;
  firedSignals: FounderSignal[];
  disqualifiers: FounderDisqualifier[];
  reason: string;
  scoredAt: string;
}

const DEMAND_SIGNAL_TYPES = new Set<FounderSignalType>([
  "HIGH_CALL_DEMAND",
  "CALL_FIRST_CATEGORY",
]);

const LEAK_SIGNAL_TYPES = new Set<FounderSignalType>([
  "NO_ONLINE_BOOKING",
  "NO_CHAT",
  "AFTER_HOURS_GAP",
  "FOLLOWUP_GAP",
  "RESPONSIVENESS_COMPLAINTS",
  "NO_CLICK_TO_CALL",
]);

const FIT_SIGNAL_TYPES = new Set<FounderSignalType>([
  "OWNER_OPERATED",
  "LOCAL_REGIONAL",
  "REACHABLE_CONTACT_INFO",
]);

export function founderOpportunityScorer(
  input: FounderOpportunityScoringInput,
): FounderOpportunityScoringResult {
  const scoredAt = (input.scoredAt ?? new Date()).toISOString();
  const firedSignals = [
    ...input.websiteAnalysis.signals,
    ...input.derivedSignals.signals,
    ...candidateFitSignals(input.candidate, scoredAt),
  ];
  const disqualifiers = collectDisqualifiers(input, firedSignals);

  if (disqualifiers.length > 0) {
    return {
      candidate: input.candidate,
      status: "DISQUALIFIED",
      opportunityScore: 0,
      subscores: {
        demand: 0,
        leak: 0,
        fit: 0,
        fitFactor: 0,
      },
      firedSignals,
      disqualifiers,
      reason: disqualifiers.map((item) => item.reason).join(" "),
      scoredAt,
    };
  }

  const demand = clamp(sumScores(firedSignals, DEMAND_SIGNAL_TYPES), 0, 40);
  const leak = clamp(sumScores(firedSignals, LEAK_SIGNAL_TYPES), 0, 40);
  const fit = clamp(sumScores(firedSignals, FIT_SIGNAL_TYPES), 0, 20);
  const fitFactor = roundToTenth(0.6 + 0.4 * (fit / 20));
  const opportunityScore = Math.round((demand / 40) * (leak / 40) * 100 * fitFactor);
  const status = classifyScore(opportunityScore);

  return {
    candidate: input.candidate,
    status,
    opportunityScore,
    subscores: {
      demand,
      leak,
      fit,
      fitFactor,
    },
    firedSignals,
    disqualifiers,
    reason: `Demand ${demand}/40, leak ${leak}/40, fit ${fit}/20, fitFactor ${fitFactor}.`,
    scoredAt,
  };
}

function collectDisqualifiers(
  input: FounderOpportunityScoringInput,
  firedSignals: readonly FounderSignal[],
): FounderDisqualifier[] {
  const disqualifiers = [
    ...input.websiteAnalysis.disqualifiers,
    ...input.derivedSignals.disqualifiers,
  ];

  if (input.candidate.operational === false) {
    disqualifiers.push({
      code: "NOT_OPERATIONAL",
      reason: "Candidate is not operational.",
    });
  }

  if (input.candidate.customerFacingService === false) {
    disqualifiers.push({
      code: "NOT_CUSTOMER_FACING_SERVICE",
      reason: "Candidate is not a customer-facing service business.",
    });
  }

  if (input.candidate.nationalChain === true) {
    disqualifiers.push({
      code: "NATIONAL_CHAIN",
      reason: "Candidate appears to be a national chain or franchise.",
    });
  }

  if (!input.derivedSignals.minimumReviewFloorMet) {
    disqualifiers.push({
      code: "BELOW_REVIEW_FLOOR",
      reason: "Runtime demand proxy is below the V1 review floor.",
    });
  }

  if (firedSignals.some((signal) => signal.type === "ALREADY_SOLVED")) {
    disqualifiers.push({
      code: "ALREADY_SOLVED",
      reason: "Website analysis indicates the response gap is already solved.",
    });
  }

  return dedupeDisqualifiers(disqualifiers);
}

function candidateFitSignals(candidate: FounderBusinessCandidate, derivedAt: string): FounderSignal[] {
  const signals: FounderSignal[] = [];
  if (candidate.localRegional === true) {
    signals.push({
      type: "LOCAL_REGIONAL",
      score: 5,
      source: "scoring",
      derivedAt,
      rationale: "Candidate is local or regional rather than enterprise.",
    });
  }

  if (candidate.reachableContactInfo === true) {
    signals.push({
      type: "REACHABLE_CONTACT_INFO",
      score: 5,
      source: "scoring",
      derivedAt,
      rationale: "Candidate has reachable contact information.",
    });
  }

  return signals;
}

function sumScores(
  signals: readonly FounderSignal[],
  allowedTypes: ReadonlySet<FounderSignalType>,
): number {
  return signals
    .filter((signal) => allowedTypes.has(signal.type))
    .reduce((sum, signal) => sum + signal.score, 0);
}

function classifyScore(score: number): FounderOpportunityScoringStatus {
  if (score > 60) return "QUALIFIED";
  if (score >= 40) return "WATCH";
  return "PARK";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function dedupeDisqualifiers(disqualifiers: readonly FounderDisqualifier[]): FounderDisqualifier[] {
  const byCode = new Map<string, FounderDisqualifier>();
  for (const disqualifier of disqualifiers) {
    if (!byCode.has(disqualifier.code)) {
      byCode.set(disqualifier.code, disqualifier);
    }
  }
  return Array.from(byCode.values());
}
