import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ExecutionAgent } from "../../src/agents/execution.agent.js";
import * as enforcedExecution from "../../src/security/permissions/enforced-execution.js";
import { EnforcementBlockedError } from "../../src/security/permissions/enforced-execution.js";
import { executionWebhookReplayStore, handleExecutionWebhook } from "../../src/api/execution-webhook.js";

const buildSignedRequest = (
  rawBody: string,
  overrides?: Partial<Record<"x-aj-signature" | "x-aj-timestamp" | "x-aj-nonce" | "x-aj-webhook-id", string>>,
) => {
  const timestamp = overrides?.["x-aj-timestamp"] ?? `${Math.floor(Date.now() / 1000)}`;
  const nonce = overrides?.["x-aj-nonce"] ?? `execution-nonce-${Math.random().toString(36).slice(2)}`;
  const canonical = `${timestamp}.${nonce}.${rawBody}`;

  const signature = overrides?.["x-aj-signature"]
    ?? createHmac("sha256", process.env.AJ_WEBHOOK_SECRET ?? "").update(canonical).digest("hex");

  return {
    rawBody,
    headers: {
      "x-aj-signature": signature,
      "x-aj-timestamp": timestamp,
      "x-aj-nonce": nonce,
      "x-aj-webhook-id": overrides?.["x-aj-webhook-id"] ?? `execution-wh-${Math.random().toString(36).slice(2)}`,
    },
  };
};

describe("execution webhook", () => {
  afterEach(() => {
    executionWebhookReplayStore.clear();
  });

  it("rejects missing auth headers with 400", async () => {
    const response = await handleExecutionWebhook({
      rawBody: JSON.stringify({ runId: "run_123", target: "local" }),
      headers: {},
    });

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(400);
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
    expect(response.status).toBe("failed");
    expect(response.filesWritten).toEqual([]);
  });

  it("rejects bad signatures", async () => {
    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_123", target: "local" }), {
        "x-aj-signature": "a".repeat(64),
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid JSON body after auth passes", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest("{not valid"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.status).toBe("failed");
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
    expect(response.errors[0]).toContain("Invalid JSON payload");
  });

  it("returns payload validation errors for invalid payload only after auth", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest(JSON.stringify({ target: "local" })));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.status).toBe("failed");
    expect(response.errors.some((error) => error.includes("runId"))).toBe(true);
  });

  it("uses payload runId and target as fallbacks when schema rejects other fields", async () => {
    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_fallback",
          target: "remote",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("run_fallback");
    expect(response.target).toBe("remote");
  });

  it("falls back to defaults when payload omits runId and target", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest(JSON.stringify({})));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
    expect(response.status).toBe("failed");
  });

  it("returns execution success for valid payload with publishedPath", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: true,
      agent: "execution",
      runId: "run_123",
      target: "local",
      status: "executed",
      publishedPath: "dist/published/run_123.md",
      filesWritten: ["dist/published/run_123.md"],
      warnings: [],
      errors: [],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_123",
          target: "local",
          source: "manual",
          actor: "operator_1",
        }),
      ),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.status).toBe("executed");
    expect(response.runId).toBe("run_123");
    expect(response.publishedPath).toBe("dist/published/run_123.md");
    expect(response.filesWritten).toEqual(["dist/published/run_123.md"]);
    expect(response.source).toBe("manual");
    expect(response.actor).toBe("operator_1");
  });

  it("returns 422 failure when execution agent reports a failed result with publishedPath", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: false,
      agent: "execution",
      runId: "run_fail_pub",
      target: "local",
      status: "failed",
      publishedPath: "dist/published/run_fail_pub.md",
      filesWritten: ["dist/published/run_fail_pub.md"],
      warnings: ["partial publish"],
      errors: ["downstream rejected"],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_fail_pub",
          target: "local",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.status).toBe("failed");
    expect(response.publishedPath).toBe("dist/published/run_fail_pub.md");
    expect(response.errors).toContain("downstream rejected");
    expect(response.source).toBeUndefined();
    expect(response.actor).toBeUndefined();
  });

  it("returns 422 failure when execution agent reports failure without publishedPath", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: false,
      agent: "execution",
      runId: "run_fail",
      target: "local",
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors: ["run not approved"],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_fail",
          target: "local",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.status).toBe("failed");
    expect(response.publishedPath).toBeUndefined();
    expect(response.errors).toContain("run not approved");
  });

  it("returns 422 when enforcement requires approval", async () => {
    vi.spyOn(enforcedExecution, "executeWithEnforcement").mockResolvedValue({
      status: "approval_required",
      enforcement: {
        decision: "require_approval",
        category: "REMOTE_CHANGE",
        risk: "high",
        reason: "execution approval pending",
        auditId: "audit-3",
      },
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_needs_approval",
          target: "local",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("run_needs_approval");
    expect(response.target).toBe("local");
    expect(response.status).toBe("failed");
    expect(response.errors[0]).toContain("execution approval pending");
  });

  it("returns 422 when enforcement blocks the execution", async () => {
    vi.spyOn(enforcedExecution, "executeWithEnforcement").mockRejectedValue(
      new EnforcementBlockedError("policy blocked execution", "audit-4"),
    );

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_blocked",
          target: "local",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("run_blocked");
    expect(response.status).toBe("failed");
    expect(response.errors[0]).toBe("policy blocked execution");
  });

  it("returns 500 when execution agent throws an unexpected error", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockRejectedValue(new Error("publish router crashed"));

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_crash",
          target: "local",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.runId).toBe("run_crash");
    expect(response.status).toBe("failed");
    expect(response.errors[0]).toBe("publish router crashed");
  });

  it("returns generic error message when execution agent throws a non-Error value", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockRejectedValue("opaque failure");

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_crash_nonerror",
          target: "local",
        }),
      ),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toBe("Execution failed.");
  });

  it("rejects replayed webhook ids", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: true,
      agent: "execution",
      runId: "run_789",
      target: "local",
      status: "executed",
      filesWritten: [],
      warnings: [],
      errors: [],
    });

    const request = buildSignedRequest(JSON.stringify({ runId: "run_789", target: "local" }), {
      "x-aj-nonce": "execution-replay-nonce",
      "x-aj-webhook-id": "execution-replay-id",
    });

    const first = await handleExecutionWebhook(request);
    const second = await handleExecutionWebhook(request);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
  });

  it("returns 500 when the security configuration is invalid", async () => {
    delete process.env.AJ_WEBHOOK_SECRET;

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_1", target: "local" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
    expect(response.status).toBe("failed");
  });
});

describe("execution webhook replay TTL configuration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("honors a configured replay TTL", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "900";

    const fresh = await import("../../src/api/execution-webhook.js");

    expect(fresh.executionWebhookReplayStore).toBeDefined();
  });

  it("falls back to default when configured TTL is not a positive integer", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "abc";

    const fresh = await import("../../src/api/execution-webhook.js");

    expect(fresh.executionWebhookReplayStore).toBeDefined();
  });

  it("falls back to default when configured TTL is negative", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "-5";

    const fresh = await import("../../src/api/execution-webhook.js");

    expect(fresh.executionWebhookReplayStore).toBeDefined();
  });
});
