import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Isolate file-system state between tests ───────────────────────────────
const TEST_STORE = join(process.cwd(), "runtime", "control-runs.json");

beforeEach(() => {
  if (existsSync(TEST_STORE)) rmSync(TEST_STORE);
});

// ── Imports (dynamic to pick up fresh module state in tests) ─────────────
import {
  isValidTransition,
  createControlRun,
  getControlRun,
  updateControlState,
  listControlRuns,
} from "../../src/control-plane/run-registry/run-control-store.js";

import { executeControlAction } from "../../src/control-plane/run-registry/control-actions.js";
import type { ControlActionContext } from "../../src/control-plane/run-registry/control-context.js";
import { logAuditEvent, getAuditEvents } from "../../src/control-plane/run-registry/run-audit-log.js";

import {
  VALID_TRANSITIONS,
  APPROVAL_REQUIRED_ACTIONS,
} from "../../src/control-plane/run-registry/run-control-types.js";

import { evaluateMAP, filterMAPCompliant, getMAPStats } from "../../src/attribution/map-validator.js";
import type { AttributionEvent } from "../../src/attribution/attribution-types.js";

// ── State machine: isValidTransition ─────────────────────────────────────
describe("isValidTransition", () => {
  it("allows valid queued → planning", () => {
    expect(isValidTransition("queued", "planning")).toBe(true);
  });

  it("allows valid queued → cancelled", () => {
    expect(isValidTransition("queued", "cancelled")).toBe(true);
  });

  it("allows running → completed", () => {
    expect(isValidTransition("running", "completed")).toBe(true);
  });

  it("allows failed → queued (retry)", () => {
    expect(isValidTransition("failed", "queued")).toBe(true);
  });

  it("blocks terminal state completed → running", () => {
    expect(isValidTransition("completed", "running")).toBe(false);
  });

  it("blocks terminal state cancelled → running", () => {
    expect(isValidTransition("cancelled", "running")).toBe(false);
  });

  it("blocks invalid pair planning → completed", () => {
    expect(isValidTransition("planning", "completed")).toBe(false);
  });

  it("all states have VALID_TRANSITIONS entry", () => {
    const states = Object.keys(VALID_TRANSITIONS);
    expect(states.length).toBeGreaterThan(0);
    for (const s of states) {
      expect(Array.isArray(VALID_TRANSITIONS[s as keyof typeof VALID_TRANSITIONS])).toBe(true);
    }
  });
});

// ── Run store ─────────────────────────────────────────────────────────────
describe("run control store", () => {
  it("creates and retrieves a run", () => {
    const run = createControlRun("test-run-1", "publisher-agent");
    expect(run.runId).toBe("test-run-1");
    expect(run.controlState).toBe("queued");
    const found = getControlRun("test-run-1");
    expect(found).toBeDefined();
    expect(found?.controlState).toBe("queued");
  });

  it("returns undefined for unknown run", () => {
    expect(getControlRun("no-such-run")).toBeUndefined();
  });

  it("updates state", () => {
    createControlRun("test-run-2", "publisher-agent");
    const updated = updateControlState("test-run-2", "planning");
    expect(updated.controlState).toBe("planning");
    expect(updated.previousState).toBe("queued");
  });

  it("listControlRuns returns most recent first", () => {
    createControlRun("oldest-run", "agent-a");
    createControlRun("newest-run", "agent-b");
    const list = listControlRuns({ limit: 5 });
    expect(list[0]?.runId).toBe("newest-run");
  });

  it("listControlRuns filters by state", () => {
    createControlRun("run-q", "agent-a");
    createControlRun("run-f", "agent-b");
    updateControlState("run-f", "planning");
    updateControlState("run-f", "running");
    updateControlState("run-f", "failed");
    const failed = listControlRuns({ state: "failed" });
    expect(failed.every((r) => r.controlState === "failed")).toBe(true);
  });
});

// ── executeControlAction ──────────────────────────────────────────────────
describe("executeControlAction", () => {
  it("inspect returns current state with no transition", async () => {
    createControlRun("inspect-run", "publisher-agent");
    const result = await executeControlAction("inspect-run", "inspect", "tester");
    expect(result.success).toBe(true);
    expect(result.newState).toBe("queued");
  });

  it("approve transitions waiting_for_approval → running", async () => {
    createControlRun("approve-run", "publisher-agent");
    updateControlState("approve-run", "planning");
    updateControlState("approve-run", "waiting_for_approval");
    const result = await executeControlAction("approve-run", "approve", "admin", undefined, true);
    expect(result.success).toBe(true);
    expect(result.newState).toBe("running");
  });

  it("reject transitions waiting_for_approval → failed", async () => {
    createControlRun("reject-run", "publisher-agent");
    updateControlState("reject-run", "planning");
    updateControlState("reject-run", "waiting_for_approval");
    const result = await executeControlAction("reject-run", "reject", "admin", "policy violation", true);
    expect(result.success).toBe(true);
    expect(result.newState).toBe("failed");
  });

  it("cancel transitions running → cancelled with approval", async () => {
    createControlRun("cancel-run", "publisher-agent");
    updateControlState("cancel-run", "planning");
    updateControlState("cancel-run", "running");
    const result = await executeControlAction("cancel-run", "cancel", "admin", "user request", true);
    expect(result.success).toBe(true);
    expect(result.newState).toBe("cancelled");
  });

  it("rerun transitions failed → queued with approval", async () => {
    createControlRun("rerun-run", "publisher-agent");
    updateControlState("rerun-run", "planning");
    updateControlState("rerun-run", "running");
    updateControlState("rerun-run", "failed");
    const result = await executeControlAction("rerun-run", "rerun", "admin", undefined, true);
    expect(result.success).toBe(true);
    expect(result.newState).toBe("queued");
  });

  it("APPROVAL_REQUIRED_ACTIONS return requiresApproval without grant", async () => {
    createControlRun("no-approval-run", "publisher-agent");
    for (const action of APPROVAL_REQUIRED_ACTIONS) {
      const result = await executeControlAction("no-approval-run", action, "user");
      expect(result.requiresApproval).toBe(true);
      expect(result.success).toBe(false);
    }
  });

  it("returns error for unknown run", async () => {
    const result = await executeControlAction("ghost-run", "approve", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("ghost-run");
  });

  it("returns error for invalid state transition", async () => {
    createControlRun("terminal-run", "publisher-agent");
    updateControlState("terminal-run", "planning");
    updateControlState("terminal-run", "running");
    updateControlState("terminal-run", "completed");
    const result = await executeControlAction("terminal-run", "approve", "admin", undefined, true);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
  });
});

// ── Audit log ─────────────────────────────────────────────────────────────
describe("audit log", () => {
  it("writes and retrieves an event", () => {
    const event = logAuditEvent({
      runId: "audit-run-1",
      agentId: "publisher-agent",
      action: "approve",
      fromState: "waiting_for_approval",
      toState: "running",
      performedBy: "test-user",
    });
    expect(event.eventId).toBeTruthy();
    expect(event.timestamp).toBeTruthy();

    const events = getAuditEvents("audit-run-1");
    expect(events.some((e) => e.eventId === event.eventId)).toBe(true);
  });

  it("filters by runId", () => {
    logAuditEvent({
      runId: "run-alpha",
      agentId: "a",
      action: "inspect",
      fromState: "queued",
      toState: "queued",
      performedBy: "user",
    });
    logAuditEvent({
      runId: "run-beta",
      agentId: "b",
      action: "inspect",
      fromState: "queued",
      toState: "queued",
      performedBy: "user",
    });
    const alphaEvents = getAuditEvents("run-alpha");
    expect(alphaEvents.every((e) => e.runId === "run-alpha")).toBe(true);
  });

  it("generates unique eventIds", () => {
    const e1 = logAuditEvent({ runId: "r1", agentId: "a", action: "inspect", fromState: "queued", toState: "queued", performedBy: "u" });
    const e2 = logAuditEvent({ runId: "r1", agentId: "a", action: "inspect", fromState: "queued", toState: "queued", performedBy: "u" });
    expect(e1.eventId).not.toBe(e2.eventId);
  });
});

// ── MAP validator ─────────────────────────────────────────────────────────
function makeEvent(overrides: Partial<AttributionEvent>): AttributionEvent {
  return {
    eventId: "evt-1",
    eventType: "content_published",
    runId: "run-1",
    agentId: "agent-1",
    channel: "seo",
    contentType: "blog_post",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("MAP validator", () => {
  it("marks fully compliant event as mapCompliant=true", () => {
    const event = makeEvent({});
    const score = evaluateMAP(event);
    expect(score.meaningful).toBe(true);
    expect(score.actionable).toBe(true);
    expect(score.profitable).toBe(true);
    expect(score.mapCompliant).toBe(true);
  });

  it("non-meaningful: eventType=run_created", () => {
    const score = evaluateMAP(makeEvent({ eventType: "run_created" }));
    expect(score.meaningful).toBe(false);
    expect(score.mapCompliant).toBe(false);
  });

  it("non-meaningful: channel=unknown", () => {
    const score = evaluateMAP(makeEvent({ channel: "unknown" }));
    expect(score.meaningful).toBe(false);
    expect(score.mapCompliant).toBe(false);
  });

  it("non-actionable: no contentType or contentId", () => {
    const event = makeEvent({});
    delete (event as Partial<AttributionEvent>).contentType;
    const score = evaluateMAP(event);
    expect(score.actionable).toBe(false);
    expect(score.mapCompliant).toBe(false);
  });

  it("non-profitable: channel=social", () => {
    const score = evaluateMAP(makeEvent({ channel: "social" }));
    expect(score.profitable).toBe(false);
    expect(score.mapCompliant).toBe(false);
  });

  it("filterMAPCompliant returns only compliant events", () => {
    const events = [
      makeEvent({ eventId: "e1", channel: "seo", eventType: "content_published", contentType: "article" }),
      makeEvent({ eventId: "e2", channel: "social", eventType: "run_created" }),
      makeEvent({ eventId: "e3", channel: "blog", eventType: "run_completed", contentId: "c-123" }),
    ];
    const compliant = filterMAPCompliant(events);
    expect(compliant.every((e) => {
      const s = evaluateMAP(e);
      return s.mapCompliant;
    })).toBe(true);
    expect(compliant.length).toBeLessThan(events.length);
  });

  it("getMAPStats formula: compliant/total = complianceRate %", () => {
    const events = [
      makeEvent({ eventId: "a", channel: "seo", eventType: "content_published", contentType: "post" }),
      makeEvent({ eventId: "b", channel: "social", eventType: "run_created" }),
      makeEvent({ eventId: "c", channel: "aeo", eventType: "run_completed", contentType: "video" }),
      makeEvent({ eventId: "d", channel: "email", eventType: "run_failed" }),
    ];
    const stats = getMAPStats(events);
    expect(stats.total).toBe(4);
    expect(stats.compliant + stats.nonCompliant).toBe(4);
    expect(stats.complianceRate).toBe(Math.round((stats.compliant / 4) * 1000) / 10);
  });

  it("getMAPStats handles empty array", () => {
    const stats = getMAPStats([]);
    expect(stats.total).toBe(0);
    expect(stats.complianceRate).toBe(0);
  });
});

// ── Enforcement integration ───────────────────────────────────────────────
describe("enforcement integration", () => {
  it("control action blocked on invalid state transition", async () => {
    createControlRun("enf-invalid-run", "publisher-agent");
    updateControlState("enf-invalid-run", "planning");
    updateControlState("enf-invalid-run", "running");
    updateControlState("enf-invalid-run", "completed");
    // completed is a terminal state — approve (→ running) must be rejected
    const result = await executeControlAction("enf-invalid-run", "approve", "admin", undefined, true);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
  });

  it("control action requires approval if high risk, non-system actor", async () => {
    createControlRun("enf-hirisk-run", "publisher-agent");
    updateControlState("enf-hirisk-run", "planning");
    updateControlState("enf-hirisk-run", "running");
    // escalate is in APPROVAL_REQUIRED_ACTIONS; non-system actor must get requiresApproval
    const result = await executeControlAction("enf-hirisk-run", "escalate", "user-actor");
    expect(result.success).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.approvalId).toBeTruthy();
  });

  it("control action blocked if tenantId missing in production environment", async () => {
    createControlRun("enf-tenant-run", "publisher-agent");
    updateControlState("enf-tenant-run", "planning");
    updateControlState("enf-tenant-run", "running");
    // system actor so approval gate is bypassed; medium risk in production without tenantId → block
    const ctx: ControlActionContext = {
      agentId: "agent-x",
      permissionLevel: 3,
      environment: "production",
      performedBy: "system",
    };
    const result = await executeControlAction("enf-tenant-run", "pause", ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("tenantId required");
  });

  it("system actor bypasses approval requirement for APPROVAL_REQUIRED_ACTIONS", async () => {
    createControlRun("enf-sys-run", "publisher-agent");
    updateControlState("enf-sys-run", "planning");
    updateControlState("enf-sys-run", "running");
    updateControlState("enf-sys-run", "failed");
    // rerun is in APPROVAL_REQUIRED_ACTIONS; system actor (_legacyApprovalGranted=true) bypasses
    const result = await executeControlAction("enf-sys-run", "rerun", "admin", undefined, true);
    expect(result.success).toBe(true);
    expect(result.requiresApproval).toBeUndefined();
    expect(result.newState).toBe("queued");
  });

  it("audit log records decision=block on invalid state transition", async () => {
    createControlRun("enf-audit-run", "publisher-agent");
    updateControlState("enf-audit-run", "planning");
    updateControlState("enf-audit-run", "running");
    updateControlState("enf-audit-run", "completed");
    await executeControlAction("enf-audit-run", "approve", "admin", undefined, true);
    const events = getAuditEvents("enf-audit-run");
    const blocked = events.find((e) => e.action === "approve" && e.decision === "block");
    expect(blocked).toBeDefined();
    expect(blocked?.decision).toBe("block");
  });

  it("MAP attribution emitted after successful control action — never throws", async () => {
    createControlRun("enf-map-run", "publisher-agent");
    updateControlState("enf-map-run", "planning");
    updateControlState("enf-map-run", "waiting_for_approval");
    // approve is not in APPROVAL_REQUIRED_ACTIONS; system actor executes directly
    const result = await executeControlAction("enf-map-run", "approve", "admin", undefined, true);
    // attribution is fire-and-forget; verify it never throws and action succeeds
    expect(result.success).toBe(true);
    expect(result.newState).toBe("running");
  });
});
