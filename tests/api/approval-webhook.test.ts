import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { approvalWebhookReplayStore, handleApprovalWebhook } from "../../src/api/approval-webhook.js";

const buildSignedRequest = (
  rawBody: string,
  overrides?: Partial<Record<"x-aj-signature" | "x-aj-timestamp" | "x-aj-nonce" | "x-aj-webhook-id", string>>,
) => {
  const timestamp = overrides?.["x-aj-timestamp"] ?? `${Math.floor(Date.now() / 1000)}`;
  const nonce = overrides?.["x-aj-nonce"] ?? "approval-nonce-1";
  const canonical = `${timestamp}.${nonce}.${rawBody}`;

  const signature = overrides?.["x-aj-signature"]
    ?? createHmac("sha256", process.env.AJ_WEBHOOK_SECRET ?? "").update(canonical).digest("hex");

  return {
    rawBody,
    headers: {
      "x-aj-signature": signature,
      "x-aj-timestamp": timestamp,
      "x-aj-nonce": nonce,
      "x-aj-webhook-id": overrides?.["x-aj-webhook-id"] ?? "approval-wh-1",
    },
  };
};

describe("approval webhook", () => {
  afterEach(() => {
    approvalWebhookReplayStore.clear();
  });

  it("rejects missing auth headers", async () => {
    const response = await handleApprovalWebhook({
      rawBody: JSON.stringify({ runId: "run_1", decision: "approve" }),
      headers: {},
    });

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it("returns payload validation errors only after auth passes", async () => {
    const response = await handleApprovalWebhook(buildSignedRequest(JSON.stringify({ decision: "approve" })));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors.some((error) => error.includes("runId"))).toBe(true);
  });

  it("accepts valid signed payload shape and returns resolver response", async () => {
    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_missing",
          decision: "approve",
          actor: "operator_1",
          source: "manual",
        }),
      ),
    );

    expect(response.statusCode).toBe(422);
    expect(response.ok).toBe(false);
    expect(response.runId).toBe("run_missing");
    expect(response.errors[0]).toContain("was not found");
  });
});