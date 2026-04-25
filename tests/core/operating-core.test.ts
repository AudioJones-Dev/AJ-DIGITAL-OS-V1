import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  validateStateTransition,
  transitionRunState,
  getAllowedTransitions,
  isTerminalState,
  deriveRunStatus,
} from "../../src/core/state/run-state-machine.js";
import {
  evaluateActionRisk,
  evaluateTenantBoundary,
  evaluateApprovalRequirement,
} from "../../src/core/policy/policy-engine.js";
import { clearPolicyCache } from "../../src/core/policy/policy-loader.js";
import {
  appendSystemEvent,
  listSystemEvents,
  getEventsByRunId,
  getEventsByTenantId,
  resetEventLedger,
} from "../../src/core/events/event-ledger.js";
import { replayRunEvents } from "../../src/core/events/event-replay.js";
import {
  validateSchema,
  listSchemas,
  getSchemaVersion,
  exportJsonSchema,
} from "../../src/core/schemas/schema-registry.js";
import {
  checkIdempotency,
  recordCommandStart,
  recordCommandSuccess,
  resetIdempotencyStore,
  purgeExpiredIdempotencyRecords,
} from "../../src/core/idempotency/idempotency-store.js";
import {
  createIdempotencyKey,
  hashCommand,
} from "../../src/core/idempotency/idempotency-utils.js";
import {
  incrementMetric,
  getMetricSnapshot,
  resetMetrics,
} from "../../src/core/observability/metrics-store.js";
import { buildCommandEnvelope } from "../../src/core/commands/command-envelope.js";
import { executeCommand } from "../../src/core/commands/command-executor.js";

const ORIGINAL_CWD = process.cwd();
let sandboxDir: string;

function copyPoliciesInto(targetRuntime: string): void {
  const policiesDir = join(targetRuntime, "policies");
  mkdirSync(policiesDir, { recursive: true });
  const sourceDir = join(ORIGINAL_CWD, "runtime", "policies");
  for (const name of [
    "action-risk.policy.json",
    "tenant-boundary.policy.json",
    "environment.policy.json",
    "approval-gates.policy.json",
    "cache-access.policy.json",
    "retrieval-access.policy.json",
  ]) {
    const src = join(sourceDir, name);
    if (existsSync(src)) {
      writeFileSync(join(policiesDir, name), require("node:fs").readFileSync(src, "utf-8"));
    }
  }
}

beforeEach(() => {
  // Each test gets an isolated cwd so the file-backed stores don't bleed.
  sandboxDir = mkdtempSync(join(tmpdir(), "op-core-"));
  const runtimeDir = join(sandboxDir, "runtime");
  mkdirSync(runtimeDir, { recursive: true });
  copyPoliciesInto(runtimeDir);
  vi.spyOn(process, "cwd").mockReturnValue(sandboxDir);
  clearPolicyCache();
  resetEventLedger();
  resetIdempotencyStore();
  resetMetrics();
});

describe("Operating Core — State Machine v1", () => {
  it("1. valid transition passes", () => {
    expect(validateStateTransition("queued", "planning").valid).toBe(true);
    expect(transitionRunState("running", "completed")).toBe("completed");
  });

  it("2. invalid transition is blocked", () => {
    const r = validateStateTransition("queued", "completed");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/Invalid transition/);
    expect(() => transitionRunState("queued", "completed")).toThrow(/State transition rejected/);
  });

  it("3. terminal state transitions are blocked", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(validateStateTransition("completed", "running").valid).toBe(false);
    expect(validateStateTransition("failed", "queued").valid).toBe(false);
    expect(validateStateTransition("cancelled", "running").valid).toBe(false);
  });

  it("4. forced rerun from terminal state is allowed when force=true", () => {
    const r = validateStateTransition("failed", "queued", true);
    expect(r.valid).toBe(true);
    expect(transitionRunState("completed", "queued", true)).toBe("queued");
    // Force still rejects non-queued targets
    expect(validateStateTransition("completed", "running", true).valid).toBe(false);
  });

  it("getAllowedTransitions + deriveRunStatus", () => {
    expect(getAllowedTransitions("queued")).toEqual(["planning"]);
    expect(deriveRunStatus(["completed", "completed"])).toBe("completed");
    expect(deriveRunStatus(["running", "completed"])).toBe("running");
    expect(deriveRunStatus(["failed", "running"])).toBe("failed");
    expect(deriveRunStatus([])).toBe("queued");
  });
});

describe("Operating Core — Policy v1", () => {
  it("5. allow decision works", () => {
    const r = evaluateActionRisk("inspect", "local");
    expect(r.decision).toBe("allow");
    expect(r.reason).toBe("allowed");
    expect(r.risk).toBe("low");
  });

  it("6. blocks when missing tenantId in production", () => {
    const r = evaluateActionRisk("approve", "production");
    expect(r.decision).toBe("block");
    expect(r.reason).toBe("missing_tenant_id");
  });

  it("7. high-risk action requires approval", () => {
    const r = evaluateActionRisk("rerun", "local", "tenant-a");
    expect(r.decision).toBe("approval_required");
    expect(r.reason).toBe("high_risk_requires_approval");
    expect(r.risk).toBe("high");
  });

  it("evaluateTenantBoundary blocks cross-tenant access", () => {
    const r = evaluateTenantBoundary("tenant-a", "tenant-b", "production");
    expect(r.decision).toBe("block");
    expect(r.reason).toBe("cross_tenant_access");
  });

  it("evaluateApprovalRequirement bypasses for system actor", () => {
    const r = evaluateApprovalRequirement("rerun", "system", "production");
    expect(r.decision).toBe("allow");
  });
});

describe("Operating Core — Event Ledger v1", () => {
  it("8. system event writes to ledger", () => {
    const before = listSystemEvents().length;
    const event = appendSystemEvent({
      eventType: "demo",
      category: "run",
      environment: "local",
      payload: { hello: "world" },
    });
    expect(event.eventId).toBeTruthy();
    expect(event.timestamp).toBeTruthy();
    expect(event.schemaVersion).toBe("1.0.0");
    const after = listSystemEvents();
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]?.eventType).toBe("demo");
  });

  it("9. events filtered by runId", () => {
    appendSystemEvent({ eventType: "a", category: "run", environment: "local", runId: "r-1", payload: {} });
    appendSystemEvent({ eventType: "b", category: "run", environment: "local", runId: "r-2", payload: {} });
    appendSystemEvent({ eventType: "c", category: "run", environment: "local", runId: "r-1", payload: {} });
    const filtered = getEventsByRunId("r-1");
    expect(filtered.length).toBe(2);
    expect(filtered.every((e) => e.runId === "r-1")).toBe(true);
  });

  it("10. events filtered by tenantId", () => {
    appendSystemEvent({ eventType: "a", category: "run", environment: "local", tenantId: "t-1", payload: {} });
    appendSystemEvent({ eventType: "b", category: "run", environment: "local", tenantId: "t-2", payload: {} });
    const filtered = getEventsByTenantId("t-1");
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.tenantId).toBe("t-1");
  });

  it("11. run events can be replayed in timestamp order", () => {
    // Use real timer for distinct timestamps; vitest setup uses fake timers
    vi.useRealTimers();
    appendSystemEvent({ eventType: "first", category: "run", environment: "local", runId: "r-x", payload: {} });
    // Force ms tick by adjusting the ISO ourselves via timestamp param
    const e2 = appendSystemEvent({
      eventType: "second", category: "run", environment: "local", runId: "r-x", payload: {},
      timestamp: new Date(Date.now() + 1000).toISOString(),
    });
    const e3 = appendSystemEvent({
      eventType: "third", category: "run", environment: "local", runId: "r-x", payload: {},
      timestamp: new Date(Date.now() + 2000).toISOString(),
    });
    expect(e2.timestamp < e3.timestamp).toBe(true);

    const replay = replayRunEvents("r-x");
    expect(replay.map((e) => e.eventType)).toEqual(["first", "second", "third"]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });
});

describe("Operating Core — Schema Registry v1", () => {
  it("schemas registered on module load", () => {
    const names = listSchemas().map((s) => s.name).sort();
    expect(names).toContain("CommandEnvelope");
    expect(names).toContain("SystemEvent");
    expect(getSchemaVersion("Run")).toBe("1.0.0");
  });

  it("12. validates a valid CommandEnvelope", () => {
    const envelope = buildCommandEnvelope({
      commandType: "demo",
      payload: { x: 1 },
      actorId: "actor-1",
      actorType: "user",
      environment: "local",
    });
    const r = validateSchema("CommandEnvelope", envelope);
    expect(r.valid).toBe(true);
  });

  it("13. rejects an invalid object", () => {
    const r = validateSchema("CommandEnvelope", { commandType: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors).toBeDefined();
    expect((r.errors ?? []).length).toBeGreaterThan(0);
  });

  it("exports a JSON schema", () => {
    const json = exportJsonSchema("Run");
    expect(json["type"]).toBe("object");
    const required = json["required"] as string[];
    expect(required).toContain("runId");
  });
});

describe("Operating Core — Idempotency v1", () => {
  it("14. creates record + check returns hit on completed", () => {
    const key = createIdempotencyKey("demo", { x: 1 });
    const hash = hashCommand({ commandType: "demo", payload: { x: 1 } });
    expect(checkIdempotency(key, hash).status).toBe("miss");
    recordCommandStart(key, hash, "demo");
    recordCommandSuccess(key, "result-ref-1");
    expect(checkIdempotency(key, hash).status).toBe("hit");
  });

  it("15. returns prior completed record on hit", () => {
    const key = createIdempotencyKey("demo", { x: 1 });
    const hash = hashCommand({ commandType: "demo", payload: { x: 1 } });
    recordCommandStart(key, hash, "demo");
    recordCommandSuccess(key, "ref-42");
    const r = checkIdempotency(key, hash);
    expect(r.status).toBe("hit");
    expect(r.record?.resultRef).toBe("ref-42");
  });

  it("16. blocks same key with different commandHash (conflict)", () => {
    const key = createIdempotencyKey("demo", { x: 1 });
    const h1 = hashCommand({ commandType: "demo", payload: { x: 1 } });
    const h2 = hashCommand({ commandType: "demo", payload: { x: 2 } });
    recordCommandStart(key, h1, "demo");
    recordCommandSuccess(key);
    const r = checkIdempotency(key, h2);
    expect(r.status).toBe("conflict");
  });

  it("17. expired record allows new command (miss)", () => {
    const key = createIdempotencyKey("demo", { x: 1 });
    const hash = hashCommand({ commandType: "demo", payload: { x: 1 } });
    recordCommandStart(key, hash, "demo", { ttlSeconds: 1 });
    recordCommandSuccess(key);
    // Fast-forward past TTL
    vi.advanceTimersByTime(2000);
    expect(checkIdempotency(key, hash).status).toBe("expired");
    expect(purgeExpiredIdempotencyRecords()).toBe(1);
    expect(checkIdempotency(key, hash).status).toBe("miss");
  });
});

describe("Operating Core — Observability v1", () => {
  it("18. metric increments correctly", () => {
    incrementMetric("test_counter");
    incrementMetric("test_counter", 2);
    const snap = getMetricSnapshot();
    expect(snap["test_counter"]).toBe(3);
    // Known metrics seeded
    expect(snap["run_created_count"]).toBeDefined();
  });
});

describe("Operating Core — Command Envelope + Executor", () => {
  it("19. executes full flow end-to-end", async () => {
    const envelope = buildCommandEnvelope({
      commandType: "publish_asset",
      payload: { assetId: "a-1" },
      actorId: "actor-1",
      actorType: "user",
      environment: "local",
      tenantId: "t-1",
    });
    const result = await executeCommand(envelope, async () => ({ ok: true, id: "r-1" }));
    expect(result.ok).toBe(true);
    expect(result.status).toBe("executed");
    expect(result.result).toEqual({ ok: true, id: "r-1" });
    // Replaying should return the executed event
    const events = listSystemEvents();
    expect(events.some((e) => e.eventType === "publish_asset_executed")).toBe(true);
    // Re-running same envelope should hit idempotency cache
    const replay = await executeCommand(envelope, async () => {
      throw new Error("Should not run");
    });
    expect(replay.status).toBe("idempotent_hit");
  });

  it("20. attribution failure does not break command flow", async () => {
    // Handler intentionally throws — executor must still record failure cleanly
    // and not propagate.
    const envelope = buildCommandEnvelope({
      commandType: "broken_attr_demo",
      payload: { id: 1 },
      actorId: "a-1",
      actorType: "system",
      environment: "local",
      tenantId: "t-1",
    });
    const result = await executeCommand(envelope, async () => {
      throw new Error("attribution boom");
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("attribution boom");
    // System failure event captured
    expect(listSystemEvents().some((e) => e.eventType === "broken_attr_demo_failed")).toBe(true);
  });

  it("policy block surfaces from executor", async () => {
    const envelope = buildCommandEnvelope({
      commandType: "approve",
      payload: { id: 1 },
      actorId: "a-1",
      actorType: "user",
      environment: "production",
      // intentionally no tenantId → tenant boundary blocks
    });
    const result = await executeCommand(envelope, async () => ({ ok: true }));
    expect(result.status).toBe("blocked");
    expect(result.policy?.reason).toBe("missing_tenant_id");
  });
});
