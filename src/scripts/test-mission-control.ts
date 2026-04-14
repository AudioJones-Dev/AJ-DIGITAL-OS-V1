/**
 * Test: Mission Control Layer
 *
 * Validates:
 * - Mission types, defaults, role mappings
 * - Mission templates (full, review, exec-validate, repair, monitor-only)
 * - Mission controller (happy path, escalation, failure, exception)
 * - Shared state flow (plan, executionOutput, validationResult, alerts)
 * - Shared memory (write/read state, append/read logs, list missions)
 */

import type {
  AgentRoleKind,
  RoleHandler,
  RoleStepInput,
  RoleStepOutput,
} from "../agent-roles/agent-role-types.js";
import {
  MISSION_ROLE_MAP,
  ROLE_TO_MISSION,
  DEFAULT_RETRY_POLICY,
  DEFAULT_MONITOR_POLICY,
} from "../agent-roles/mission-types.js";
import type { Mission, MissionRole, MissionState } from "../agent-roles/mission-types.js";
import { runMission } from "../agent-roles/mission-controller.js";
import type { MissionRunOptions } from "../agent-roles/mission-controller.js";
import {
  buildFullMission,
  buildReviewMission,
  buildExecValidateMission,
  buildRepairMission,
  buildMonitorMission,
} from "../agent-roles/mission-templates.js";
import {
  writeMissionState,
  readMissionState,
  listMissions,
  appendSharedLog,
  readSharedLog,
} from "../agent-roles/shared-memory.js";
import type { SharedLogEntry } from "../agent-roles/shared-memory.js";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function header(group: string): void {
  console.log(`\n── ${group} ──`);
}

// ── Mock Handler Factories ─────────────────────────────────────────

function mockHandler(
  role: AgentRoleKind,
  output: unknown,
  ok = true,
): RoleHandler {
  return {
    role,
    async execute(input: RoleStepInput): Promise<RoleStepOutput> {
      return {
        ok,
        role,
        output: ok ? output : null,
        durationMs: 1,
        retries: 0,
        warnings: [],
        error: ok ? null : `Mock ${role} failure`,
      };
    },
  };
}

function mockFactories(overrides?: Partial<Record<AgentRoleKind, RoleHandler>>): Record<AgentRoleKind, () => RoleHandler> {
  const defaults: Record<AgentRoleKind, RoleHandler> = {
    planner: mockHandler("planner", { plan: ["step1", "step2"], reasoning: "Test plan" }),
    executor: mockHandler("executor", { result: "executed", summary: "Done" }),
    validator: mockHandler("validator", { passed: true, checks: [] }),
    monitor: mockHandler("monitor", { ok: true, healthy: true, checks: [], summary: "All good", timestamp: new Date().toISOString() }),
  };
  const merged = { ...defaults, ...overrides };
  return {
    planner: () => merged.planner,
    executor: () => merged.executor,
    validator: () => merged.validator,
    monitor: () => merged.monitor,
  };
}

function mockOptions(overrides?: Partial<Record<AgentRoleKind, RoleHandler>>): MissionRunOptions {
  return { handlerFactories: mockFactories(overrides) };
}

/** Creates an executor that fails N times then succeeds. */
function flappyExecutor(failCount: number): RoleHandler {
  let calls = 0;
  return {
    role: "executor",
    async execute(input: RoleStepInput): Promise<RoleStepOutput> {
      calls++;
      const shouldFail = calls <= failCount;
      return {
        ok: !shouldFail,
        role: "executor",
        output: shouldFail ? null : { result: "recovered", summary: `Recovered after ${calls - 1} failures` },
        durationMs: 1,
        retries: 0,
        warnings: [],
        error: shouldFail ? `Flappy failure #${calls}` : null,
      };
    },
  };
}

// ── Temp directory for shared memory tests ─────────────────────────

const TEST_MEMORY_ROOT = path.resolve("data", "memory", "__test_mission_control__");

async function cleanTestDir(): Promise<void> {
  try {
    await rm(TEST_MEMORY_ROOT, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Test: Mission Control Layer                            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ── 1. Role Mappings ────────────────────────────────────────────
  header("1. Role Mappings");

  assert("architect → planner", MISSION_ROLE_MAP.architect === "planner");
  assert("operator → executor", MISSION_ROLE_MAP.operator === "executor");
  assert("auditor → validator", MISSION_ROLE_MAP.auditor === "validator");
  assert("sentinel → monitor", MISSION_ROLE_MAP.sentinel === "monitor");

  assert("planner → architect", ROLE_TO_MISSION.planner === "architect");
  assert("executor → operator", ROLE_TO_MISSION.executor === "operator");
  assert("validator → auditor", ROLE_TO_MISSION.validator === "auditor");
  assert("monitor → sentinel", ROLE_TO_MISSION.monitor === "sentinel");

  // ── 2. Default Policies ─────────────────────────────────────────
  header("2. Default Policies");

  assert("retry maxOperatorRetries=2", DEFAULT_RETRY_POLICY.maxOperatorRetries === 2);
  assert("retry escalateOnFailure=true", DEFAULT_RETRY_POLICY.escalateOnFailure === true);
  assert("retry maxEscalations=1", DEFAULT_RETRY_POLICY.maxEscalations === 1);
  assert("monitor enabled=true", DEFAULT_MONITOR_POLICY.enabled === true);

  // ── 3. Mission Templates ────────────────────────────────────────
  header("3. Mission Templates — Full");

  const full = buildFullMission("m1", "Build feature", { feature: "auth" });
  assert("full has 4 roles", full.roles.length === 4);
  assert("full roles in order", full.roles.join(",") === "architect,operator,auditor,sentinel");
  assert("full retryPolicy inherits defaults", full.retryPolicy.maxOperatorRetries === 2);
  assert("full monitorPolicy enabled", full.monitorPolicy.enabled === true);
  assert("full context preserved", (full.context as Record<string, unknown>).feature === "auth");

  const fullCustom = buildFullMission("m2", "Custom", {}, {
    maxOperatorRetries: 5,
    maxEscalations: 3,
    tags: ["custom"],
    successCriteria: ["all good"],
  });
  assert("full custom retries", fullCustom.retryPolicy.maxOperatorRetries === 5);
  assert("full custom escalations", fullCustom.retryPolicy.maxEscalations === 3);
  assert("full custom tags", fullCustom.tags?.[0] === "custom");
  assert("full custom criteria", fullCustom.successCriteria[0] === "all good");

  header("3b. Mission Templates — Review");

  const review = buildReviewMission("m3", "Review code", { pr: 42 });
  assert("review has 3 roles", review.roles.length === 3);
  assert("review roles", review.roles.join(",") === "architect,operator,auditor");
  assert("review monitor disabled", review.monitorPolicy.enabled === false);

  header("3c. Mission Templates — ExecValidate");

  const ev = buildExecValidateMission("m4", "Run and check", { data: "x" });
  assert("exec-validate has 2 roles", ev.roles.length === 2);
  assert("exec-validate roles", ev.roles.join(",") === "operator,auditor");
  assert("exec-validate no escalation", ev.retryPolicy.escalateOnFailure === false);

  header("3d. Mission Templates — Repair");

  const repair = buildRepairMission("m5", "Fix broken service", { service: "api" });
  assert("repair has 4 roles", repair.roles.length === 4);
  assert("repair roles start with sentinel", repair.roles[0] === "sentinel");
  assert("repair maxEscalations=2", repair.retryPolicy.maxEscalations === 2);
  assert("repair tagged self-healing", repair.tags?.includes("self-healing") === true);

  header("3e. Mission Templates — Monitor");

  const mon = buildMonitorMission("m6", "Health check", { endpoint: "/api" }, { snapshotLabel: "hourly" });
  assert("monitor has 1 role", mon.roles.length === 1);
  assert("monitor role is sentinel", mon.roles[0] === "sentinel");
  assert("monitor snapshotLabel", mon.monitorPolicy.snapshotLabel === "hourly");
  assert("monitor no retries", mon.retryPolicy.maxOperatorRetries === 0);

  // ── 4. Mission Controller — Happy Path ──────────────────────────
  header("4. Mission Controller — Happy Path (full pipeline)");

  const happyMission = buildFullMission("happy-1", "Happy path test", { input: "data" });
  const happyResult = await runMission(happyMission, mockOptions());

  assert("happy ok=true", happyResult.ok === true);
  assert("happy status=completed", happyResult.status === "completed");
  assert("happy missionId", happyResult.missionId === "happy-1");
  assert("happy objective", happyResult.objective === "Happy path test");
  assert("happy no escalations", happyResult.escalationCount === 0);
  assert("happy no error", happyResult.error === null);
  assert("happy durationMs > 0", happyResult.durationMs >= 0);
  assert("happy state.plan set", happyResult.state.plan !== null);
  assert("happy state.executionOutput set", happyResult.state.executionOutput !== null);
  assert("happy state.validationResult set", happyResult.state.validationResult !== null);
  assert("happy state.alerts empty", happyResult.state.alerts.length === 0);
  assert("happy pipelineResults >= 1", happyResult.pipelineResults.length >= 1);

  // ── 5. Mission Controller — Exec-Validate Happy Path ────────────
  header("5. Mission Controller — ExecValidate Happy Path");

  const evMission = buildExecValidateMission("ev-1", "Quick exec", { x: 1 });
  const evResult = await runMission(evMission, mockOptions());

  assert("ev ok=true", evResult.ok === true);
  assert("ev status=completed", evResult.status === "completed");
  assert("ev state.plan is null (no architect)", evResult.state.plan === null);
  assert("ev state.executionOutput set", evResult.state.executionOutput !== null);

  // ── 6. Mission Controller — Monitor Only ────────────────────────
  header("6. Mission Controller — Monitor Only");

  const monMission = buildMonitorMission("mon-1", "Monitor test", { target: "db" });
  const monResult = await runMission(monMission, mockOptions());

  assert("monitor ok=true", monResult.ok === true);
  assert("monitor status=completed", monResult.status === "completed");
  assert("monitor no escalations", monResult.escalationCount === 0);

  // ── 7. Mission Controller — Operator Failure, No Escalation ─────
  header("7. Operator Failure — No Escalation");

  const failExecMission = buildExecValidateMission("fail-1", "Fail exec", { x: 1 });
  const failExecResult = await runMission(failExecMission, mockOptions({
    executor: mockHandler("executor", null, false),
  }));

  assert("fail-exec ok=false", failExecResult.ok === false);
  assert("fail-exec status=failed", failExecResult.status === "failed");
  assert("fail-exec error present", failExecResult.error !== null);
  assert("fail-exec no escalation (no architect)", failExecResult.escalationCount === 0);

  // ── 8. Mission Controller — Escalation Success ──────────────────
  header("8. Escalation Success");

  // Primary pipeline: executor always fails.
  // Escalation pipeline: executor succeeds (fresh mock per factory call).
  let executorCalls = 0;
  const escalateFactories = mockFactories();
  // Override executor factory to fail on first pipeline, succeed on escalation
  escalateFactories.executor = () => {
    executorCalls++;
    if (executorCalls <= 1) {
      return mockHandler("executor", null, false);
    }
    return mockHandler("executor", { result: "escalated-ok", summary: "Fixed" });
  };

  const escMission = buildFullMission("esc-1", "Escalation test", { bug: "crash" });
  const escResult = await runMission(escMission, { handlerFactories: escalateFactories });

  assert("escalation ok=true", escResult.ok === true);
  assert("escalation status=completed", escResult.status === "completed");
  assert("escalation count=1", escResult.escalationCount === 1);
  assert("escalation state.plan updated", escResult.state.plan !== null);
  assert("escalation record resolved", escResult.state.escalations[0]?.resolved === true);

  // ── 9. Mission Controller — Escalation Exhausted ────────────────
  header("9. Escalation Exhausted");

  const alwaysFailMission = buildFullMission("exhaust-1", "Always fail", {}, {
    maxEscalations: 2,
  });
  const alwaysFailResult = await runMission(alwaysFailMission, mockOptions({
    executor: mockHandler("executor", null, false),
  }));

  assert("exhausted ok=false", alwaysFailResult.ok === false);
  assert("exhausted status=failed", alwaysFailResult.status === "failed");
  assert("exhausted escalationCount=2", alwaysFailResult.escalationCount === 2);
  assert("exhausted error present", alwaysFailResult.error !== null);
  assert("exhausted escalation records", alwaysFailResult.state.escalations.length === 2);
  assert("exhausted escalations not resolved", alwaysFailResult.state.escalations.every((e) => !e.resolved));

  // ── 10. Mission Controller — Validator Rejection in Mission ─────
  header("10. Validator Rejection in Mission");

  const rejectingValidator = mockHandler("validator", { passed: false, checks: [{ field: "x", rule: "exists", passed: false }] }, false);
  const rejectMission = buildReviewMission("reject-1", "Rejection test", {});
  const rejectResult = await runMission(rejectMission, mockOptions({
    validator: rejectingValidator,
  }));

  // The pipeline internally handles rejection; mission sees failure
  assert("rejection ok=false", rejectResult.ok === false);
  assert("rejection status=failed", rejectResult.status === "failed");

  // ── 11. Mission Controller — Exception Handling ─────────────────
  header("11. Exception Handling");

  const throwingExecutor: RoleHandler = {
    role: "executor",
    async execute(): Promise<RoleStepOutput> {
      throw new Error("Unexpected crash");
    },
  };
  const throwMission = buildExecValidateMission("throw-1", "Throw test", {});
  const throwResult = await runMission(throwMission, mockOptions({
    executor: throwingExecutor,
  }));

  assert("exception ok=false", throwResult.ok === false);
  assert("exception status=failed", throwResult.status === "failed");
  assert("exception error contains message", throwResult.error?.includes("Unexpected crash") === true);

  // ── 12. Shared State Flow ───────────────────────────────────────
  header("12. Shared State Flow");

  const stateTestMission = buildFullMission("state-1", "State flow test", { key: "value" });
  const stateResult = await runMission(stateTestMission, mockOptions());

  assert("sharedData has context", (stateResult.state.sharedData as Record<string, unknown>).key === "value");
  assert("memoryRefs is array", Array.isArray(stateResult.state.memoryRefs));
  assert("missionId on state", stateResult.state.missionId === "state-1");

  // ── 13. Sentinel Unhealthy Alert ────────────────────────────────
  header("13. Sentinel Unhealthy Alert");

  const unhealthyMonitor = mockHandler("monitor", {
    ok: true,
    healthy: false,
    checks: [],
    summary: "Service degraded",
    timestamp: new Date().toISOString(),
  });
  const alertMission = buildFullMission("alert-1", "Alert test", {});
  const alertResult = await runMission(alertMission, mockOptions({
    monitor: unhealthyMonitor,
  }));

  assert("alert ok=true (monitor doesn't block)", alertResult.ok === true);
  assert("alert has sentinel alert", alertResult.state.alerts.length >= 1);
  assert("alert source=sentinel", alertResult.state.alerts[0]?.source === "sentinel");
  assert("alert level=warn", alertResult.state.alerts[0]?.level === "warn");
  assert("alert message", alertResult.state.alerts[0]?.message.includes("Service degraded") === true);

  // ── 14. Post-Mission Monitor (trailing sentinel) ────────────────
  header("14. Post-Mission Monitor (trailing sentinel)");

  // Review mission (no sentinel) but with monitor enabled → should run trailing sentinel
  const trailingMission: Mission = {
    ...buildReviewMission("trailing-1", "Trailing monitor test", {}),
    monitorPolicy: { enabled: true },
  };
  const trailingResult = await runMission(trailingMission, mockOptions());

  assert("trailing ok=true", trailingResult.ok === true);
  assert("trailing pipelineResults includes monitor run", trailingResult.pipelineResults.length === 2);

  // ── 15. Shared Memory — Write & Read State ──────────────────────
  header("15. Shared Memory — Write & Read State");

  await cleanTestDir();
  const config = { root: TEST_MEMORY_ROOT };

  const testState: MissionState = {
    missionId: "mem-test-1",
    status: "completed",
    plan: { steps: ["a", "b"] },
    executionOutput: { result: "done" },
    validationResult: { passed: true },
    alerts: [{
      timestamp: new Date().toISOString(),
      source: "sentinel" as MissionRole,
      level: "info",
      message: "All clear",
    }],
    escalations: [],
    memoryRefs: ["ref-1"],
    sharedData: { x: 42 },
  };

  const dir = await writeMissionState(testState, config);
  assert("writeMissionState returns dir", dir.includes("mem-test-1"));

  const loaded = await readMissionState("mem-test-1", config);
  assert("readMissionState not null", loaded !== null);
  assert("loaded missionId matches", loaded?.missionId === "mem-test-1");
  assert("loaded status matches", loaded?.status === "completed");
  assert("loaded plan matches", JSON.stringify(loaded?.plan) === JSON.stringify({ steps: ["a", "b"] }));
  assert("loaded executionOutput matches", JSON.stringify(loaded?.executionOutput) === JSON.stringify({ result: "done" }));
  assert("loaded alerts count", loaded?.alerts.length === 1);
  assert("loaded sharedData preserved", (loaded?.sharedData as Record<string, unknown>)?.x === 42);

  // ── 16. Shared Memory — List Missions ───────────────────────────
  header("16. Shared Memory — List Missions");

  const testState2: MissionState = {
    ...testState,
    missionId: "mem-test-2",
  };
  await writeMissionState(testState2, config);

  const missions = await listMissions(config);
  assert("listMissions includes mem-test-1", missions.includes("mem-test-1"));
  assert("listMissions includes mem-test-2", missions.includes("mem-test-2"));

  // ── 17. Shared Memory — Read Non-Existent ───────────────────────
  header("17. Shared Memory — Read Non-Existent");

  const missing = await readMissionState("does-not-exist", config);
  assert("missing state returns null", missing === null);

  const emptyList = await listMissions({ root: path.join(TEST_MEMORY_ROOT, "nonexistent") });
  assert("listMissions on missing dir returns []", emptyList.length === 0);

  // ── 18. Shared Logs — Append & Read ─────────────────────────────
  header("18. Shared Logs — Append & Read");

  const decisionEntry: SharedLogEntry = {
    timestamp: new Date().toISOString(),
    missionId: "log-test-1",
    role: "architect",
    type: "decision",
    content: "Chose strategy A",
    metadata: { confidence: 0.95 },
  };

  const failureEntry: SharedLogEntry = {
    timestamp: new Date().toISOString(),
    missionId: "log-test-1",
    role: "operator",
    type: "failure",
    content: "Timeout on API call",
  };

  const patternEntry: SharedLogEntry = {
    timestamp: new Date().toISOString(),
    missionId: "log-test-1",
    role: "auditor",
    type: "pattern",
    content: "Retries always needed for external APIs",
  };

  await appendSharedLog(decisionEntry, config);
  await appendSharedLog(failureEntry, config);
  await appendSharedLog(patternEntry, config);

  const decisions = await readSharedLog("decision", config);
  assert("decisions log has 1 entry", decisions.length === 1);
  assert("decision content", decisions[0]?.content === "Chose strategy A");
  assert("decision metadata", (decisions[0]?.metadata as Record<string, unknown>)?.confidence === 0.95);

  const failures = await readSharedLog("failure", config);
  assert("failures log has 1 entry", failures.length === 1);
  assert("failure content", failures[0]?.content === "Timeout on API call");

  const patterns = await readSharedLog("pattern", config);
  assert("patterns log has 1 entry", patterns.length === 1);

  // ── 19. Shared Logs — Read Empty ────────────────────────────────
  header("19. Shared Logs — Read Empty");

  const emptyLogs = await readSharedLog("decision", { root: path.join(TEST_MEMORY_ROOT, "nonexistent") });
  assert("empty log returns []", emptyLogs.length === 0);

  // ── 20. Multiple Appends to Same Log ────────────────────────────
  header("20. Multiple Appends to Same Log");

  await appendSharedLog({ ...decisionEntry, content: "Decision 2" }, config);
  await appendSharedLog({ ...decisionEntry, content: "Decision 3" }, config);
  const allDecisions = await readSharedLog("decision", config);
  assert("3 decisions after appends", allDecisions.length === 3);

  // ── Cleanup ─────────────────────────────────────────────────────
  await cleanTestDir();

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  Mission Control Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log("══════════════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
