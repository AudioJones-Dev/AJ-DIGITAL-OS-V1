import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  buildActionPayload,
  isActionDisabledForState,
  isTerminalState,
  buildEnforcementSnapshot,
  clientControlRunAction,
  deriveAuditRow,
} from "../../dashboard/lib/control-client";
import type {
  ControlAction,
  ControlActionResult,
  ControlAuditEvent,
  RunControlState,
} from "../../dashboard/lib/types";

// ── buildActionPayload ────────────────────────────────────────────────

describe("buildActionPayload", () => {
  it("returns the brief's contract: action + actor + actorType", () => {
    expect(buildActionPayload({ action: "approve" })).toEqual({
      action: "approve",
      actor: "dashboard-user",
      actorType: "human",
    });
  });

  it("includes tenantId only when present and non-empty", () => {
    expect(buildActionPayload({ action: "cancel", tenantId: "t-42" })).toEqual({
      action: "cancel",
      actor: "dashboard-user",
      actorType: "human",
      tenantId: "t-42",
    });
    expect(buildActionPayload({ action: "cancel", tenantId: "" })).toEqual({
      action: "cancel",
      actor: "dashboard-user",
      actorType: "human",
    });
  });

  it("includes reason only when present and non-empty", () => {
    expect(buildActionPayload({ action: "reject", reason: "duplicate" })).toEqual({
      action: "reject",
      actor: "dashboard-user",
      actorType: "human",
      reason: "duplicate",
    });
  });

  it("respects custom actor and actorType", () => {
    expect(
      buildActionPayload({ action: "rerun", actor: "ops-bot", actorType: "system" }),
    ).toEqual({ action: "rerun", actor: "ops-bot", actorType: "system" });
  });
});

// ── isActionDisabledForState (terminal-state guards) ─────────────────

describe("isActionDisabledForState", () => {
  const ACTIONS: ControlAction[] = [
    "approve", "reject", "pause", "resume", "rerun", "escalate", "cancel",
  ];
  const TERMINAL: RunControlState[] = ["completed", "failed", "cancelled"];

  it("inspect is always allowed", () => {
    for (const s of TERMINAL) {
      expect(isActionDisabledForState("inspect", s)).toBe(false);
    }
    expect(isActionDisabledForState("inspect", "running")).toBe(false);
  });

  it("disables every destructive action when run is in a terminal state", () => {
    for (const action of ACTIONS) {
      for (const s of TERMINAL) {
        expect(isActionDisabledForState(action, s)).toBe(true);
      }
    }
  });

  it("enables actions in non-terminal states", () => {
    for (const action of ACTIONS) {
      expect(isActionDisabledForState(action, "running")).toBe(false);
      expect(isActionDisabledForState(action, "queued")).toBe(false);
      expect(isActionDisabledForState(action, "waiting_for_approval")).toBe(false);
    }
  });
});

describe("isTerminalState", () => {
  it.each(["completed", "failed", "cancelled"] as RunControlState[])(
    "%s is terminal",
    (s) => {
      expect(isTerminalState(s)).toBe(true);
    },
  );

  it.each(["queued", "running", "planning", "waiting_for_approval", "retrying", "escalated"] as RunControlState[])(
    "%s is not terminal",
    (s) => {
      expect(isTerminalState(s)).toBe(false);
    },
  );
});

// ── buildEnforcementSnapshot ─────────────────────────────────────────

describe("buildEnforcementSnapshot", () => {
  function audit(overrides: Partial<ControlAuditEvent> = {}): ControlAuditEvent {
    return {
      eventId: "evt-1",
      runId: "run-1",
      agentId: "agent-1",
      action: "approve",
      fromState: "queued",
      toState: "running",
      performedBy: "dashboard-user",
      timestamp: "2025-04-25T10:00:00Z",
      decision: "allow",
      risk: "medium",
      ...overrides,
    };
  }

  it("renders allow decision with full attribution", () => {
    const snap = buildEnforcementSnapshot("running", [audit()]);
    expect(snap.state).toBe("running");
    expect(snap.decision).toBe("allow");
    expect(snap.risk).toBe("medium");
    expect(snap.actor).toBe("dashboard-user");
    expect(snap.actorType).toBe("human");
    expect(snap.approvalRequired).toBe(false);
    expect(snap.hasTenantId).toBe(false);
  });

  it("renders block decision and surfaces the enforcement reason", () => {
    const snap = buildEnforcementSnapshot("queued", [
      audit({
        decision: "block",
        risk: "high",
        action: "cancel",
        enforcementResult: "tenantId required for high actions",
      }),
    ]);
    expect(snap.decision).toBe("block");
    expect(snap.risk).toBe("high");
    expect(snap.lastAction).toBe("cancel");
    expect(snap.blockedReason).toBe("tenantId required for high actions");
  });

  it("renders approval_required decision with approvalId", () => {
    const snap = buildEnforcementSnapshot("queued", [
      audit({
        decision: "approval_required",
        risk: "high",
        action: "rerun",
        approvalId: "appr-abc",
      }),
    ]);
    expect(snap.decision).toBe("approval_required");
    expect(snap.approvalRequired).toBe(true);
    expect(snap.approvalId).toBe("appr-abc");
  });

  it("falls back to action result when audit is empty", () => {
    const result: ControlActionResult = {
      ok: false,
      requiresApproval: true,
      approvalId: "appr-fresh",
    };
    const snap = buildEnforcementSnapshot("queued", [], result);
    expect(snap.decision).toBe("approval_required");
    expect(snap.approvalRequired).toBe(true);
    expect(snap.approvalId).toBe("appr-fresh");
  });

  it("marks tenant present when audit row carries tenantId", () => {
    const snap = buildEnforcementSnapshot("running", [audit({ tenantId: "tenant-7" })]);
    expect(snap.hasTenantId).toBe(true);
    expect(snap.tenantId).toBe("tenant-7");
  });

  it("infers actorType=system when performedBy is 'system'", () => {
    const snap = buildEnforcementSnapshot("running", [audit({ performedBy: "system" })]);
    expect(snap.actorType).toBe("system");
  });

  it("captures environment when supplied", () => {
    const snap = buildEnforcementSnapshot("running", [audit()], undefined, "staging");
    expect(snap.environment).toBe("staging");
  });
});

// ── deriveAuditRow (audit rendering inputs) ──────────────────────────

describe("deriveAuditRow", () => {
  it("renders all fields when present, prefers enforcementAuditId for the short id", () => {
    const row = deriveAuditRow({
      eventId: "evt-1234567890",
      runId: "run-1",
      agentId: "agent-1",
      action: "approve",
      fromState: "queued",
      toState: "running",
      performedBy: "alice",
      timestamp: "2025-04-25T10:00:00Z",
      decision: "allow",
      risk: "medium",
      tenantId: "tenant-7",
      enforcementAuditId: "enf-abcdefghij",
    });
    expect(row).toEqual({
      timestamp: "2025-04-25T10:00:00Z",
      action: "approve",
      decision: "allow",
      risk: "medium",
      actor: "alice",
      tenantDisplay: "tenant-7",
      auditIdShort: "enf-abcd…",
    });
  });

  it("renders em-dashes for missing decision/risk/tenant", () => {
    const row = deriveAuditRow({
      eventId: "short",
      runId: "run-1",
      agentId: "agent-1",
      action: "inspect",
      fromState: "running",
      toState: "running",
      performedBy: "system",
      timestamp: "2025-04-25T10:00:00Z",
    });
    expect(row.decision).toBe("—");
    expect(row.risk).toBe("—");
    expect(row.tenantDisplay).toBe("—");
    // No enforcementAuditId, falls back to eventId, no truncation when short
    expect(row.auditIdShort).toBe("short");
  });

  it("truncates long event ids and uses eventId when no enforcementAuditId", () => {
    const row = deriveAuditRow({
      eventId: "0123456789abcdef",
      runId: "run-1",
      agentId: "agent-1",
      action: "cancel",
      fromState: "running",
      toState: "cancelled",
      performedBy: "ops-bot",
      timestamp: "2025-04-25T10:00:00Z",
      decision: "block",
      risk: "high",
    });
    expect(row.auditIdShort).toBe("01234567…");
    expect(row.decision).toBe("block");
    expect(row.risk).toBe("high");
  });
});

// ── clientControlRunAction (network glue) ────────────────────────────

describe("clientControlRunAction", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs the buildActionPayload contract to /control/runs/:id/action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, success: true, newState: "running" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const payload = buildActionPayload({
      action: "approve",
      tenantId: "t-1",
      reason: "looks legit",
    });
    const result = await clientControlRunAction("run-xyz", payload, "http://api.local");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.local/control/runs/run-xyz/action");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      action: "approve",
      actor: "dashboard-user",
      actorType: "human",
      tenantId: "t-1",
      reason: "looks legit",
    });
    expect(result.ok).toBe(true);
    expect(result.newState).toBe("running");
  });

  it("surfaces backend error messages directly (no fake success)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        error: "Cannot transition from 'completed' to 'running' via 'resume'",
      }),
    }) as unknown as typeof globalThis.fetch;

    const result = await clientControlRunAction(
      "run-xyz",
      buildActionPayload({ action: "resume" }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot transition/);
  });

  it("returns approval_required without treating it as an error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        requiresApproval: true,
        approvalId: "appr-123",
      }),
    }) as unknown as typeof globalThis.fetch;

    const result = await clientControlRunAction(
      "run-xyz",
      buildActionPayload({ action: "rerun" }),
    );
    expect(result.requiresApproval).toBe(true);
    expect(result.approvalId).toBe("appr-123");
    // ok stays false because the action did not transition state — but UI must
    // render it as a pending-approval, not a failure.
    expect(result.error).toBeUndefined();
  });

  it("returns blocked decisions intact", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        blocked: true,
        error: "enforcement blocked: permission level too low",
      }),
    }) as unknown as typeof globalThis.fetch;

    const result = await clientControlRunAction(
      "run-xyz",
      buildActionPayload({ action: "cancel" }),
    );
    expect(result.blocked).toBe(true);
    expect(result.error).toMatch(/enforcement blocked/);
  });

  it("returns network failure as ok:false without throwing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    globalThis.fetch = globalThis.fetch as unknown as typeof globalThis.fetch;

    const result = await clientControlRunAction(
      "run-xyz",
      buildActionPayload({ action: "pause" }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/network down/);
  });
});
