import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DECISION_DIR = join(process.cwd(), "runtime", "decision");
const EVALUATIONS_FILE = join(DECISION_DIR, "map-evaluations.json");
const CYCLES_FILE = join(DECISION_DIR, "cera-cycles.json");
const AUDIT_FILE = join(DECISION_DIR, "decision-audit.jsonl");

beforeEach(() => {
  for (const path of [EVALUATIONS_FILE, CYCLES_FILE, AUDIT_FILE]) {
    if (existsSync(path)) rmSync(path);
  }
});

import {
  calculateMapScore,
  deriveMapDecisionBand,
  deriveMapDecision,
  calculateCeraEfficiencyScore,
  calculateCompoundScore,
  deriveCompoundDecisionPath,
  evaluateMap,
  createCeraCycle,
  getCompoundScore,
} from "../../src/decision/decision-engine.js";

import {
  applyDecisionPolicy,
  validateProductionTenant,
} from "../../src/decision/decision-policy.js";

import {
  saveEvaluation,
  getEvaluation,
  listEvaluations,
  saveCycle,
  appendDecisionAuditEvent,
  getDecisionAuditEvents,
} from "../../src/decision/decision-store.js";

import * as decisionAttribution from "../../src/decision/decision-attribution.js";
import * as attributionTracker from "../../src/attribution/attribution-tracker.js";

import type { DecisionInput } from "../../src/decision/decision-types.js";

function baseInput(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    title: "Test Initiative",
    description: "Test description",
    category: "offer",
    meaningfulScore: 2,
    actionableScore: 3,
    profitableScore: 3,
    createdBy: "test-user",
    environment: "local",
    ...overrides,
  };
}

// 1. MAP score calculation
describe("calculateMapScore", () => {
  it("sums M+A+P clamped 0-9 (2+3+3=8)", () => {
    expect(calculateMapScore(2, 3, 3)).toBe(8);
  });

  it("clamps individual scores to 0-3 each", () => {
    expect(calculateMapScore(5, 5, 5)).toBe(9);
  });

  it("clamps negative values to 0", () => {
    expect(calculateMapScore(-1, 0, 0)).toBe(0);
  });
});

// 2-4. Decision band derivation
describe("deriveMapDecisionBand and deriveMapDecision", () => {
  it("8 → strong_alignment → execute", () => {
    const band = deriveMapDecisionBand(8);
    expect(band).toBe("strong_alignment");
    expect(deriveMapDecision(band)).toBe("execute");
  });

  it("9 → strong_alignment → execute", () => {
    expect(deriveMapDecisionBand(9)).toBe("strong_alignment");
  });

  it("6 → moderate_alignment → improve", () => {
    const band = deriveMapDecisionBand(6);
    expect(band).toBe("moderate_alignment");
    expect(deriveMapDecision(band)).toBe("improve");
  });

  it("5 → moderate_alignment", () => {
    expect(deriveMapDecisionBand(5)).toBe("moderate_alignment");
  });

  it("3 → weak_alignment → reconsider", () => {
    const band = deriveMapDecisionBand(3);
    expect(band).toBe("weak_alignment");
    expect(deriveMapDecision(band)).toBe("reconsider");
  });

  it("0 → weak_alignment", () => {
    expect(deriveMapDecisionBand(0)).toBe("weak_alignment");
  });
});

// 5. Compound score
describe("calculateCompoundScore", () => {
  it("multiplies map and cera (8 × 8 = 64)", () => {
    expect(calculateCompoundScore(8, 8)).toBe(64);
  });

  it("returns 0 when either score is 0", () => {
    expect(calculateCompoundScore(0, 8)).toBe(0);
    expect(calculateCompoundScore(8, 0)).toBe(0);
  });
});

// 6-8. Compound decision paths
describe("deriveCompoundDecisionPath", () => {
  it("scale: mapScore=8, cera=8", () => {
    expect(deriveCompoundDecisionPath(8, 8)).toBe("scale");
  });

  it("pivot: mapScore=5, cera=5", () => {
    expect(deriveCompoundDecisionPath(5, 5)).toBe("pivot");
  });

  it("kill: mapScore=3, cera=3", () => {
    expect(deriveCompoundDecisionPath(3, 3)).toBe("kill");
  });

  it("kill: high map but cera <= 4", () => {
    expect(deriveCompoundDecisionPath(9, 3)).toBe("kill");
  });

  it("pivot: cera between 5-7 with map >= 5", () => {
    expect(deriveCompoundDecisionPath(7, 7)).toBe("pivot");
  });
});

// 9. Production tenant gate
describe("validateProductionTenant", () => {
  it("blocks production evaluation without tenantId", () => {
    const result = validateProductionTenant(
      baseInput({ environment: "production" }),
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tenantId");
  });

  it("allows production evaluation with tenantId", () => {
    const result = validateProductionTenant(
      baseInput({ environment: "production", tenantId: "tenant-1" }),
    );
    expect(result.ok).toBe(true);
  });

  it("allows local evaluation without tenantId", () => {
    const result = validateProductionTenant(baseInput({ environment: "local" }));
    expect(result.ok).toBe(true);
  });
});

// 10. Weak alignment policy
describe("applyDecisionPolicy", () => {
  it("blocks non-admin execution on weak_alignment", () => {
    const evaluation = evaluateMap(
      baseInput({ meaningfulScore: 1, actionableScore: 1, profitableScore: 1 }),
    );
    expect(evaluation.decision).toBe("reconsider");
    const policy = applyDecisionPolicy(evaluation, { actorType: "user" });
    expect(policy.allowed).toBe(false);
    expect(policy.routedTo).toBe("blocked");
  });

  it("allows weak_alignment execution for system actor", () => {
    const evaluation = evaluateMap(
      baseInput({ meaningfulScore: 1, actionableScore: 1, profitableScore: 1 }),
    );
    const policy = applyDecisionPolicy(evaluation, { actorType: "system" });
    expect(policy.allowed).toBe(true);
    expect(policy.routedTo).toBe("execute");
  });

  it("allows weak_alignment execution with forceExecute=true", () => {
    const evaluation = evaluateMap(
      baseInput({ meaningfulScore: 1, actionableScore: 1, profitableScore: 1 }),
    );
    const policy = applyDecisionPolicy(evaluation, { forceExecute: true });
    expect(policy.allowed).toBe(true);
  });

  // 11. Moderate alignment routes to improve
  it("routes moderate_alignment to improve", () => {
    const evaluation = evaluateMap(
      baseInput({ meaningfulScore: 2, actionableScore: 2, profitableScore: 2 }),
    );
    expect(evaluation.decision).toBe("improve");
    const policy = applyDecisionPolicy(evaluation);
    expect(policy.allowed).toBe(false);
    expect(policy.routedTo).toBe("improve");
  });

  // 12. Strong alignment proceeds
  it("strong_alignment proceeds to execute", () => {
    const evaluation = evaluateMap(
      baseInput({ meaningfulScore: 3, actionableScore: 3, profitableScore: 2 }),
    );
    expect(evaluation.decision).toBe("execute");
    const policy = applyDecisionPolicy(evaluation);
    expect(policy.allowed).toBe(true);
    expect(policy.routedTo).toBe("execute");
  });
});

// 13. CERA cycle writes audit event
describe("CERA cycle persistence and audit", () => {
  it("creates cycle and audit event is written", () => {
    const evaluation = evaluateMap(baseInput());
    saveEvaluation(evaluation);
    const cycle = createCeraCycle(evaluation, {
      captureSignals: ["s1", "s2"],
      extractedInsights: ["i1"],
      refinementActions: ["r1"],
      amplificationActions: ["a1"],
    });
    saveCycle(cycle);
    appendDecisionAuditEvent({
      evaluationId: cycle.evaluationId,
      cycleId: cycle.cycleId,
      event: "cera_cycle_created",
      payload: { decisionPath: cycle.decisionPath },
    });

    const events = getDecisionAuditEvents({ cycleId: cycle.cycleId });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.event).toBe("cera_cycle_created");
  });
});

// 14. Attribution emits after MAP evaluation (fire-and-forget — no throw)
describe("decision-attribution fire-and-forget behavior", () => {
  it("emitMapEvaluation does not throw and triggers emitEvent", () => {
    const spy = vi.spyOn(attributionTracker, "emitEvent").mockResolvedValue({
      eventId: "x",
      eventType: "map_evaluation_created",
      runId: "r",
      agentId: "a",
      channel: "unknown",
      timestamp: new Date().toISOString(),
    });

    const evaluation = evaluateMap(baseInput());
    expect(() => decisionAttribution.emitMapEvaluation(evaluation)).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // 15. Attribution failure does not throw
  it("emitMapEvaluation swallows rejected promise", async () => {
    const spy = vi
      .spyOn(attributionTracker, "emitEvent")
      .mockRejectedValue(new Error("boom"));

    const evaluation = evaluateMap(baseInput());
    expect(() => decisionAttribution.emitMapEvaluation(evaluation)).not.toThrow();
    // Allow the rejected promise's .catch to run
    await Promise.resolve();
    spy.mockRestore();
  });

  it("emitMapEvaluation does not throw when emitEvent itself throws synchronously", () => {
    const spy = vi.spyOn(attributionTracker, "emitEvent").mockImplementation(() => {
      throw new Error("sync boom");
    });

    const evaluation = evaluateMap(baseInput());
    expect(() => decisionAttribution.emitMapEvaluation(evaluation)).not.toThrow();
    spy.mockRestore();
  });
});

// 16. AEO score >= 70 bumps profitableScore
describe("AEO score influence", () => {
  it("aeoScore >= 70 bumps profitableScore by 1 (clamped at 3)", () => {
    const evalLow = evaluateMap(
      baseInput({ profitableScore: 2, meaningfulScore: 2, actionableScore: 2, aeoScore: 75 }),
    );
    expect(evalLow.profitableScore).toBe(3);
  });

  it("aeoScore < 70 does not bump", () => {
    const evalNoBump = evaluateMap(
      baseInput({ profitableScore: 1, meaningfulScore: 1, actionableScore: 1, aeoScore: 50 }),
    );
    expect(evalNoBump.profitableScore).toBe(1);
  });

  it("aeoScore >= 80 also bumps actionableScore", () => {
    const evalDoubleBump = evaluateMap(
      baseInput({ profitableScore: 1, meaningfulScore: 1, actionableScore: 1, aeoScore: 85 }),
    );
    expect(evalDoubleBump.profitableScore).toBe(2);
    expect(evalDoubleBump.actionableScore).toBe(2);
  });

  it("clamps profitableScore at 3 with aeoScore boost", () => {
    const evalClamp = evaluateMap(
      baseInput({ profitableScore: 3, meaningfulScore: 1, actionableScore: 1, aeoScore: 80 }),
    );
    expect(evalClamp.profitableScore).toBe(3);
  });
});

// 17. File-backed store persists evaluations
describe("file-backed store", () => {
  it("persists and retrieves evaluations across calls", () => {
    const evaluation = evaluateMap(baseInput({ title: "Persisted" }));
    saveEvaluation(evaluation);

    expect(existsSync(EVALUATIONS_FILE)).toBe(true);
    const fetched = getEvaluation(evaluation.evaluationId);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe("Persisted");
  });

  it("listEvaluations returns saved records", () => {
    const e1 = evaluateMap(baseInput({ title: "first" }));
    const e2 = evaluateMap(baseInput({ title: "second" }));
    saveEvaluation(e1);
    saveEvaluation(e2);
    const list = listEvaluations();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it("audit log is written to JSONL file", () => {
    const evaluation = evaluateMap(baseInput());
    saveEvaluation(evaluation);
    appendDecisionAuditEvent({
      evaluationId: evaluation.evaluationId,
      event: "map_evaluation_created",
      payload: { mapScore: evaluation.mapScore },
    });
    expect(existsSync(AUDIT_FILE)).toBe(true);
    const raw = readFileSync(AUDIT_FILE, "utf-8");
    expect(raw).toContain("map_evaluation_created");
  });
});

// 18. Evaluation and cycle linked via evaluationId
describe("evaluation–cycle linkage", () => {
  it("cycle references evaluationId and getCompoundScore links them", () => {
    const evaluation = evaluateMap(baseInput());
    saveEvaluation(evaluation);

    const cycle = createCeraCycle(evaluation, {
      captureSignals: ["s1", "s2", "s3"],
      extractedInsights: ["i1", "i2"],
      refinementActions: ["r1"],
      amplificationActions: ["a1"],
    });
    saveCycle(cycle);

    expect(cycle.evaluationId).toBe(evaluation.evaluationId);

    const score = getCompoundScore(evaluation, cycle);
    expect(score.evaluationId).toBe(evaluation.evaluationId);
    expect(score.cycleId).toBe(cycle.cycleId);
    expect(score.compoundScore).toBe(evaluation.mapScore * cycle.ceraEfficiencyScore);
  });

  it("calculateCeraEfficiencyScore matches formula min(10, total/2)", () => {
    expect(calculateCeraEfficiencyScore(["a", "b"], ["c"], ["d"], ["e"])).toBe(2.5);
    // Saturates at 10
    expect(
      calculateCeraEfficiencyScore(
        Array(10).fill("x"),
        Array(10).fill("x"),
        Array(10).fill("x"),
        Array(10).fill("x"),
      ),
    ).toBe(10);
  });
});
