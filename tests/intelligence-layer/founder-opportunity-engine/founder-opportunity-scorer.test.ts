import { describe, expect, it } from "vitest";

import {
  founderOpportunityScorer,
  type DerivedSignals,
  type FounderBusinessCandidate,
  type FounderSignal,
} from "../../../src/intelligence/founder-opportunity-engine/index.js";
import type { WebsiteAnalysisResult } from "../../../src/intelligence/founder-opportunity-engine/website-analyzer/index.js";

const derivedAt = "2026-06-18T12:00:00.000Z";

describe("founderOpportunityScorer", () => {
  it("uses multiplicative Demand x Leak x Fit scoring", () => {
    const result = founderOpportunityScorer({
      candidate: candidate(),
      websiteAnalysis: websiteAnalysis([
        signal("NO_ONLINE_BOOKING", 10, "website-analyzer"),
        signal("NO_CHAT", 10, "website-analyzer"),
        signal("FOLLOWUP_GAP", 5, "website-analyzer"),
        signal("NO_CLICK_TO_CALL", 5, "website-analyzer"),
        signal("OWNER_OPERATED", 10, "website-analyzer"),
      ]),
      derivedSignals: derivedSignals([
        signal("HIGH_CALL_DEMAND", 30, "places-runtime"),
        signal("CALL_FIRST_CATEGORY", 10, "places-runtime"),
        signal("AFTER_HOURS_GAP", 10, "places-runtime"),
        signal("RESPONSIVENESS_COMPLAINTS", 15, "places-runtime"),
      ]),
      scoredAt: new Date(derivedAt),
    });

    expect(result.status).toBe("QUALIFIED");
    expect(result.subscores).toEqual({
      demand: 40,
      leak: 40,
      fit: 20,
      fitFactor: 1,
    });
    expect(result.opportunityScore).toBe(100);
  });

  it("collapses the score when demand is present but leak is missing", () => {
    const result = founderOpportunityScorer({
      candidate: candidate(),
      websiteAnalysis: websiteAnalysis([
        signal("OWNER_OPERATED", 10, "website-analyzer"),
      ]),
      derivedSignals: derivedSignals([
        signal("HIGH_CALL_DEMAND", 30, "places-runtime"),
        signal("CALL_FIRST_CATEGORY", 10, "places-runtime"),
      ]),
      scoredAt: new Date(derivedAt),
    });

    expect(result.status).toBe("PARK");
    expect(result.subscores.demand).toBe(40);
    expect(result.subscores.leak).toBe(0);
    expect(result.opportunityScore).toBe(0);
  });

  it("disqualifies candidates below the review demand floor before scoring", () => {
    const result = founderOpportunityScorer({
      candidate: candidate(),
      websiteAnalysis: websiteAnalysis([
        signal("NO_ONLINE_BOOKING", 10, "website-analyzer"),
      ]),
      derivedSignals: {
        derivedAt,
        minimumReviewFloorMet: false,
        signals: [],
        disqualifiers: [],
      },
      scoredAt: new Date(derivedAt),
    });

    expect(result.status).toBe("DISQUALIFIED");
    expect(result.opportunityScore).toBe(0);
    expect(result.disqualifiers.map((item) => item.code)).toContain("BELOW_REVIEW_FLOOR");
  });
});

function candidate(): FounderBusinessCandidate {
  return {
    businessName: "Example Plumbing",
    domain: "example.test",
    placeId: "place-123",
    city: "Orlando",
    state: "FL",
    industry: "Plumbing",
    operational: true,
    customerFacingService: true,
    nationalChain: false,
    localRegional: true,
    reachableContactInfo: true,
  };
}

function derivedSignals(signals: FounderSignal[]): DerivedSignals {
  return {
    derivedAt,
    minimumReviewFloorMet: true,
    signals,
    disqualifiers: [],
  };
}

function websiteAnalysis(signals: FounderSignal[]): WebsiteAnalysisResult {
  return {
    domain: "example.test",
    analyzedUrl: "https://example.test",
    analyzedAt: derivedAt,
    checks: {
      siteReachable: { state: "PRESENT", rationale: "rendered" },
      sslValid: { state: "PRESENT", rationale: "https" },
      mobileResponsive: { state: "PRESENT", rationale: "responsive" },
      onlineBooking: { state: "ABSENT", rationale: "none" },
      chat: { state: "ABSENT", rationale: "none" },
      contactForm: { state: "PRESENT", rationale: "form" },
      clickToCall: { state: "ABSENT", rationale: "none" },
      staleWebsite: { state: "ABSENT", rationale: "fresh" },
      alreadySolved: { state: "ABSENT", rationale: "not solved" },
      ownerOperated: { state: "PRESENT", rationale: "owner" },
    },
    signals,
    disqualifiers: [],
    networkDomains: [],
  };
}

function signal(
  type: FounderSignal["type"],
  score: number,
  source: FounderSignal["source"],
): FounderSignal {
  return {
    type,
    score,
    source,
    derivedAt,
    rationale: `${type} rationale`,
  };
}
