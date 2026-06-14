import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  appendCostEvent,
  listCostEvents,
  resetCostLedger,
  summarizeByRun,
  summarizeByTenant,
} from "../../src/cost/cost-store.js";
import { recordModelSpend, checkCostCeiling } from "../../src/cost/cost-meter.js";
import { loadCostCeilingPolicy } from "../../src/cost/cost-policy.js";
import type { CostEvent } from "../../src/cost/cost-types.js";
import { resetMetrics, getMetricSnapshot } from "../../src/core/observability/metrics-store.js";
import { resetEventLedger, getEventsByRunId } from "../../src/core/events/event-ledger.js";
import { clearPolicyCache } from "../../src/core/policy/policy-loader.js";
import { routeModelTask } from "../../src/model-routing/model-router.js";
import { callPerplexity } from "../../src/model-routing/providers/perplexity-provider.js";

function seed(runId: string, costUsd: number): void {
  const event: CostEvent = {
    eventId: `e-${runId}-${costUsd}`,
    ts: "2025-01-01T00:00:00.000Z",
    source: "model",
    provider: "openai",
    model: "gpt-4o",
    runId,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 1000,
    costUsd,
  };
  appendCostEvent(event);
}

beforeEach(() => {
  resetCostLedger();
  resetMetrics();
  resetEventLedger();
  clearPolicyCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PERPLEXITY_API_KEY;
});

// ── Policy ─────────────────────────────────────────────────────────────────
describe("loadCostCeilingPolicy", () => {
  it("loads the committed cost-ceiling policy", () => {
    const policy = loadCostCeilingPolicy();
    expect(policy.perRunUsd.hard).toBe(5);
    expect(policy.perTenantUsd.hard).toBe(50);
    expect(policy.perRunUsd.softRatio).toBeGreaterThan(0);
  });
});

// ── Metering ─────────────────────────────────────────────────────────────────
describe("recordModelSpend", () => {
  it("computes USD, persists to ledger/metric/event, aggregates per run + tenant", () => {
    const event = recordModelSpend({
      provider: "openai",
      model: "gpt-4o",
      usage: { promptTokens: 600, completionTokens: 400, totalTokens: 1000 },
      runId: "r1",
      tenantId: "t1",
    });

    expect(event.totalTokens).toBe(1000);
    expect(event.costUsd).toBeCloseTo(0.005, 6); // 1000/1000 * 0.005

    expect(summarizeByRun("r1").totalUsd).toBeCloseTo(0.005, 6);
    expect(summarizeByTenant("t1").totalUsd).toBeCloseTo(0.005, 6);
    expect(getMetricSnapshot()["cost_usd_total"]).toBeCloseTo(0.005, 6);

    const events = getEventsByRunId("r1").filter((e) => e.eventType === "model_spend");
    expect(events.length).toBe(1);
    expect(events[0]?.category).toBe("tool");
  });
});

// ── Ceiling ─────────────────────────────────────────────────────────────────
describe("checkCostCeiling", () => {
  it("is a no-op (allow) when neither runId nor tenantId is supplied", () => {
    seed("r1", 100);
    expect(checkCostCeiling({}).decision).toBe("allow");
  });

  it("allows when under the per-run ceiling", () => {
    seed("r1", 1);
    expect(checkCostCeiling({ runId: "r1" }).decision).toBe("allow");
  });

  it("soft-warns at/above the soft threshold", () => {
    seed("r1", 4.5); // soft = 5 * 0.8 = 4.0
    const v = checkCostCeiling({ runId: "r1" });
    expect(v.decision).toBe("warn");
    expect(v.allowed).toBe(true);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it("hard-blocks at/above the per-run ceiling", () => {
    seed("r1", 5);
    const v = checkCostCeiling({ runId: "r1" });
    expect(v.decision).toBe("block");
    expect(v.allowed).toBe(false);
    expect(v.scope).toBe("run");
  });

  it("hard-blocks at/above the per-tenant ceiling", () => {
    seed("r1", 50);
    // same events carry tenantId? seed only sets runId; use a tenant-scoped seed
    appendCostEvent({
      eventId: "te1",
      ts: "2025-01-01T00:00:00.000Z",
      source: "model",
      provider: "openai",
      model: "gpt-4o",
      tenantId: "t-big",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 1000,
      costUsd: 50,
    });
    const v = checkCostCeiling({ tenantId: "t-big" });
    expect(v.decision).toBe("block");
    expect(v.scope).toBe("tenant");
  });
});

// ── Router enforcement ───────────────────────────────────────────────────────
describe("routeModelTask cost ceiling", () => {
  it("hard-stops a run that has already breached its ceiling, before dispatch", async () => {
    seed("r-block", 6); // > $5 per-run hard ceiling
    let executed = false;
    const result = await routeModelTask(
      { taskType: "transform", task: "hi", context: {}, runId: "r-block" },
      {
        deterministic: (ctx) => {
          executed = true;
          return ctx;
        },
      },
    );
    expect(result.ok).toBe(false);
    expect(result.decisionReason).toBe("cost-ceiling-exceeded");
    expect(executed).toBe(false); // never dispatched
  });

  it("does not gate an unscoped call (no runId/tenantId)", async () => {
    seed("r-block", 6);
    const result = await routeModelTask(
      { taskType: "transform", task: "hi", context: { v: 1 } },
      { deterministic: (ctx) => ctx },
    );
    expect(result.decisionReason).not.toBe("cost-ceiling-exceeded");
  });

  it("meters a scoped successful cloud call, but records nothing for unscoped calls", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({
          choices: [{ message: { content: "hi" } }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }),
      })),
    );

    // Scoped (runId) → spend metered to the cost ledger.
    await routeModelTask(
      { taskType: "research", task: "t", context: {}, runId: "r-meter" },
      { perplexity: { systemPrompt: "s", userMessage: "u" } },
    );
    const scoped = summarizeByRun("r-meter");
    expect(scoped.eventCount).toBe(1);
    expect(scoped.totalUsd).toBeGreaterThan(0);

    // Unscoped → no metering I/O (behaves exactly as before).
    resetCostLedger();
    await routeModelTask(
      { taskType: "research", task: "t", context: {} },
      { perplexity: { systemPrompt: "s", userMessage: "u" } },
    );
    expect(listCostEvents().length).toBe(0);
  });
});

// ── Provider usage capture ───────────────────────────────────────────────────
describe("provider usage capture", () => {
  it("callPerplexity surfaces the provider usage payload (no longer discarded)", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "hello" } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
        text: async () => "",
      })),
    );

    const result = await callPerplexity("research", "task", {}, { systemPrompt: "s", userMessage: "u" });
    expect(result.ok).toBe(true);
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
  });
});
