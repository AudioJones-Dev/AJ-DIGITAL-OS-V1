import { describe, expect, it } from "vitest";
import { runLeadToOfferWorkflow } from "../../src/workflows/lead-to-offer.workflow.js";

const BASE_INPUT = {
  leadData: {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@acme.example",
    company: "Acme Corp",
    source: "outbound",
  },
  offerType: "consulting" as const,
  offerTitle: "Growth Strategy Consultation",
  createdBy: "test-operator",
  environment: "local",
};

describe("lead-to-offer workflow", () => {
  it("1. runs full workflow end-to-end with mock lead data", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.dagRunId).toBeTruthy();
    expect(result.dagStatus).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("2. lead normalization step produces NormalizedLead", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.stages.leadFetched).toBe(true);
    expect(result.stages.leadNormalized).toBe(true);
    expect(result.lead).toBeDefined();
    expect(result.lead?.email).toBe("jane@acme.example");
    expect(result.lead?.entityId).toBeTruthy();
  });

  it("3. diagnosis step returns recommendations", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.stages.diagnosed).toBe(true);
    expect(result.diagnosis).toBeDefined();
    expect(Array.isArray(result.diagnosis?.recommendations)).toBe(true);
  });

  it("4. MAP evaluation step produces mapScore", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.stages.mapScored).toBe(true);
  });

  it("5. offer creation step returns a result", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.stages.offerCreated).toBeDefined();
    expect(result.offer).toBeDefined();
  });

  it("6. governance check runs on the offer without throwing", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.stages.governancePassed !== undefined).toBe(true);
  });

  it("7. content brief created when governance passes", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    if (result.stages.governancePassed) {
      expect(result.stages.contentBriefCreated).toBe(true);
      expect(result.contentBrief).toBeDefined();
    }
  });

  it("8. attribution emits without throwing", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.stages.attributionEmitted).toBeDefined();
  });

  it("9. result includes dagRunId and stages tracking", async () => {
    const result = await runLeadToOfferWorkflow(BASE_INPUT);
    expect(result.dagRunId).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof result.stages).toBe("object");
    expect(Object.keys(result.stages).length).toBeGreaterThan(0);
  });

  it("10. handles missing leadData gracefully using defaults", async () => {
    const result = await runLeadToOfferWorkflow({
      environment: "local",
      createdBy: "test",
    });
    expect(result.dagRunId).toBeTruthy();
    expect(result.stages.leadFetched).toBe(true);
    expect(result.lead?.email).toBe("demo@example.com");
  });
});
