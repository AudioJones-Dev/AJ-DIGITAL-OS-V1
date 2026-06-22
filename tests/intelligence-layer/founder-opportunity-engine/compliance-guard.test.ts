import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertNoForbiddenGooglePersistence,
  createFounderOpportunityOutput,
  derivePlaceRuntimeSignals,
  findForbiddenGooglePersistenceKeys,
  founderOpportunityScorer,
  type FounderBusinessCandidate,
  type FounderSignal,
} from "../../../src/intelligence/founder-opportunity-engine/index.js";
import { createOpportunityStore } from "../../../src/intelligence/opportunity-store.js";
import type { WebsiteAnalysisResult } from "../../../src/intelligence/founder-opportunity-engine/website-analyzer/index.js";

const derivedAt = "2026-06-18T12:00:00.000Z";

describe("Founder Opportunity Engine compliance guard", () => {
  it("keeps raw Google Places fields out of DerivedSignals", () => {
    const derived = derivePlaceRuntimeSignals(
      {
        place_id: "places-abc",
        user_ratings_total: 180,
        rating: 4.8,
        formatted_phone_number: "+1 555 123 4567",
        types: ["plumber"],
        opening_hours: { periods: [{ open: { day: 1, time: "0900" } }] },
        reviews: [
          { text: "They never called back after I left a message." },
        ],
      },
      { derivedAt: new Date(derivedAt) },
    );

    expect(derived.minimumReviewFloorMet).toBe(true);
    expect(derived.signals.map((signal) => signal.type)).toEqual(
      expect.arrayContaining([
        "HIGH_CALL_DEMAND",
        "CALL_FIRST_CATEGORY",
        "AFTER_HOURS_GAP",
        "RESPONSIVENESS_COMPLAINTS",
      ]),
    );
    expect(findForbiddenGooglePersistenceKeys(derived)).toEqual([]);

    const serialized = JSON.stringify(derived);
    expect(serialized).not.toContain("4.8");
    expect(serialized).not.toContain("+1 555");
    expect(serialized).not.toContain("never called back");
    expect(serialized).not.toContain("plumber");
  });

  it("fails when forbidden Google raw keys are present in a persisted record", () => {
    expect(() =>
      assertNoForbiddenGooglePersistence({
        id: "bad",
        googleRating: 4.8,
      }),
    ).toThrow(/Forbidden Google Places persistence keys detected/);
  });

  it("blocks store writes that contain forbidden Google raw keys", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "foe-store-"));
    try {
      const store = createOpportunityStore(join(tempDir, "opportunities.json"));
      const forbiddenPayload = [
        {
          kind: "founder-opportunity",
          id: "bad",
          placeId: "place-123",
          opportunityScore: 77,
          firedSignals: [],
          googleReviewCount: 123,
        },
      ] as unknown as Parameters<typeof store.saveOpportunityRecords>[0];

      await expect(store.saveOpportunityRecords(forbiddenPayload)).rejects.toThrow(
        /Forbidden Google Places persistence keys detected/,
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("emits a CRM-ready opportunity without forbidden Google fields", () => {
    const result = founderOpportunityScorer({
      candidate: candidate(),
      websiteAnalysis: websiteAnalysis([
        signal("NO_ONLINE_BOOKING", 10, "website-analyzer"),
        signal("NO_CHAT", 10, "website-analyzer"),
        signal("OWNER_OPERATED", 10, "website-analyzer"),
      ]),
      derivedSignals: {
        derivedAt,
        minimumReviewFloorMet: true,
        disqualifiers: [],
        signals: [
          signal("HIGH_CALL_DEMAND", 30, "places-runtime"),
          signal("CALL_FIRST_CATEGORY", 10, "places-runtime"),
          signal("AFTER_HOURS_GAP", 10, "places-runtime"),
          signal("RESPONSIVENESS_COMPLAINTS", 15, "places-runtime"),
        ],
      },
      scoredAt: new Date(derivedAt),
    });

    const output = createFounderOpportunityOutput(result, {
      id: "founder-opp-1",
      now: new Date(derivedAt),
    });

    expect(result.status).toBe("QUALIFIED");
    expect(output).not.toBeNull();
    expect(output?.opportunityScore).toBeGreaterThan(60);
    expect(output?.status).toBe("OPEN");
    expect(output?.outreachHooks.length).toBeGreaterThan(0);
    expect(findForbiddenGooglePersistenceKeys(output)).toEqual([]);
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
      clickToCall: { state: "PRESENT", rationale: "tel" },
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
