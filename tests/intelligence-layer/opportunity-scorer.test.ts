import { describe, it, expect } from "vitest";
import {
  scoreOpportunity,
  scoreOpportunities,
  getTopOpportunities,
} from "../../src/intelligence/opportunity-scorer.js";

describe("scoreOpportunity — formula math", () => {
  it("computes the Bible v1 weighted formula correctly", () => {
    // score = (80×0.30) + ((100-40)×0.30) + (70×0.20) + (60×0.10) + (50×0.10)
    //       = 24 + 18 + 14 + 6 + 5 = 67
    const result = scoreOpportunity("digital marketing agency", {
      searchVolume: 80,
      difficulty: 40,
      intent: 70,
      localRelevance: 60,
      aeoReadiness: 50,
    });
    expect(result.score).toBe(67);
    expect(result.keyword).toBe("digital marketing agency");
    expect(result.scoreId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.scoredAt).toBeTruthy();
  });

  it("inverts difficulty correctly (higher difficulty = lower score)", () => {
    const low = scoreOpportunity("easy", { searchVolume: 50, difficulty: 10, intent: 50, localRelevance: 50, aeoReadiness: 50 });
    const high = scoreOpportunity("hard", { searchVolume: 50, difficulty: 90, intent: 50, localRelevance: 50, aeoReadiness: 50 });
    expect(low.score).toBeGreaterThan(high.score);
  });
});

describe("scoreOpportunity — tier classification", () => {
  it("assigns tier high at exactly 70", () => {
    // score = (50×0.30) + ((100-50)×0.30) + (100×0.20) + (100×0.10) + (100×0.10)
    //       = 15 + 15 + 20 + 10 + 10 = 70
    const result = scoreOpportunity("tier-boundary-high", {
      searchVolume: 50,
      difficulty: 50,
      intent: 100,
      localRelevance: 100,
      aeoReadiness: 100,
    });
    expect(result.score).toBe(70);
    expect(result.tier).toBe("high");
  });

  it("assigns tier medium at 69 (one below high threshold)", () => {
    // score = 15 + 15 + 19 + 10 + 10 = 69
    const result = scoreOpportunity("tier-boundary-med-high", {
      searchVolume: 50,
      difficulty: 50,
      intent: 95,
      localRelevance: 100,
      aeoReadiness: 100,
    });
    expect(result.score).toBe(69);
    expect(result.tier).toBe("medium");
  });

  it("assigns tier medium at exactly 40", () => {
    // score = (0×0.30) + ((100-100)×0.30) + (100×0.20) + (100×0.10) + (100×0.10)
    //       = 0 + 0 + 20 + 10 + 10 = 40
    const result = scoreOpportunity("tier-boundary-med-low", {
      searchVolume: 0,
      difficulty: 100,
      intent: 100,
      localRelevance: 100,
      aeoReadiness: 100,
    });
    expect(result.score).toBe(40);
    expect(result.tier).toBe("medium");
  });

  it("assigns tier low at 39 (one below medium threshold)", () => {
    // score = 0 + 0 + 19 + 10 + 10 = 39
    const result = scoreOpportunity("tier-boundary-low", {
      searchVolume: 0,
      difficulty: 100,
      intent: 95,
      localRelevance: 100,
      aeoReadiness: 100,
    });
    expect(result.score).toBe(39);
    expect(result.tier).toBe("low");
  });

  it("assigns tier low at 0 (all zeros)", () => {
    const result = scoreOpportunity("zero-signals", {
      searchVolume: 0,
      difficulty: 100,
      intent: 0,
      localRelevance: 0,
      aeoReadiness: 0,
    });
    expect(result.score).toBe(0);
    expect(result.tier).toBe("low");
  });

  it("assigns tier high at 100 (perfect signals)", () => {
    const result = scoreOpportunity("perfect", {
      searchVolume: 100,
      difficulty: 0,
      intent: 100,
      localRelevance: 100,
      aeoReadiness: 100,
    });
    expect(result.score).toBe(100);
    expect(result.tier).toBe("high");
  });
});

describe("scoreOpportunities — sort order", () => {
  it("returns opportunities sorted by score descending", () => {
    const items = [
      { keyword: "low", signals: { searchVolume: 0, difficulty: 100, intent: 0, localRelevance: 0, aeoReadiness: 0 } },
      { keyword: "high", signals: { searchVolume: 100, difficulty: 0, intent: 100, localRelevance: 100, aeoReadiness: 100 } },
      { keyword: "medium", signals: { searchVolume: 50, difficulty: 50, intent: 50, localRelevance: 50, aeoReadiness: 50 } },
    ];

    const results = scoreOpportunities(items);
    expect(results).toHaveLength(3);
    expect(results[0]!.keyword).toBe("high");
    expect(results[1]!.keyword).toBe("medium");
    expect(results[2]!.keyword).toBe("low");
  });

  it("handles an empty array", () => {
    expect(scoreOpportunities([])).toEqual([]);
  });
});

describe("getTopOpportunities — limit", () => {
  it("returns at most limit items, highest scoring first", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      keyword: `keyword-${i}`,
      signals: {
        searchVolume: i * 5,
        difficulty: 0,
        intent: 0,
        localRelevance: 0,
        aeoReadiness: 0,
      },
    }));

    const results = getTopOpportunities(items, 5);
    expect(results).toHaveLength(5);
    expect(results[0]!.keyword).toBe("keyword-19");
  });

  it("defaults to 10 when no limit given", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      keyword: `kw-${i}`,
      signals: { searchVolume: i, difficulty: 0, intent: 0, localRelevance: 0, aeoReadiness: 0 },
    }));

    const results = getTopOpportunities(items);
    expect(results).toHaveLength(10);
  });

  it("returns all items when limit exceeds array length", () => {
    const items = [
      { keyword: "only", signals: { searchVolume: 50, difficulty: 50, intent: 50, localRelevance: 50, aeoReadiness: 50 } },
    ];
    expect(getTopOpportunities(items, 100)).toHaveLength(1);
  });
});
