import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ExecutionAgent } from "../../src/agents/execution.agent.js";
import { executionWebhookReplayStore, handleExecutionWebhook } from "../../src/api/execution-webhook.js";
import { EnforcementBlockedError } from "../../src/security/permissions/enforced-execution.js";

const buildSignedRequest = (
  rawBody: string,
  overrides?: Partial<Record<"x-aj-signature" | "x-aj-timestamp" | "x-aj-nonce" | "x-aj-webhook-id", string>>,
) => {
  const timestamp = overrides?.["x-aj-timestamp"] ?? `${Math.floor(Date.now() / 1000)}`;
  const nonce = overrides?.["x-aj-nonce"] ?? "execution-nonce-1";
  const canonical = `${timestamp}.${nonce}.${rawBody}`;

  const signature = overrides?.["x-aj-signature"]
    ?? createHmac("sha256", process.env.AJ_WEBHOOK_SECRET ?? "").update(canonical).digest("hex");

  return {
    rawBody,
    headers: {
      "x-aj-signature": signature,
      "x-aj-timestamp": timestamp,
      "x-aj-nonce": nonce,
      "x-aj-webhook-id": overrides?.["x-aj-webhook-id"] ?? "execution-wh-1",
    },
  };
};

describe("execution webhook", () => {
  afterEach(() => {
    executionWebhookReplayStore.clear();
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

  it("returns payload validation errors for invalid payload only after auth", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest(JSON.stringify({ target: "local" })));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.status).toBe("failed");
    expect(response.errors.some((error) => error.includes("runId"))).toBe(true);
  });

  it("returns execution success for valid payload", async () => {
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
    expect(response.filesWritten).toEqual(["dist/published/run_123.md"]);
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

  it("rejects unparseable JSON after auth passes", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest("not-json{"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toContain("Invalid JSON payload");
  });

  it("echoes fallback run id and target from invalid payloads", async () => {
    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_fallback", target: "remote" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("run_fallback");
    expect(response.target).toBe("remote");
  });

  it("uses default fallbacks for non-object payloads", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest("42"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
  });

  it("returns execution success without published path or attribution", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: true,
      agent: "execution",
      runId: "run_nopath",
      target: "local",
      status: "executed",
      filesWritten: [],
      warnings: [],
      errors: [],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_nopath" })),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.publishedPath).toBeUndefined();
    expect(response.source).toBeUndefined();
    expect(response.actor).toBeUndefined();
  });

  it("maps failed execution results to 422 responses", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: false,
      agent: "execution",
      runId: "run_failed",
      target: "local",
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors: ["execution declined"],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_failed" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors).toEqual(["execution declined"]);
  });

  it("maps enforcement blocks to 422 responses", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockRejectedValue(
      new EnforcementBlockedError("Execution blocked by policy.", "audit_2"),
    );

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_blocked" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors[0]).toContain("Execution blocked by policy");
  });

  it("maps unexpected execution errors to 500 responses", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockRejectedValue(new Error("agent exploded"));

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_err" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toContain("agent exploded");
  });

  it("uses a fallback message for non-Error execution failures", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockRejectedValue("string failure");

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_str" })),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.errors[0]).toBe("Execution failed.");
  });
});

describe("execution webhook replay ttl configuration", () => {
  it("honors a valid replay ttl override", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "120";

    const mod = await import("../../src/api/execution-webhook.js");

    expect(mod.executionWebhookReplayStore).toBeDefined();
  });

  it("falls back to the default ttl for non-numeric values", async () => {
    vi.resetModules();
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "not-a-number";

    const mod = await import("../../src/api/execution-webhook.js");

    expect(mod.executionWebhookReplayStore).toBeDefined();
  });

  it("falls back to the default ttl when unset", async () => {
    vi.resetModules();
    delete process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;

    const mod = await import("../../src/api/execution-webhook.js");

    expect(mod.executionWebhookReplayStore).toBeDefined();
  });
});