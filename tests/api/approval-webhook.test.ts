import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalResolver } from "../../src/services/approval/approval-resolver.js";
import * as enforcedExecution from "../../src/security/permissions/enforced-execution.js";
import { EnforcementBlockedError } from "../../src/security/permissions/enforced-execution.js";
import { approvalWebhookReplayStore, handleApprovalWebhook } from "../../src/api/approval-webhook.js";

const buildSignedRequest = (
  rawBody: string,
  overrides?: Partial<Record<"x-aj-signature" | "x-aj-timestamp" | "x-aj-nonce" | "x-aj-webhook-id", string>>,
) => {
  const timestamp = overrides?.["x-aj-timestamp"] ?? `${Math.floor(Date.now() / 1000)}`;
  const nonce = overrides?.["x-aj-nonce"] ?? `approval-nonce-${Math.random().toString(36).slice(2)}`;
  const canonical = `${timestamp}.${nonce}.${rawBody}`;

  const signature = overrides?.["x-aj-signature"]
    ?? createHmac("sha256", process.env.AJ_WEBHOOK_SECRET ?? "").update(canonical).digest("hex");

  return {
    rawBody,
    headers: {
      "x-aj-signature": signature,
      "x-aj-timestamp": timestamp,
      "x-aj-nonce": nonce,
      "x-aj-webhook-id": overrides?.["x-aj-webhook-id"] ?? `approval-wh-${Math.random().toString(36).slice(2)}`,
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

  it("rejects malformed signature header", async () => {
    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_1", decision: "approve" }), {
        "x-aj-signature": "not-a-valid-hex-signature",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it("rejects bad signatures with 401", async () => {
    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_1", decision: "approve" }), {
        "x-aj-signature": "a".repeat(64),
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(401);
  });

  it("returns payload validation errors only after auth passes", async () => {
    const response = await handleApprovalWebhook(buildSignedRequest(JSON.stringify({ decision: "approve" })));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors.some((error) => error.includes("runId"))).toBe(true);
  });

  it("rejects invalid JSON body after auth passes", async () => {
    const response = await handleApprovalWebhook(buildSignedRequest("not-json{"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toContain("Invalid JSON payload");
  });

  it("rejects unknown decision enum value", async () => {
    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_1",
          decision: "maybe",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors.some((error) => error.includes("decision"))).toBe(true);
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

  it("returns 200 success when resolver approves the run", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockResolvedValue({
      ok: true,
      runId: "run_ok",
      previousStatus: "pending_approval",
      newStatus: "approved",
      approvalStatus: "approved",
      resumeExecution: true,
      errors: [],
      warnings: ["downstream queued"],
    });

    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_ok",
          decision: "approve",
          actor: "operator_1",
        }),
      ),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.runId).toBe("run_ok");
    expect(response.status).toBe("approved");
    expect(response.nextAction).toBe("resume_execution");
    expect(response.warnings).toEqual(["downstream queued"]);
  });

  it("reports nextAction=none when resolver succeeds without resume", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockResolvedValue({
      ok: true,
      runId: "run_reject",
      previousStatus: "pending_approval",
      newStatus: "rejected",
      approvalStatus: "rejected",
      resumeExecution: false,
      errors: [],
      warnings: [],
    });

    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_reject",
          decision: "reject",
        }),
      ),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.nextAction).toBe("none");
  });

  it("returns 422 when enforcement requires approval", async () => {
    vi.spyOn(enforcedExecution, "executeWithEnforcement").mockResolvedValue({
      status: "approval_required",
      enforcement: {
        decision: "require_approval",
        category: "REMOTE_CHANGE",
        risk: "high",
        reason: "operator approval pending",
        auditId: "audit-1",
      },
    });

    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_pending",
          decision: "approve",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toContain("operator approval pending");
  });

  it("returns 422 when enforcement blocks the action", async () => {
    vi.spyOn(enforcedExecution, "executeWithEnforcement").mockRejectedValue(
      new EnforcementBlockedError("policy blocked remote_change", "audit-2"),
    );

    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_blocked",
          decision: "approve",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toBe("policy blocked remote_change");
  });

  it("returns 500 when an unexpected error escapes the resolver", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockRejectedValue(new Error("boom"));

    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_crash",
          decision: "approve",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toBe("boom");
  });

  it("returns generic error message when thrown value is not an Error", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockRejectedValue("string-error");

    const response = await handleApprovalWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_nonerror",
          decision: "approve",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toBe("Approval resolution failed.");
  });

  it("rejects replayed webhook ids with 409", async () => {
    vi.spyOn(ApprovalResolver.prototype, "resolve").mockResolvedValue({
      ok: true,
      runId: "run_replay",
      previousStatus: "pending_approval",
      newStatus: "approved",
      approvalStatus: "approved",
      resumeExecution: true,
      errors: [],
      warnings: [],
    });

    const request = buildSignedRequest(JSON.stringify({ runId: "run_replay", decision: "approve" }), {
      "x-aj-nonce": "approval-replay-nonce",
      "x-aj-webhook-id": "approval-replay-id",
    });

    const first = await handleApprovalWebhook(request);
    const second = await handleApprovalWebhook(request);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
  });

  it("returns 500 when the security configuration is invalid", async () => {
    delete process.env.AJ_WEBHOOK_SECRET;

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_1", decision: "approve" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
  });
});

describe("approval webhook replay TTL configuration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("honors a configured replay TTL", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "900";

    const fresh = await import("../../src/api/approval-webhook.js");

    expect(fresh.approvalWebhookReplayStore).toBeDefined();
  });

  it("falls back to default when configured TTL is not a positive integer", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "not-a-number";

    const fresh = await import("../../src/api/approval-webhook.js");

    expect(fresh.approvalWebhookReplayStore).toBeDefined();
  });

  it("falls back to default when configured TTL is zero", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "0";

    const fresh = await import("../../src/api/approval-webhook.js");

    expect(fresh.approvalWebhookReplayStore).toBeDefined();
  });
});
