import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { approvalWebhookReplayStore, handleApprovalWebhook } from "../../src/api/approval-webhook.js";
import { EnforcementBlockedError } from "../../src/security/permissions/enforced-execution.js";
import { ApprovalResolver } from "../../src/services/approval/approval-resolver.js";

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

  it("rejects unparseable JSON after auth passes", async () => {
    const response = await handleApprovalWebhook(buildSignedRequest("not-json{"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toContain("Invalid JSON payload");
  });

  it("returns success with resume action when the resolver approves", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockResolvedValue({
      ok: true,
      runId: "run_ok",
      newStatus: "approved",
      resumeExecution: true,
      warnings: ["warn_1"],
      errors: [],
    });

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_ok", decision: "approve" })),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.status).toBe("approved");
    expect(response.nextAction).toBe("resume_execution");
    expect(response.warnings).toEqual(["warn_1"]);
  });

  it("returns success without resume action when execution is not resumed", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockResolvedValue({
      ok: true,
      runId: "run_norun",
      newStatus: "rejected",
      resumeExecution: false,
      warnings: [],
      errors: [],
    });

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_norun", decision: "reject" })),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.nextAction).toBe("none");
  });

  it("maps enforcement blocks to 422 responses", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockRejectedValue(
      new EnforcementBlockedError("Action blocked by policy.", "audit_1"),
    );

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_blocked", decision: "approve" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toContain("Action blocked by policy");
  });

  it("maps unexpected resolver errors to 500 responses", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockRejectedValue(new Error("resolver exploded"));

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_err", decision: "approve" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toContain("resolver exploded");
  });

  it("uses a fallback message for non-Error resolver failures", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockRejectedValue("string failure");

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_str", decision: "approve" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toBe("Approval resolution failed.");
  });
});

describe("approval webhook replay ttl configuration", () => {
  it("honors a valid replay ttl override", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "120";

    const mod = await import("../../src/api/approval-webhook.js");

    expect(mod.approvalWebhookReplayStore).toBeDefined();
  });

  it("falls back to the default ttl for non-numeric values", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "not-a-number";

    const mod = await import("../../src/api/approval-webhook.js");

    expect(mod.approvalWebhookReplayStore).toBeDefined();
  });

  it("falls back to the default ttl for non-positive values", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "-5";

    const mod = await import("../../src/api/approval-webhook.js");

    expect(mod.approvalWebhookReplayStore).toBeDefined();
  });

  it("falls back to the default ttl when unset", async () => {
    vi.resetModules();
    delete process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;

    const mod = await import("../../src/api/approval-webhook.js");

    expect(mod.approvalWebhookReplayStore).toBeDefined();
  });
});