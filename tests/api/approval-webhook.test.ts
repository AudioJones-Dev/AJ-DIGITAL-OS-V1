import { createHmac } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { approvalWebhookReplayStore, handleApprovalWebhook } from "../../src/api/approval-webhook.js";
import { RunManager } from "../../src/core/run-manager.js";

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
  const createdRunIds: string[] = [];

  afterEach(async () => {
    approvalWebhookReplayStore.clear();
    await Promise.all(
      createdRunIds.map((runId) => rm(path.resolve("data", "runs", `${runId}.json`), { force: true })),
    );
    createdRunIds.length = 0;
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

  it("returns internal verification failures without parsing the payload", async () => {
    const previousTtl = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;
    process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "1";

    try {
      const response = await handleApprovalWebhook(
        buildSignedRequest(JSON.stringify({ runId: "run_1", decision: "approve" }), {
          "x-aj-nonce": "approval-config-error",
          "x-aj-webhook-id": "approval-config-error-wh",
        }),
      );

      expect(response.ok).toBe(false);
      expect(response.statusCode).toBe(500);
    } finally {
      if (previousTtl === undefined) {
        delete process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;
      } else {
        process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = previousTtl;
      }
    }
  });

  it("rejects invalid JSON only after auth passes", async () => {
    const response = await handleApprovalWebhook(buildSignedRequest("{"));

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.errors).toEqual(["root: Invalid JSON payload."]);
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

  it("approves a pending run and requests execution resume", async () => {
    const manager = new RunManager();
    const run = await manager.createRun({
      workflowId: "approval-webhook",
      taskType: "approval_resolution",
      clientId: "client_alpha",
    });
    createdRunIds.push(run.runId);
    await manager.updateStatus(run.runId, "context_loaded");
    await manager.updateStatus(run.runId, "in_progress");
    await manager.updateStatus(run.runId, "draft_complete");
    await manager.updateStatus(run.runId, "validation_passed");
    await manager.markPendingApproval(run.runId);

    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: run.runId, decision: "approve", actor: "operator_1" }), {
        "x-aj-nonce": "approval-success-nonce",
        "x-aj-webhook-id": "approval-success-wh",
      }),
    );

    expect(response.ok).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.runId).toBe(run.runId);
    expect(response.status).toBe("approved");
    expect(response.nextAction).toBe("resume_execution");
  });

  it("handles valid payloads without optional actor and source fields", async () => {
    const response = await handleApprovalWebhook(
      buildSignedRequest(JSON.stringify({ runId: "run_missing_without_actor", decision: "reject" }), {
        "x-aj-nonce": "approval-nonce-no-actor",
        "x-aj-webhook-id": "approval-wh-no-actor",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.statusCode).toBe(422);
    expect(response.runId).toBe("run_missing_without_actor");
  });
});
