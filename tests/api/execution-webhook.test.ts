import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { ExecutionAgent } from "../../src/agents/execution.agent.js";
import { handleExecutionWebhook } from "../../src/api/execution-webhook.js";

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
});
