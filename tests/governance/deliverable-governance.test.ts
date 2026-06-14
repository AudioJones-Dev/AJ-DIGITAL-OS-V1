import { describe, it, expect, beforeEach, vi } from "vitest";

import { clearPolicyCache } from "../../src/core/policy/policy-loader.js";
import * as auditLogger from "../../src/security/permissions/audit-logger.js";
import * as governanceEngine from "../../src/governance/governance-engine.js";
import { evaluateClaims, evaluateDeliverableClaims } from "../../src/governance/deliverable-governance.js";
import { PublisherAgent } from "../../src/agents/publisher.agent.js";
import { RunManager } from "../../src/core/run-manager.js";
import type { DeliverableRecord } from "../../src/types/deliverable.types.js";
import type { RunRecord } from "../../src/types/run.types.js";

function makeDeliverable(overrides: Partial<DeliverableRecord> = {}): DeliverableRecord {
  return {
    deliverableId: "d-1",
    clientId: "client-test",
    workflowId: "wf-1",
    taskType: "blog_generation",
    deliverableType: "blog_post",
    status: "draft",
    categoryId: "content",
    title: "Accessibility upgrade overview",
    summary: "A clear overview of home accessibility modifications.",
    outputPolicy: {
      draftsPath: "/tmp/aj-drafts",
      approvedPath: "/tmp/aj-approved",
      publishedPath: "/tmp/aj-published",
      publishTarget: "local",
    },
    outputFiles: [],
    approvalRequired: true,
    approvalPolicy: {
      approvalRequired: true,
      approvalMode: "manual_review_required",
      approverRoles: [],
      approverChannels: [],
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

let auditSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  clearPolicyCache();
  auditSpy = vi.spyOn(auditLogger, "logAgentActionAudit").mockResolvedValue(undefined);
});

describe("evaluateDeliverableClaims", () => {
  it("passes benign content and reports an 'allow' audit decision", async () => {
    const check = await evaluateDeliverableClaims(makeDeliverable(), {
      text: "A helpful overview of accessibility upgrades for safer homes.",
    });
    expect(check.blocked).toBe(false);
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy.mock.calls[0]?.[4]).toBe("allow"); // decision argument
  });

  it("blocks a deliverable that makes a prohibited 'guaranteed results' claim", async () => {
    const check = await evaluateDeliverableClaims(makeDeliverable(), {
      text: "Our program delivers guaranteed results for every client.",
    });
    expect(check.blocked).toBe(true);
    expect(check.reasons.some((r) => r.startsWith("legal:"))).toBe(true);
    expect(auditSpy.mock.calls[0]?.[4]).toBe("block");
  });

  it("blocks a body-level claim ('cure cancer'), not just the summary", async () => {
    const check = await evaluateDeliverableClaims(makeDeliverable(), {
      text: "Intro paragraph.\n\nThis remedy will cure cancer in weeks.",
    });
    expect(check.blocked).toBe(true);
  });

  it("does not block on non-legal content (claims gate is legal-only)", async () => {
    const check = await evaluateDeliverableClaims(makeDeliverable(), {
      text: "Totally normal marketing copy about our accessibility services.",
    });
    expect(check.blocked).toBe(false);
  });

  it("never throws when the audit ledger write fails", async () => {
    auditSpy.mockRejectedValueOnce(new Error("disk full"));
    await expect(
      evaluateDeliverableClaims(makeDeliverable(), { text: "guaranteed results" }),
    ).resolves.toMatchObject({ blocked: true });
  });
});

describe("evaluateClaims + publisher gate (real outbound content)", () => {
  it("fails open (no throw, evaluated=false) when governance cannot run", async () => {
    vi.spyOn(governanceEngine, "evaluateGovernance").mockImplementation(() => {
      throw new Error("policy missing");
    });
    const result = await evaluateClaims("guaranteed results", { id: "x", contentCategory: "blog_post" });
    expect(result.blocked).toBe(false);
    expect(result.evaluated).toBe(false);
  });

  it("PublisherAgent blocks a run whose body makes a prohibited claim", async () => {
    const run: RunRecord = {
      runId: "r1",
      workflowId: "w1",
      taskType: "blog_generation",
      clientId: "c1",
      status: "approved",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      revisionCount: 0,
      approvalRequired: true,
      approvalStatus: "approved",
      warnings: [],
      errors: [],
      workflowResult: {
        workflowId: "w1",
        taskType: "blog_generation",
        status: "draft_complete",
        summary: "A normal summary of the post.",
        assets: [{ type: "blog_draft", value: "Our program offers guaranteed results to all clients." }],
        warnings: [],
      },
    };
    const stubRunManager = { getRun: async () => run } as unknown as RunManager;
    const result = await new PublisherAgent(stubRunManager).publish({ runId: "r1" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.errors.some((e) => e.includes("claims_check"))).toBe(true);
  });
});
