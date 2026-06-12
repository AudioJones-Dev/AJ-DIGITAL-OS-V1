import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateBusinessQualification } from "../../src/intelligence-layer/qualification-engine/index.js";
import type { QualificationRequest } from "../../src/intelligence-layer/shared-types/index.js";

function loadFixture(name: string): QualificationRequest {
  const filePath = join(process.cwd(), "tests", "fixtures", "qualification", name);
  return JSON.parse(readFileSync(filePath, "utf8")) as QualificationRequest;
}

describe("Qualification Engine v1", () => {
  it("routes weak business to not_ready", () => {
    const result = evaluateBusinessQualification(loadFixture("not-ready-case.json"));

    expect(result.deployment_tier).toBe("not_ready");
    expect(result.disqualifiers.length).toBeGreaterThan(0);
  });

  it("routes mid-readiness business to foundation", () => {
    const result = evaluateBusinessQualification(loadFixture("foundation-case.json"));

    expect(result.deployment_tier).toBe("foundation");
    expect(result.disqualifiers).toHaveLength(0);
  });

  it("routes viable business to growth", () => {
    const result = evaluateBusinessQualification(loadFixture("growth-case.json"));

    expect(result.deployment_tier).toBe("growth");
    expect(result.required_fixes).toContain("Establish attribution tracking");
  });

  it("routes strong business to scale", () => {
    const result = evaluateBusinessQualification(loadFixture("scale-case.json"));

    expect(result.deployment_tier).toBe("scale");
    expect(result.required_fixes).toHaveLength(0);
  });

  it("emits required fixes for low process maturity", () => {
    const result = evaluateBusinessQualification(loadFixture("foundation-case.json"));

    expect(result.required_fixes).toContain("Document fulfillment SOPs");
  });

  it("emits tracking-related fixes when attribution readiness is weak", () => {
    const result = evaluateBusinessQualification(loadFixture("growth-case.json"));

    expect(result.attribution_readiness_score.score).toBeLessThan(45);
    expect(result.required_fixes).toContain("Establish attribution tracking");
  });

  it("rejects clearly unqualified business with meaningful disqualifier list", () => {
    const result = evaluateBusinessQualification(loadFixture("not-ready-case.json"));

    expect(result.recommended_next_step).toBe("reject");
    expect(result.disqualifiers).toEqual(
      expect.arrayContaining([
        "No meaningful demand signal detected",
        "Average customer value too low for OS deployment",
        "No sales process present",
      ]),
    );
  });
});
