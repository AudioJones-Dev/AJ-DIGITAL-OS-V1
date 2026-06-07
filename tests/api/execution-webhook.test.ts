import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ExecutionAgent } from "../../src/agents/execution.agent.js";
import { executionWebhookReplayStore, handleExecutionWebhook } from "../../src/api/execution-webhook.js";

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

  it("returns internal verification failures without parsing the payload", async () => {
    const previousTtl = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "1";

    try {
      const response = await handleExecutionWebhook(
        buildSignedRequest(JSON.stringify({ runId: "run_123", target: "local" }), {
          "x-aj-nonce": "execution-config-error",
          "x-aj-webhook-id": "execution-config-error-wh",
        }),
      );

      expect(response.ok).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.runId).toBe("unknown");
    } finally {
      if (previousTtl === undefined) {
        delete process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;
      } else {
        process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = previousTtl;
      }
    }
  });

  it("rejects invalid JSON only after auth passes", async () => {
    const response = await handleExecutionWebhook(buildSignedRequest("{"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
    expect(response.errors).toEqual(["root: Invalid JSON payload."]);
  });

  it("preserves fallback run and target fields on validation failure", async () => {
    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_bad_target", target: "remote" }), {
        "x-aj-nonce": "execution-invalid-target",
        "x-aj-webhook-id": "execution-invalid-target-wh",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("run_bad_target");
    expect(response.target).toBe("remote");
    expect(response.errors.some((error) => error.includes("target"))).toBe(true);
  });

  it("uses unknown/local fallback fields for non-object payload validation failure", async () => {
    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify([]), {
        "x-aj-nonce": "execution-invalid-array",
        "x-aj-webhook-id": "execution-invalid-array-wh",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("unknown");
    expect(response.target).toBe("local");
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

  it("returns execution success without a published artifact and preserves source metadata", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: true,
      agent: "execution",
      runId: "run_no_publish",
      target: "local",
      status: "executed",
      filesWritten: [],
      warnings: [],
      errors: [],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(
        JSON.stringify({
          runId: "run_no_publish",
          target: "local",
          source: "system",
          actor: "operator_2",
        }),
        {
          "x-aj-nonce": "execution-no-publish-nonce",
          "x-aj-webhook-id": "execution-no-publish-wh",
        },
      ),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.source).toBe("system");
    expect(response.actor).toBe("operator_2");
    expect(response.publishedPath).toBeUndefined();
  });

  it("returns failed execution results without a published artifact", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: false,
      agent: "execution",
      runId: "run_failed",
      target: "local",
      status: "failed",
      filesWritten: [],
      warnings: ["manual review required"],
      errors: ["execution blocked"],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_failed", target: "local" }), {
        "x-aj-nonce": "execution-failed-nonce",
        "x-aj-webhook-id": "execution-failed-wh",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.status).toBe("failed");
    expect(response.warnings).toEqual(["manual review required"]);
    expect(response.errors).toEqual(["execution blocked"]);
  });

  it("returns failed execution results with a published artifact path", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: false,
      agent: "execution",
      runId: "run_failed_published",
      target: "local",
      status: "failed",
      publishedPath: "dist/published/partial.md",
      filesWritten: ["dist/published/partial.md"],
      warnings: [],
      errors: ["post-publish verification failed"],
    });

    const response = await handleExecutionWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_failed_published", target: "local" }), {
        "x-aj-nonce": "execution-failed-published-nonce",
        "x-aj-webhook-id": "execution-failed-published-wh",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.publishedPath).toBe("dist/published/partial.md");
    expect(response.errors).toEqual(["post-publish verification failed"]);
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
