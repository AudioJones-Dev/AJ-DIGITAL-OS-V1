import { describe, expect, it } from "vitest";

import { handleApprovalWebhook } from "../../src/api/approval-webhook.js";

describe("approval webhook", () => {
  it("returns validation errors for invalid payload", async () => {
    const response = await handleApprovalWebhook({
      decision: "approve",
    });

    expect(response.ok).toBe(false);
    expect(response.errors.some((error) => error.includes("runId"))).toBe(true);
  });

  it("accepts valid payload shape and returns resolver response", async () => {
    const response = await handleApprovalWebhook({
      runId: "run_missing",
      decision: "approve",
      actor: "operator_1",
      source: "manual",
    });

    expect(response.ok).toBe(false);
    expect(response.runId).toBe("run_missing");
    expect(response.errors[0]).toContain("was not found");
  });
});
