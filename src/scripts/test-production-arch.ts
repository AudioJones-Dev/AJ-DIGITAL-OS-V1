/**
 * Test: Production Architecture Layer
 *
 * Validates (no real DB connections — all structural / dry-run):
 * - DB types compile correctly
 * - Route policy: perplexity routing, new task types, escalation chain
 * - R2 key generation
 * - Execution logger dry-run mode
 * - Mission replay formatting
 * - Mission DB hooks types
 * - Config recognizes new env vars
 */

import type {
  DbClient,
  DbMission,
  DbMissionRun,
  DbRun,
  DbStep,
  DbObservation,
  DbFailure,
  DbPattern,
  InsertRun,
  QueryResult,
} from "../db/db-types.js";

import type { TaskType, RoutingConstraints } from "../model-routing/result-shape.js";
import { createResult } from "../model-routing/result-shape.js";
import {
  resolveRoute,
  getEscalationTarget,
} from "../model-routing/route-policy.js";

import { missionArtifactKey } from "../storage/r2-client.js";
import type { R2Config } from "../storage/r2-client.js";

import * as executionLogger from "../db/execution-logger.js";
import type { ExecutionLoggerConfig } from "../db/execution-logger.js";

import type { ReplayReport, ReplayConfig } from "../missions/mission-replay.js";
import type { ProductionMissionConfig } from "../missions/mission-db-hooks.js";

import type { NeonConfig } from "../db/neon-client.js";
import type { SupabaseConfig } from "../db/supabase-client.js";

import { config as runtimeConfig } from "../core/config.js";

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

// ═══════════════════════════════════════════════════════════════════
// 1. DB Types Compile Checks
// ═══════════════════════════════════════════════════════════════════

function testDbTypes(): void {
  header("DB Types Compile Checks");

  // Supabase types
  const client: DbClient = {
    id: "uuid-1",
    slug: "test-client",
    display_name: "Test Client",
    contact_email: null,
    tier: "standard",
    status: "active",
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  assert("DbClient creates valid shape", client.slug === "test-client");

  const mission: DbMission = {
    id: "uuid-2",
    client_id: client.id,
    mission_type: "build_and_review",
    objective: "Test objective",
    priority: "normal",
    input_payload: { key: "value" },
    schedule: null,
    status: "active",
    tags: ["test"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  assert("DbMission creates valid shape", mission.mission_type === "build_and_review");

  const missionRun: DbMissionRun = {
    id: "uuid-3",
    mission_id: mission.id,
    run_ref: "run-001",
    status: "running",
    requested_by: "hermes",
    trigger_type: "manual",
    ok: null,
    summary: null,
    artifacts: [],
    failure_ref: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    duration_ms: null,
    created_at: new Date().toISOString(),
  };
  assert("DbMissionRun creates valid shape", missionRun.run_ref === "run-001");

  // Neon types
  const run: DbRun = {
    id: 1,
    run_ref: "run-001",
    mission_type: "build_and_review",
    objective: "Test",
    input_payload: {},
    status: "completed",
    ok: true,
    summary: "All good",
    error: null,
    roles_used: ["planner", "executor"],
    escalation_count: 0,
    duration_ms: 1234,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
  assert("DbRun creates valid shape", run.id === 1 && run.ok === true);

  const step: DbStep = {
    id: 1,
    run_id: 1,
    step_index: 0,
    role: "planner",
    pipeline_id: "pipeline-1",
    ok: true,
    input_snapshot: null,
    output_snapshot: { result: "done" },
    error: null,
    duration_ms: 100,
    retries: 0,
    warnings: [],
    created_at: new Date().toISOString(),
  };
  assert("DbStep creates valid shape", step.role === "planner");

  const observation: DbObservation = {
    id: 1,
    run_id: 1,
    source: "sentinel",
    healthy: true,
    summary: "All checks passed",
    checks: [],
    snapshot_label: "post-build",
    created_at: new Date().toISOString(),
  };
  assert("DbObservation creates valid shape", observation.healthy === true);

  const failure: DbFailure = {
    id: 1,
    run_id: 1,
    step_id: null,
    role: "executor",
    error: "Timeout",
    input_snapshot: null,
    stack_trace: null,
    escalated: false,
    resolved: true,
    resolution: "Retried successfully",
    created_at: new Date().toISOString(),
  };
  assert("DbFailure creates valid shape", failure.resolved === true);

  const pattern: DbPattern = {
    id: 1,
    run_id: 1,
    pattern_type: "recovery",
    description: "Timeout on executor",
    context: { count: 3 },
    confidence: 0.85,
    occurrences: 3,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  assert("DbPattern creates valid shape", pattern.confidence === 0.85);

  // QueryResult generic
  const qr: QueryResult<DbRun> = { ok: true, data: run, error: null, count: 1 };
  assert("QueryResult<T> is generic", qr.ok === true && qr.data?.run_ref === "run-001");
}

// ═══════════════════════════════════════════════════════════════════
// 2. Route Policy — Perplexity + New Task Types
// ═══════════════════════════════════════════════════════════════════

function testRoutePolicy(): void {
  header("Route Policy — Perplexity + New Task Types");

  // New task types route correctly
  const research = resolveRoute("research");
  assert("research → perplexity", research.provider === "perplexity" && !research.blocked);

  const validation = resolveRoute("validation");
  assert("validation → perplexity", validation.provider === "perplexity" && !validation.blocked);

  const structured = resolveRoute("structured_output");
  assert("structured_output → openai", structured.provider === "openai" && !structured.blocked);

  const lowPriority = resolveRoute("low_priority");
  assert("low_priority → local", lowPriority.provider === "local" && !lowPriority.blocked);

  // Existing routes unchanged
  const planner = resolveRoute("planner");
  assert("planner → openai (unchanged)", planner.provider === "openai");

  const transform = resolveRoute("transform");
  assert("transform → local (unchanged)", transform.provider === "local");

  const format = resolveRoute("format");
  assert("format → deterministic (unchanged)", format.provider === "deterministic");

  // Escalation chain
  const perplexityEsc = getEscalationTarget("perplexity");
  assert("perplexity escalates to openai", perplexityEsc === "openai");

  const localEsc = getEscalationTarget("local");
  assert("local escalates to openai", localEsc === "openai");

  // Offline mode blocks perplexity
  const offlineResearch = resolveRoute("research", { offline: true });
  assert("offline blocks research", offlineResearch.blocked === true);

  // Must-be-local overrides perplexity
  const localOverride = resolveRoute("research", { mustBeLocal: true });
  assert("mustBeLocal overrides perplexity → local", localOverride.provider === "local");

  // Cost tier gating
  const costGated = resolveRoute("research", { maxCostTier: 1 });
  assert("maxCostTier 1 downgrades perplexity → local", costGated.provider === "local");

  // Preferred provider override
  const preferLocal = resolveRoute("research", undefined, "local");
  assert("preferred provider overrides default", preferLocal.provider === "local");
}

// ═══════════════════════════════════════════════════════════════════
// 3. Result Shape — New Task Types
// ═══════════════════════════════════════════════════════════════════

function testResultShape(): void {
  header("Result Shape — New Task Types");

  const types: TaskType[] = ["research", "validation", "structured_output", "low_priority"];
  for (const t of types) {
    const result = createResult({ taskType: t, ok: true, output: { data: "test" } });
    assert(`createResult accepts ${t}`, result.ok === true && result.taskType === t);
  }

  // Original types still work
  const original: TaskType[] = ["planner", "transform", "format", "local_agent", "retrieval_augmented_answer"];
  for (const t of original) {
    const result = createResult({ taskType: t });
    assert(`createResult still accepts ${t}`, result.taskType === t);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. R2 Key Generation
// ═══════════════════════════════════════════════════════════════════

function testR2Keys(): void {
  header("R2 — Key Generation");

  const key1 = missionArtifactKey("run-001", "report.json");
  assert("missionArtifactKey format", key1 === "missions/run-001/report.json");

  const key2 = missionArtifactKey("run-abc-123", "output.txt");
  assert("key with complex run ref", key2 === "missions/run-abc-123/output.txt");

  const key3 = missionArtifactKey("run-001", "result.json");
  assert("result.json key", key3 === "missions/run-001/result.json");
}

// ═══════════════════════════════════════════════════════════════════
// 5. Execution Logger — Dry Run
// ═══════════════════════════════════════════════════════════════════

async function testExecutionLoggerDryRun(): Promise<void> {
  header("Execution Logger — Dry Run");

  const dryConfig: ExecutionLoggerConfig = { dryRun: true };
  const envelope = {
    mission_type: "build_and_review" as const,
    objective: "Test mission",
    input: { key: "value" },
  };

  // logRunStart returns null in dry-run
  const runId = await executionLogger.logRunStart("test-run", envelope, dryConfig);
  assert("logRunStart dry-run returns null", runId === null);

  // logRunComplete doesn't throw in dry-run
  const resultEnvelope = {
    ok: true,
    mission_id: "test-run",
    mission_type: "build_and_review" as const,
    status: "completed" as const,
    summary: "Done",
    artifacts: [],
    alerts: [],
    metrics: { durationMs: 100, steps: 1, rolesUsed: ["architect" as const], escalations: 0 },
    failure_ref: null,
  };
  await executionLogger.logRunComplete("test-run", resultEnvelope, dryConfig);
  assert("logRunComplete dry-run succeeds", true);

  // logFullMissionExecution dry-run
  const missionResult: import("../agent-roles/mission-types.js").MissionResult = {
    missionId: "test-run",
    objective: "Test",
    ok: true,
    status: "completed",
    state: {
      missionId: "test-run",
      status: "completed",
      plan: null,
      executionOutput: null,
      validationResult: null,
      alerts: [],
      escalations: [],
      memoryRefs: [],
      sharedData: {},
    },
    pipelineResults: [],
    durationMs: 100,
    escalationCount: 0,
    warnings: [],
    error: null,
  };
  await executionLogger.logFullMissionExecution(
    "test-run",
    envelope,
    missionResult,
    resultEnvelope,
    dryConfig,
  );
  assert("logFullMissionExecution dry-run succeeds", true);
}

// ═══════════════════════════════════════════════════════════════════
// 6. Config — New Env Vars Present
// ═══════════════════════════════════════════════════════════════════

function testConfig(): void {
  header("Config — New Env Vars");

  // Verify RuntimeConfig has the new fields (they'll be empty strings without .env)
  assert("config.supabaseUrl exists", typeof runtimeConfig.supabaseUrl === "string");
  assert("config.supabaseServiceRoleKey exists", typeof runtimeConfig.supabaseServiceRoleKey === "string");
  assert("config.neonDatabaseUrl exists", typeof runtimeConfig.neonDatabaseUrl === "string");
  assert("config.r2Endpoint exists", typeof runtimeConfig.r2Endpoint === "string");
  assert("config.r2AccessKeyId exists", typeof runtimeConfig.r2AccessKeyId === "string");
  assert("config.r2SecretAccessKey exists", typeof runtimeConfig.r2SecretAccessKey === "string");
  assert("config.r2BucketName exists", typeof runtimeConfig.r2BucketName === "string");
}

// ═══════════════════════════════════════════════════════════════════
// 7. Type-Level Checks for Hooks + Replay
// ═══════════════════════════════════════════════════════════════════

function testTypeChecks(): void {
  header("Type-Level Checks — Hooks + Replay");

  // ProductionMissionConfig shape
  const hookConfig: ProductionMissionConfig = {
    dryRun: true,
  };
  assert("ProductionMissionConfig accepts dryRun", hookConfig.dryRun === true);

  const fullHookConfig: ProductionMissionConfig = {
    supabase: { url: "https://test.supabase.co", serviceRoleKey: "test" },
    neon: { dryRun: true },
    r2: { endpoint: "https://r2.test.com", accessKeyId: "key", secretAccessKey: "secret", bucketName: "test" },
    entry: { dryRun: true },
    dryRun: false,
  };
  assert("ProductionMissionConfig accepts full config", fullHookConfig.dryRun === false);

  // ReplayConfig shape
  const replayConfig: ReplayConfig = {
    includeR2: true,
  };
  assert("ReplayConfig accepts includeR2", replayConfig.includeR2 === true);

  // ReplayReport shape check
  const report: ReplayReport = {
    runRef: "run-001",
    ok: true,
    error: null,
    summary: "Test replay",
    data: null,
    resultEnvelope: null,
  };
  assert("ReplayReport creates valid shape", report.ok === true);

  // NeonConfig shape
  const neonCfg: NeonConfig = { databaseUrl: "postgres://user:pass@host/db" };
  assert("NeonConfig accepts databaseUrl", neonCfg.databaseUrl.length > 0);

  // SupabaseConfig shape
  const supabaseCfg: SupabaseConfig = { url: "https://test.supabase.co", serviceRoleKey: "test" };
  assert("SupabaseConfig accepts url + serviceRoleKey", supabaseCfg.url.length > 0);
}

// ═══════════════════════════════════════════════════════════════════
// Run all
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log("=== Production Architecture Tests ===");

  testDbTypes();
  testRoutePolicy();
  testResultShape();
  testR2Keys();
  await testExecutionLoggerDryRun();
  testConfig();
  testTypeChecks();

  console.log(`\n── Summary: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
