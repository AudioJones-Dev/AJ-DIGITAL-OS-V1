import { describe, expect, it } from "vitest";

import {
  buildCanonicalPayload,
  computeWebhookSignature,
  verifyWebhookRequest,
} from "../../src/security/webhook-signature.js";

const replayStore = {
  checkAndStore: async () => ({ replay: false }),
};

describe("webhook signature verification", () => {
  it("accepts valid signed request", async () => {
    process.env.AJ_WEBHOOK_SECRET = "test-secret";

    const rawBody = JSON.stringify({ runId: "run_123" });
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const nonce = "nonce-1";
    const canonical = buildCanonicalPayload(timestamp, nonce, rawBody);
    const signature = computeWebhookSignature(process.env.AJ_WEBHOOK_SECRET, canonical);

    const result = await verifyWebhookRequest({
      rawBody,
      headers: {
        "x-aj-signature": signature,
        "x-aj-timestamp": timestamp,
        "x-aj-nonce": nonce,
        "x-aj-webhook-id": "wh-1",
      },
      replayStore,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects bad signature", async () => {
    process.env.AJ_WEBHOOK_SECRET = "test-secret";

    const result = await verifyWebhookRequest({
      rawBody: "{}",
      headers: {
        "x-aj-signature": "a".repeat(64),
        "x-aj-timestamp": `${Math.floor(Date.now() / 1000)}`,
        "x-aj-nonce": "nonce-2",
        "x-aj-webhook-id": "wh-2",
      },
      replayStore,
    });

    expect(result).toMatchObject({ ok: false, statusCode: 401, code: "invalid_signature" });
  });

  it("rejects missing header", async () => {
    process.env.AJ_WEBHOOK_SECRET = "test-secret";

    const result = await verifyWebhookRequest({
      rawBody: "{}",
      headers: {
        "x-aj-signature": "a".repeat(64),
        "x-aj-timestamp": `${Math.floor(Date.now() / 1000)}`,
        "x-aj-nonce": "nonce-3",
      },
      replayStore,
    });

    expect(result).toMatchObject({ ok: false, statusCode: 400, code: "missing_headers" });
  });

  it("rejects malformed timestamp", async () => {
    process.env.AJ_WEBHOOK_SECRET = "test-secret";

    const result = await verifyWebhookRequest({
      rawBody: "{}",
      headers: {
        "x-aj-signature": "a".repeat(64),
        "x-aj-timestamp": "not-a-number",
        "x-aj-nonce": "nonce-4",
        "x-aj-webhook-id": "wh-4",
      },
      replayStore,
    });

    expect(result).toMatchObject({ ok: false, statusCode: 400, code: "invalid_timestamp" });
  });

  it("rejects expired timestamp", async () => {
    process.env.AJ_WEBHOOK_SECRET = "test-secret";
    process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS = "300";

    const result = await verifyWebhookRequest({
      rawBody: "{}",
      headers: {
        "x-aj-signature": "a".repeat(64),
        "x-aj-timestamp": `${Math.floor(Date.now() / 1000) - 301}`,
        "x-aj-nonce": "nonce-5",
        "x-aj-webhook-id": "wh-5",
      },
      replayStore,
    });

    expect(result).toMatchObject({ ok: false, statusCode: 400, code: "expired_timestamp" });
  });

  it("produces a stable canonical payload and signature", () => {
    const payload = buildCanonicalPayload("1735689600", "nonce-fixed", '{"runId":"run_1"}');
    const signature = computeWebhookSignature("test-secret", payload);

    expect(payload).toBe('1735689600.nonce-fixed.{"runId":"run_1"}');
    expect(signature).toHaveLength(64);
  });
});
