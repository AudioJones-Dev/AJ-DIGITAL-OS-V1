import { describe, expect, it, vi } from "vitest";

import { ExecutionAgent } from "../../src/agents/execution.agent.js";
import { handleExecutionWebhook } from "../../src/api/execution-webhook.js";

describe("execution webhook", () => {
  it("returns validation errors for invalid payload", async () => {
    const response = await handleExecutionWebhook({
      target: "local",
    });

    expect(response.ok).toBe(false);
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

    const response = await handleExecutionWebhook({
      runId: "run_123",
      target: "local",
      source: "manual",
      actor: "operator_1",
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("executed");
    expect(response.runId).toBe("run_123");
    expect(response.filesWritten).toEqual(["dist/published/run_123.md"]);
  });

  it("returns execution failure details when downstream execution fails", async () => {
    vi.spyOn(ExecutionAgent.prototype, "execute").mockResolvedValue({
      ok: false,
      agent: "execution",
      runId: "run_456",
      target: "local",
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors: ["publish failed"],
    });

    const response = await handleExecutionWebhook({
      runId: "run_456",
      target: "local",
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe("failed");
    expect(response.errors).toEqual(["publish failed"]);
  });
});
