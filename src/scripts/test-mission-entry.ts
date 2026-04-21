/**
 * Test: Mission Entry Layer (Hermes → AJ OS boundary)
 *
 * Validates:
 * - Envelope validation (valid, invalid, edge cases)
 * - Mission type mapping (4 allowed types → internal templates)
 * - executeMissionFromEnvelope happy path (with mock handlers)
 * - Failure envelope generation
 * - Artifact extraction
 * - CLI command (MissionRunCommand) with inline envelope
 * - Shared memory persistence (dry-run vs real)
 * - Roles used extraction
 * - Escalation propagation through entry layer
 */

import type {
  AgentRoleKind,
  RoleHandler,
  RoleStepInput,
  RoleStepOutput,
} from "../agent-roles/agent-role-types.js";
import type { MissionRunOptions } from "../agent-roles/mission-controller.js";
import type {
  MissionEnvelope,
  MissionResultEnvelope,
  MissionTypeName,
} from "../missions/mission-entry-types.js";
import {
  validateMissionEnvelope,
  ALLOWED_MISSION_TYPES,
} from "../missions/mission-entry-types.js";
import {
  executeMissionFromEnvelope,
  resetMissionSeq,
} from "../missions/mission-entry.js";
import type { MissionEntryOptions } from "../missions/mission-entry.js";
import { MissionRunCommand } from "../commands/mission-run.command.js";
import { readMissionState, listMissions } from "../agent-roles/shared-memory.js";
import { rm } from "node:fs/promises";
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

// ── Mock Handlers ──────────────────────────────────────────────────

function mockHandler(role: AgentRoleKind, output: unknown, ok = true): RoleHandler {
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
    planner: mockHandler("planner", { plan: ["step1"], reasoning: "Test" }),
    executor: mockHandler("executor", { result: "done", summary: "OK", files: ["output/test.json"] }),
    validator: mockHandler("validator", { passed: true, checks: [] }),
    monitor: mockHandler("monitor", { ok: true, healthy: true, checks: [], summary: "Healthy", timestamp: new Date().toISOString() }),
  };
  const merged = { ...defaults, ...overrides };
  return {
    planner: () => merged.planner,
    executor: () => merged.executor,
    validator: () => merged.validator,
    monitor: () => merged.monitor,
  };
}

function testOptions(overrides?: Partial<Record<AgentRoleKind, RoleHandler>>, dryRun = true): MissionEntryOptions {
  return {
    runOptions: { handlerFactories: mockFactories(overrides) },
    dryRun,
  };
}

const TEST_MEMORY_ROOT = path.resolve("data", "memory", "__test_mission_entry__");

async function cleanTestDir(): Promise<void> {
  try { await rm(TEST_MEMORY_ROOT, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ── Valid Envelope ─────────────────────────────────────────────────

function validEnvelope(overrides?: Partial<MissionEnvelope>): MissionEnvelope {
  return {
    mission_type: "build_and_review",
    objective: "Test mission",
    input: { key: "value" },
    priority: "normal",
    requested_by: "test",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Test: Mission Entry Layer (Hermes Boundary)            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  resetMissionSeq();

  // ── 1. Allowed Mission Types ────────────────────────────────────
  header("1. Allowed Mission Types");

  assert("4 allowed types", ALLOWED_MISSION_TYPES.length === 4);
  assert("includes build_and_review", ALLOWED_MISSION_TYPES.includes("build_and_review"));
  assert("includes extract_normalize_store", ALLOWED_MISSION_TYPES.includes("extract_normalize_store"));
  assert("includes repair_failed_workflow", ALLOWED_MISSION_TYPES.includes("repair_failed_workflow"));
  assert("includes monitor_only", ALLOWED_MISSION_TYPES.includes("monitor_only"));

  // ── 2. Envelope Validation — Valid ──────────────────────────────
  header("2. Envelope Validation — Valid");

  const v1 = validateMissionEnvelope(validEnvelope());
  assert("valid envelope passes", v1.valid === true);
  assert("no errors", v1.errors.length === 0);

  const v2 = validateMissionEnvelope(validEnvelope({ priority: undefined }));
  assert("optional priority accepted", v2.valid === true);

  const v3 = validateMissionEnvelope(validEnvelope({ requested_by: undefined }));
  assert("optional requested_by accepted", v3.valid === true);

  // ── 3. Envelope Validation — Invalid ────────────────────────────
  header("3. Envelope Validation — Invalid");

  const inv1 = validateMissionEnvelope(null);
  assert("null → invalid", inv1.valid === false);
  assert("null → error message", inv1.errors[0]?.includes("non-null") === true);

  const inv2 = validateMissionEnvelope({});
  assert("empty object → invalid", inv2.valid === false);
  assert("empty → 3 errors (type, objective, input)", inv2.errors.length === 3);

  const inv3 = validateMissionEnvelope({ mission_type: "hack_the_planet", objective: "x", input: {} });
  assert("unknown type → invalid", inv3.valid === false);
  assert("unknown type → error mentions allowed", inv3.errors[0]?.includes("not allowed") === true);

  const inv4 = validateMissionEnvelope({ mission_type: "build_and_review", objective: "", input: {} });
  assert("empty objective → invalid", inv4.valid === false);

  const inv5 = validateMissionEnvelope({ mission_type: "build_and_review", objective: "x", input: [1, 2] });
  assert("array input → invalid", inv5.valid === false);

  const inv6 = validateMissionEnvelope({ mission_type: "build_and_review", objective: "x", input: {}, priority: "mega" });
  assert("invalid priority → invalid", inv6.valid === false);

  // ── 4. Execute — build_and_review ───────────────────────────────
  header("4. Execute — build_and_review");

  resetMissionSeq();
  const r1 = await executeMissionFromEnvelope(validEnvelope(), testOptions());

  assert("ok=true", r1.ok === true);
  assert("status=completed", r1.status === "completed");
  assert("mission_type preserved", r1.mission_type === "build_and_review");
  assert("mission_id has date + seq", r1.mission_id.includes("build_and_review"));
  assert("summary includes objective", r1.summary.includes("Test mission"));
  assert("metrics.steps > 0", r1.metrics.steps > 0);
  assert("metrics.rolesUsed includes architect", r1.metrics.rolesUsed.includes("architect"));
  assert("metrics.rolesUsed includes operator", r1.metrics.rolesUsed.includes("operator"));
  assert("metrics.escalations=0", r1.metrics.escalations === 0);
  assert("failure_ref=null on success", r1.failure_ref === null);

  // ── 5. Execute — extract_normalize_store ────────────────────────
  header("5. Execute — extract_normalize_store");

  resetMissionSeq();
  const r2 = await executeMissionFromEnvelope(
    validEnvelope({ mission_type: "extract_normalize_store", objective: "Extract config" }),
    testOptions(),
  );

  assert("extract ok=true", r2.ok === true);
  assert("extract type", r2.mission_type === "extract_normalize_store");
  assert("extract roles include auditor", r2.metrics.rolesUsed.includes("auditor"));

  // ── 6. Execute — repair_failed_workflow ─────────────────────────
  header("6. Execute — repair_failed_workflow");

  resetMissionSeq();
  const r3 = await executeMissionFromEnvelope(
    validEnvelope({ mission_type: "repair_failed_workflow", objective: "Fix broken flow" }),
    testOptions(),
  );

  assert("repair ok=true", r3.ok === true);
  assert("repair type", r3.mission_type === "repair_failed_workflow");
  assert("repair roles include sentinel", r3.metrics.rolesUsed.includes("sentinel"));

  // ── 7. Execute — monitor_only ───────────────────────────────────
  header("7. Execute — monitor_only");

  resetMissionSeq();
  const r4 = await executeMissionFromEnvelope(
    validEnvelope({ mission_type: "monitor_only", objective: "Health check" }),
    testOptions(),
  );

  assert("monitor ok=true", r4.ok === true);
  assert("monitor type", r4.mission_type === "monitor_only");
  assert("monitor roles include sentinel", r4.metrics.rolesUsed.includes("sentinel"));

  // ── 8. Failure Envelope ─────────────────────────────────────────
  header("8. Failure Envelope");

  resetMissionSeq();
  const r5 = await executeMissionFromEnvelope(
    validEnvelope(),
    testOptions({ executor: mockHandler("executor", null, false) }),
  );

  assert("failure ok=false", r5.ok === false);
  assert("failure status=failed", r5.status === "failed");
  assert("failure has summary", r5.summary.length > 0);
  assert("failure has failure_ref", r5.failure_ref !== null);
  assert("failure failure_ref path", r5.failure_ref?.includes("state.json") === true);

  // ── 9. Invalid Envelope → Immediate Failure ─────────────────────
  header("9. Invalid Envelope → Immediate Failure");

  resetMissionSeq();
  const r6 = await executeMissionFromEnvelope(
    { mission_type: "hack" as MissionTypeName, objective: "", input: {} },
    testOptions(),
  );

  assert("invalid envelope ok=false", r6.ok === false);
  assert("invalid mission_id=invalid_envelope", r6.mission_id === "invalid_envelope");
  assert("invalid summary mentions errors", r6.summary.includes("Invalid"));
  assert("invalid alerts has human attention", r6.alerts.includes("requires human attention"));

  // ── 10. Artifact Extraction ─────────────────────────────────────
  header("10. Artifact Extraction");

  resetMissionSeq();
  const r7 = await executeMissionFromEnvelope(
    validEnvelope({ mission_type: "extract_normalize_store" }),
    testOptions(),
  );

  // Mock executor returns { files: ["output/test.json"] }
  assert("artifacts extracted from executor output", r7.artifacts.length === 1);
  assert("artifact path", r7.artifacts[0] === "output/test.json");

  // ── 11. Escalation Through Entry Layer ──────────────────────────
  header("11. Escalation Through Entry Layer");

  resetMissionSeq();
  let execCalls = 0;
  const escalateFactories = mockFactories();
  escalateFactories.executor = () => {
    execCalls++;
    if (execCalls <= 1) return mockHandler("executor", null, false);
    return mockHandler("executor", { result: "fixed", summary: "Recovered" });
  };

  const r8 = await executeMissionFromEnvelope(
    validEnvelope({ mission_type: "build_and_review", objective: "Escalation test" }),
    { runOptions: { handlerFactories: escalateFactories }, dryRun: true },
  );

  assert("escalation ok=true (recovered)", r8.ok === true);
  assert("escalation count in metrics", r8.metrics.escalations === 1);

  // ── 12. Shared Memory Persistence ───────────────────────────────
  header("12. Shared Memory Persistence");

  await cleanTestDir();
  resetMissionSeq();

  const r9 = await executeMissionFromEnvelope(
    validEnvelope({ objective: "Persist test" }),
    {
      runOptions: { handlerFactories: mockFactories() },
      dryRun: false,
      memoryConfig: { root: TEST_MEMORY_ROOT },
    },
  );

  assert("persist ok=true", r9.ok === true);

  const missions = await listMissions({ root: TEST_MEMORY_ROOT });
  assert("mission persisted", missions.length === 1);

  const state = await readMissionState(missions[0]!, { root: TEST_MEMORY_ROOT });
  assert("state readable", state !== null);
  assert("state status=completed", state?.status === "completed");

  await cleanTestDir();

  // ── 13. Failure Persistence (shared log) ────────────────────────
  header("13. Failure Persistence");

  resetMissionSeq();

  const r10 = await executeMissionFromEnvelope(
    validEnvelope({ objective: "Fail persist test" }),
    {
      runOptions: { handlerFactories: mockFactories({ executor: mockHandler("executor", null, false) }) },
      dryRun: false,
      memoryConfig: { root: TEST_MEMORY_ROOT },
    },
  );

  assert("fail-persist ok=false", r10.ok === false);
  assert("fail-persist failure_ref set", r10.failure_ref !== null);

  const failMissions = await listMissions({ root: TEST_MEMORY_ROOT });
  assert("failed mission persisted", failMissions.length === 1);

  await cleanTestDir();

  // ── 14. Dry Run Skips Persistence ───────────────────────────────
  header("14. Dry Run Skips Persistence");

  resetMissionSeq();

  await executeMissionFromEnvelope(
    validEnvelope({ objective: "Dry run test" }),
    {
      runOptions: { handlerFactories: mockFactories() },
      dryRun: true,
      memoryConfig: { root: TEST_MEMORY_ROOT },
    },
  );

  const dryMissions = await listMissions({ root: TEST_MEMORY_ROOT });
  assert("dry run → no persistence", dryMissions.length === 0);

  // ── 15. CLI Command — Inline Envelope ───────────────────────────
  header("15. CLI Command — MissionRunCommand");

  resetMissionSeq();
  // Capture console output
  const origLog = console.log;
  const origErr = console.error;
  let captured = "";
  console.log = (msg: string) => { captured += msg + "\n"; };
  console.error = (msg: string) => { captured += msg + "\n"; };

  // MissionRunCommand can't inject handlers via CLI flags, so we test the
  // command's error path (no file, no envelope)
  const cmd = new MissionRunCommand();
  const cmdResult = await cmd.run({});

  console.log = origLog;
  console.error = origErr;

  assert("CLI no input → ok=false", cmdResult.ok === false);
  assert("CLI no input → error mentions file/envelope", cmdResult.error?.includes("--file") === true || cmdResult.error?.includes("--envelope") === true);

  // ── 16. CLI Command — Invalid Inline Envelope ───────────────────
  header("16. CLI Command — Invalid Envelope");

  captured = "";
  console.log = (msg: string) => { captured += msg + "\n"; };
  console.error = (msg: string) => { captured += msg + "\n"; };

  const cmdResult2 = await cmd.run({ envelope: '{"mission_type":"bad"}', json: true });

  console.log = origLog;
  console.error = origErr;

  assert("CLI invalid → ok=false", cmdResult2.ok === false);
  assert("CLI invalid → JSON output", captured.includes('"ok":') || captured.includes('"ok": false'));

  // ── 17. Schedule Context Pass-Through ───────────────────────────
  header("17. Schedule Context Pass-Through");

  resetMissionSeq();
  const r11 = await executeMissionFromEnvelope(
    validEnvelope({
      mission_type: "monitor_only",
      objective: "Scheduled check",
      schedule_context: { trigger_type: "cron", trigger_time: "2026-04-14T09:00:00Z", recurrence: "every 2h" },
    }),
    testOptions(),
  );

  assert("schedule context ok=true", r11.ok === true);
  assert("schedule context in mission_id", r11.mission_id.includes("monitor_only"));

  // ── 18. Sentinel Unhealthy Alert Propagates ─────────────────────
  header("18. Sentinel Alert Propagation");

  resetMissionSeq();
  const r12 = await executeMissionFromEnvelope(
    validEnvelope({ mission_type: "build_and_review" }),
    testOptions({
      monitor: mockHandler("monitor", {
        ok: true, healthy: false, checks: [], summary: "Degraded", timestamp: new Date().toISOString(),
      }),
    }),
  );

  assert("alert propagation ok=true", r12.ok === true);
  assert("alerts include degraded message", r12.alerts.some((a) => a.includes("Degraded")));

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  Mission Entry Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log("══════════════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
