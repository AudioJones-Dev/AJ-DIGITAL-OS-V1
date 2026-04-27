import { describe, it, expect, vi } from "vitest";

import { runDiagnosis } from "../../src/apps/diagnostic-engine/index.js";
import * as retrievalSearch from "../../src/retrieval/retrieval-search.js";
import * as attributionTracker from "../../src/attribution/attribution-tracker.js";

describe("Diagnostic Engine", () => {
  // 1. runs diagnosis and returns recommendations
  it("runs diagnosis and returns recommendations", async () => {
    const result = await runDiagnosis({
      description: "Lead conversion is slow due to manual follow-up",
      category: "lead_gen",
      proposedActions: ["automate follow-up", "shorten lead form"],
      createdBy: "diag-test",
    });
    expect(result.ok).toBe(true);
    expect(result.recommendations.length).toBe(2);
    expect(result.recommendations[0]?.action).toBe("automate follow-up");
    expect(result.recommendations[0]?.priority).toBeDefined();
  });

  // 2. retrieval search is called with correct namespaces
  it("retrieval search is called with correct namespaces", async () => {
    const spy = vi.spyOn(retrievalSearch, "searchRetrieval").mockResolvedValue({
      ok: true,
      results: [],
      retrievalTraceId: "trace-mock",
      policyMeta: {
        approved: true,
        warnings: [],
        restrictedNamespacesUsed: [],
        staleDocumentIds: [],
      },
    });

    await runDiagnosis({
      description: "Need diagnosis",
      category: "operations",
      createdBy: "diag-test",
    });

    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0]![0];
    expect(arg.namespaces).toContain("system_docs");
    expect(arg.namespaces).toContain("workflow_docs");
    spy.mockRestore();
  });

  // 3. returns empty constraints for clean input
  it("returns empty constraints for clean input", async () => {
    const result = await runDiagnosis({
      description: "Routine review of established workflow.",
      category: "general",
      createdBy: "diag-test",
    });
    expect(result.ok).toBe(true);
    expect(result.constraints).toEqual([]);
  });

  // 4. attribution emits after diagnosis (no throw)
  it("attribution emits after diagnosis (no throw)", async () => {
    const spy = vi.spyOn(attributionTracker, "emitEvent").mockResolvedValue({
      eventId: "x",
      eventType: "diagnostic_run",
      runId: "r",
      agentId: "diagnostic-engine",
      channel: "unknown",
      timestamp: new Date().toISOString(),
    });

    const result = await runDiagnosis({
      description: "Conversion rate has dropped recently",
      category: "conversion",
      createdBy: "diag-test",
    });
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // 5. result includes retrievalTraceId when retrieval runs
  it("result includes retrievalTraceId when retrieval runs", async () => {
    const spy = vi.spyOn(retrievalSearch, "searchRetrieval").mockResolvedValue({
      ok: true,
      results: [],
      retrievalTraceId: "trace-injected",
      policyMeta: {
        approved: true,
        warnings: [],
        restrictedNamespacesUsed: [],
        staleDocumentIds: [],
      },
    });

    const result = await runDiagnosis({
      description: "trace test",
      category: "content",
      createdBy: "diag-test",
    });
    expect(result.retrievalTraceId).toBe("trace-injected");
    spy.mockRestore();
  });

  // 6. handles empty keyword list gracefully
  it("handles empty keyword list gracefully", async () => {
    const result = await runDiagnosis({
      description: "audit needed",
      category: "offer",
      keywords: [],
      proposedActions: [],
      createdBy: "diag-test",
    });
    expect(result.ok).toBe(true);
    expect(result.recommendations).toEqual([]);
  });
});
