import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { classifyArchetype, compressCase, diagnoseSystem } from "../../src/intelligence-layer/ais-core/index.js";
import { computePredictionError } from "../../src/intelligence-layer/prediction-error/index.js";
import { computeErrorReductionPer1kTokens, recordTokenUsage } from "../../src/intelligence-layer/token-governance/index.js";
import type { DiagnoseSystemRequest, InterventionPlan } from "../../src/intelligence-layer/shared-types/index.js";

function loadFixture(name: string): DiagnoseSystemRequest {
  const filePath = join(process.cwd(), "tests", "fixtures", "ais", name);
  return JSON.parse(readFileSync(filePath, "utf8")) as DiagnoseSystemRequest;
}

describe("AIS foundation routing", () => {
  it.each([
    ["signal-degradation.json", "signal_degradation"],
    ["transformation-failure.json", "transformation_failure"],
    ["bottleneck.json", "bottleneck_constraint"],
  ])("routes %s to %s", (fixture, expectedArchetype) => {
    const input = loadFixture(fixture);
    const classification = classifyArchetype(input);

    expect(classification.primary_archetype).toBe(expectedArchetype);
    expect(classification.confidence).toBeGreaterThan(0.2);
  });

  it("returns diagnose system response with validation shape", () => {
    const response = diagnoseSystem(loadFixture("signal-degradation.json"));

    expect(response.status).toBe("diagnosed");
    expect(response.expected_outcome_model).toBeDefined();
    expect(response.storage.routing_hints).toEqual({
      requires_qualification: true,
      requires_attribution: true,
      requires_template_mapping: true,
    });

    expect(response.validation).toMatchObject({
      archetype_validity: expect.any(Number),
      analogy_validity: expect.any(Number),
      causal_alignment_score: expect.any(Number),
      confidence_score: expect.any(Number),
      weaknesses: expect.any(Array),
      approved_inferences: expect.any(Array),
      rejected_inferences: expect.any(Array),
    });
  });
});

describe("Prediction error and compact case", () => {
  it("computes prediction error with aggregate and delta", () => {
    const result = computePredictionError(
      { throughput: 0.8, error_rate: 0.1 },
      { throughput: 0.6, error_rate: 0.15 },
      0.3,
    );

    expect(result.by_metric.throughput.absolute_error).toBeCloseTo(0.2);
    expect(result.aggregate_error).toBeCloseTo(0.125);
    expect(result.error_delta).toBeCloseTo(0.175);
  });

  it("compresses a compact case object deterministically", () => {
    const intervention: InterventionPlan = {
      primary_actions: ["Execute queue control workstream"],
      secondary_actions: ["Answer: Where does work accumulate faster than it clears?"],
      sequencing: ["stabilize measurement"],
      measurement_targets: ["throughput"],
      expected_outcomes: ["Reduced queue growth"],
    };

    const compact = compressCase({
      case_id: "case-123",
      archetype: "bottleneck_constraint",
      intervention,
      constraints: ["approval queue backlog"],
      predicted_outcome: { throughput: 0.7 },
    });

    expect(compact.case_id).toBe("case-123");
    expect(compact.retrieval_tags).toContain("queue");
    expect(compact.key_constraints).toEqual(["approval queue backlog"]);
  });

  it("computes token efficiency per 1k tokens", () => {
    const usage = [
      recordTokenUsage({
        case_id: "case-123",
        stage: "diagnose",
        agent: "ais-core",
        model: "deterministic-v1",
        prompt_tokens: 300,
        completion_tokens: 200,
      }),
    ];

    const efficiency = computeErrorReductionPer1kTokens(0.4, 0.2, usage);
    expect(efficiency).toBeCloseTo(0.4);
  });
});
