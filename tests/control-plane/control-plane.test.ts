import { describe, it, expect } from "vitest";
import { isValidTransition, VALID_TRANSITIONS, APPROVAL_REQUIRED_ACTIONS } from "../../src/control-plane/run-registry/run-control-types.js";
import { createControlRun, getControlRun, updateControlState, listControlRuns } from "../../src/control-plane/run-registry/run-control-store.js";
import { executeControlAction } from "../../src/control-plane/run-registry/control-actions.js";
import { logAuditEvent, getAuditEvents } from "../../src/control-plane/run-registry/run-audit-log.js";
import { evaluateMAP, filterMAPCompliant, getMAPStats } from "../../src/attribution/map-validator.js";

describe("isValidTransition", () => {
  it("allows queued → planning", () => expect(isValidTransition("queued", "planning")).toBe(true));
  it("allows running → completed", () => expect(isValidTransition("running", "completed")).toBe(true));
  it("allows failed → queued (rerun path)", () => expect(isValidTransition("failed", "queued")).toBe(true));
  it("blocks completed → running (terminal)", () => expect(isValidTransition("completed", "running")).toBe(false));
  it("blocks cancelled → running (terminal)", () => expect(isValidTransition("cancelled", "running")).toBe(false));
});

describe("RunControlStore", () => {
  it("creates and retrieves a run", () => {
    const run = createControlRun("run-test-1", "agent-1");
    expect(run.runId).toBe("run-test-1");
    expect(run.controlState).toBe("queued");
    expect(getControlRun("run-test-1")).toBeDefined();
  });
  it("updates state with valid transition", () => {
    const run = createControlRun("run-test-2", "agent-1");
    const updated = updateControlState("run-test-2", "planning");
    expect(updated.controlState).toBe("planning");
    expect(updated.previousState).toBe("queued");
  });
  it("lists runs with filter", () => {
    createControlRun("run-test-3", "agent-2");
    const list = listControlRuns({ agentId: "agent-2" });
    expect(list.some((r) => r.runId === "run-test-3")).toBe(true);
  });
});

describe("ControlActions", () => {
  it("approve transitions waiting_for_approval → running", async () => {
    createControlRun("run-approve-1", "agent-1");
    updateControlState("run-approve-1", "planning");
    updateControlState("run-approve-1", "waiting_for_approval");
    const result = await executeControlAction("run-approve-1", "approve", "system");
    expect(result.success).toBe(true);
    expect(result.newState).toBe("running");
  });
  it("rerun requires approval when not system", async () => {
    createControlRun("run-rerun-1", "agent-1");
    updateControlState("run-rerun-1", "planning");
    updateControlState("run-rerun-1", "failed");
    const result = await executeControlAction("run-rerun-1", "rerun", "cli-user");
    expect(result.requiresApproval).toBe(true);
  });
  it("inspect does not change state", async () => {
    createControlRun("run-inspect-1", "agent-1");
    const result = await executeControlAction("run-inspect-1", "inspect", "system");
    expect(result.success).toBe(true);
    expect(getControlRun("run-inspect-1")?.controlState).toBe("queued");
  });
});

describe("AuditLog", () => {
  it("logs and retrieves events by runId", () => {
    logAuditEvent({ runId: "run-audit-1", agentId: "agent-1", action: "inspect", fromState: "queued", toState: "queued", performedBy: "system" });
    const events = getAuditEvents("run-audit-1");
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.eventId).toBeDefined();
  });
});

describe("MAP Validator", () => {
  it("returns compliant for fully qualifying event", () => {
    const score = evaluateMAP({ eventType: "content_published", channel: "seo", contentType: "blog-post", contentId: "123" });
    expect(score.mapCompliant).toBe(true);
  });
  it("returns non-compliant when channel is unknown", () => {
    const score = evaluateMAP({ eventType: "content_published", channel: "unknown", contentType: "blog-post", contentId: "123" });
    expect(score.meaningful).toBe(false);
    expect(score.mapCompliant).toBe(false);
  });
  it("returns non-compliant when no contentType or contentId", () => {
    const score = evaluateMAP({ eventType: "content_published", channel: "seo" });
    expect(score.actionable).toBe(false);
  });
  it("returns non-compliant when channel not profitable", () => {
    const score = evaluateMAP({ eventType: "content_published", channel: "social", contentType: "post", contentId: "1" });
    expect(score.profitable).toBe(false);
  });
  it("getMAPStats computes correct complianceRate", () => {
    const events = [
      { mapScore: { mapCompliant: true, meaningful: true, actionable: true, profitable: true } },
      { mapScore: { mapCompliant: false, meaningful: false, actionable: true, profitable: true } },
    ] as any;
    const stats = getMAPStats(events);
    expect(stats.compliant).toBe(1);
    expect(stats.nonCompliant).toBe(1);
    expect(stats.complianceRate).toBe(0.5);
  });
});
