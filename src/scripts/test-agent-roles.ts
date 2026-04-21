/**
 * Test: Agent Role Orchestration Layer
 *
 * Validates:
 * - AgentRole types and defaults
 * - Individual role handlers (planner, executor, validator, monitor)
 * - Pipeline runner (sequential execution, output chaining)
 * - Validator rejection → executor retry loop
 * - Timeout handling
 * - Pipeline factory (standard, exec-validate, monitor-only)
 * - Edge cases (empty pipeline, all failures, no health checks)
 */

import type {
  AgentRoleKind,
  RoleHandler,
  RoleStepInput,
  RoleStepOutput,
  PipelineStage,
  AgentPipelineDefinition,
} from "../agent-roles/agent-role-types.js";
import { ROLE_DEFAULTS } from "../agent-roles/agent-role-types.js";
import { runAgentPipeline } from "../agent-roles/pipeline-runner.js";
import { createValidatorHandler } from "../agent-roles/handlers/validator-handler.js";
import type { ValidatorInput, ValidatorRule } from "../agent-roles/handlers/validator-handler.js";
import { createMonitorHandler } from "../agent-roles/handlers/monitor-handler.js";
import type { MonitorInput } from "../agent-roles/handlers/monitor-handler.js";
import {
  buildStandardPipeline,
  buildExecValidatePipeline,
  buildMonitorPipeline,
  ROLE_HANDLER_FACTORIES,
} from "../agent-roles/pipeline-factory.js";

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

function createMockHandler(
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
        error: ok ? null : "Mock failure",
      };
    },
  };
}

/** Executor that fails N times then succeeds. */
function createFlappyExecutor(failCount: number): RoleHandler {
  let calls = 0;
  return {
    role: "executor",
    async execute(input: RoleStepInput): Promise<RoleStepOutput> {
      calls++;
      const shouldFail = calls <= failCount;
      return {
        ok: !shouldFail,
        role: "executor",
        output: shouldFail ? null : { result: "recovered", attempt: calls },
        durationMs: 1,
        retries: 0,
        warnings: [],
        error: shouldFail ? `Attempt ${calls} failed` : null,
      };
    },
  };
}

/** Validator that rejects N times then passes. */
function createFlappyValidator(rejectCount: number): RoleHandler {
  let calls = 0;
  return {
    role: "validator",
    async execute(input: RoleStepInput): Promise<RoleStepOutput> {
      calls++;
      const shouldReject = calls <= rejectCount;
      return {
        ok: !shouldReject,
        role: "validator",
        output: { passed: !shouldReject, checks: [] },
        durationMs: 1,
        retries: 0,
        warnings: shouldReject ? ["Rejected"] : [],
        error: shouldReject ? "Validation failed" : null,
      };
    },
  };
}

/** Handler that takes too long (for timeout tests). */
function createSlowHandler(role: AgentRoleKind, delayMs: number): RoleHandler {
  return {
    role,
    async execute(): Promise<RoleStepOutput> {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        ok: true,
        role,
        output: { slow: true },
        durationMs: delayMs,
        retries: 0,
        warnings: [],
        error: null,
      };
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────

async function main() {
  console.log("═══ Agent Role Orchestration Layer Tests ═══");

  // ── 1. Role Defaults ──────────────────────────────────────────
  header("1. Role Defaults");

  assert("planner defaults exist", ROLE_DEFAULTS.planner.kind === "planner");
  assert("planner intelligence = high", ROLE_DEFAULTS.planner.intelligenceTier === "high");
  assert("executor defaults exist", ROLE_DEFAULTS.executor.kind === "executor");
  assert("executor intelligence = low", ROLE_DEFAULTS.executor.intelligenceTier === "low");
  assert("executor maxCostTier = 1", ROLE_DEFAULTS.executor.routingConstraints.maxCostTier === 1);
  assert("validator defaults exist", ROLE_DEFAULTS.validator.kind === "validator");
  assert("validator intelligence = deterministic", ROLE_DEFAULTS.validator.intelligenceTier === "deterministic");
  assert("validator maxRetries = 0", ROLE_DEFAULTS.validator.maxRetries === 0);
  assert("monitor defaults exist", ROLE_DEFAULTS.monitor.kind === "monitor");
  assert("monitor intelligence = low", ROLE_DEFAULTS.monitor.intelligenceTier === "low");

  // ── 2. Validator Handler (deterministic) ──────────────────────
  header("2. Validator Handler");

  const validator = createValidatorHandler();
  assert("validator handler role = validator", validator.role === "validator");

  // Test: all checks pass
  const passResult = await validator.execute({
    task: "validate",
    payload: {
      rules: [
        { field: "name", check: "exists" as const },
        { field: "name", check: "isString" as const },
        { field: "items", check: "isArray" as const },
      ],
    } satisfies ValidatorInput,
    previousOutput: { name: "test", items: [1, 2, 3] },
  });
  assert("all checks pass → ok=true", passResult.ok);
  assert("all checks pass → output.passed=true", (passResult.output as { passed: boolean })?.passed === true);
  assert("3 checks run", (passResult.output as { checks: unknown[] })?.checks.length === 3);

  // Test: some checks fail
  const failResult = await validator.execute({
    task: "validate",
    payload: {
      rules: [
        { field: "missing", check: "exists" as const },
        { field: "name", check: "isString" as const },
      ],
    } satisfies ValidatorInput,
    previousOutput: { name: "test" },
  });
  assert("missing field → ok=false", !failResult.ok);
  assert("1 of 2 checks failed", failResult.error !== null && failResult.error.includes("1/2"));

  // Test: nonEmpty check
  const emptyResult = await validator.execute({
    task: "validate",
    payload: { rules: [{ field: "data", check: "nonEmpty" as const }] } satisfies ValidatorInput,
    previousOutput: { data: "" },
  });
  assert("empty string → nonEmpty fails", !emptyResult.ok);

  // Test: matches check
  const matchResult = await validator.execute({
    task: "validate",
    payload: {
      rules: [{ field: "email", check: "matches" as const, pattern: "^.+@.+\\..+$" }],
    } satisfies ValidatorInput,
    previousOutput: { email: "user@example.com" },
  });
  assert("email matches pattern → passes", matchResult.ok);

  // Test: no previousOutput
  const nullResult = await validator.execute({
    task: "validate",
    payload: { rules: [{ field: "x", check: "exists" as const }] } satisfies ValidatorInput,
  });
  assert("null previousOutput → fails", !nullResult.ok);
  assert("null previousOutput → error message", nullResult.error?.includes("null") ?? false);

  // Test: nested field resolution
  const nestedResult = await validator.execute({
    task: "validate",
    payload: {
      rules: [{ field: "a.b.c", check: "exists" as const }],
    } satisfies ValidatorInput,
    previousOutput: { a: { b: { c: 42 } } },
  });
  assert("nested field a.b.c exists", nestedResult.ok);

  // Test: isObject check
  const objResult = await validator.execute({
    task: "validate",
    payload: {
      rules: [
        { field: "config", check: "isObject" as const },
        { field: "items", check: "isObject" as const },
      ],
    } satisfies ValidatorInput,
    previousOutput: { config: { a: 1 }, items: [1, 2] },
  });
  assert("isObject: object passes, array fails", !objResult.ok);

  // ── 3. Monitor Handler (observation) ──────────────────────────
  header("3. Monitor Handler");

  const monitor = createMonitorHandler();
  assert("monitor handler role = monitor", monitor.role === "monitor");

  // Test: no health checks → always healthy
  const noChecksResult = await monitor.execute({
    task: "observe",
    payload: { checkDescription: "no checks test" } satisfies MonitorInput,
    previousOutput: { anything: true },
  });
  assert("no checks → ok=true", noChecksResult.ok);
  assert("no checks → healthy=true", (noChecksResult.output as { healthy: boolean })?.healthy === true);

  // Test: all checks pass
  const healthyResult = await monitor.execute({
    task: "observe",
    payload: {
      checkDescription: "system status",
      healthChecks: [
        { name: "data-exists", check: (d) => d !== null && d !== undefined },
        { name: "has-status", check: (d) => typeof d === "object" && d !== null && "status" in d },
      ],
    } satisfies MonitorInput,
    previousOutput: { status: "ok" },
  });
  assert("healthy checks → ok=true", healthyResult.ok);
  assert("2/2 checks passed", (healthyResult.output as { checksPassed: number })?.checksPassed === 2);

  // Test: some checks fail → still ok (monitor reports, doesn't block)
  const unhealthyResult = await monitor.execute({
    task: "observe",
    payload: {
      checkDescription: "partial failure",
      healthChecks: [
        { name: "always-pass", check: () => true },
        { name: "always-fail", check: () => false },
      ],
    } satisfies MonitorInput,
    previousOutput: {},
  });
  assert("unhealthy → ok=true (monitor reports, doesn't block)", unhealthyResult.ok);
  assert("unhealthy → 1 warning", unhealthyResult.warnings.length === 1);
  assert("unhealthy → healthy=false", (unhealthyResult.output as { healthy: boolean })?.healthy === false);

  // Test: snapshot override
  const snapshotResult = await monitor.execute({
    task: "observe",
    payload: {
      checkDescription: "snapshot test",
      snapshot: { custom: true },
      healthChecks: [
        { name: "uses-snapshot", check: (d) => typeof d === "object" && d !== null && "custom" in d },
      ],
    } satisfies MonitorInput,
    previousOutput: { ignored: true },
  });
  assert("snapshot overrides previousOutput", (snapshotResult.output as { checksPassed: number })?.checksPassed === 1);

  // ── 4. Pipeline Runner — Happy Path ───────────────────────────
  header("4. Pipeline Runner — Happy Path");

  const happyPipeline: AgentPipelineDefinition = {
    id: "test-happy",
    description: "All stages succeed",
    stages: [
      { role: "planner", handler: createMockHandler("planner", { plan: ["step1"] }) },
      { role: "executor", handler: createMockHandler("executor", { result: "done", summary: "executed" }) },
      { role: "validator", handler: createMockHandler("validator", { passed: true, checks: [] }) },
      { role: "monitor", handler: createMockHandler("monitor", { healthy: true }) },
    ],
    validatorCanReject: true,
  };

  const happyResult = await runAgentPipeline(happyPipeline);
  assert("happy path → ok=true", happyResult.ok);
  assert("happy path → 4 stages completed", happyResult.stagesCompleted === 4);
  assert("happy path → 4 total stages", happyResult.totalStages === 4);
  assert("happy path → 0 rejections", happyResult.rejections === 0);
  assert("happy path → finalOutput is monitor output", (happyResult.finalOutput as { healthy: boolean })?.healthy === true);
  assert("happy path → error is null", happyResult.error === null);
  assert("happy path → pipelineId matches", happyResult.pipelineId === "test-happy");
  assert("happy path → durationMs > 0", happyResult.durationMs >= 0);

  // ── 5. Pipeline Runner — Stage Failure ────────────────────────
  header("5. Pipeline Runner — Stage Failure");

  const failPipeline: AgentPipelineDefinition = {
    id: "test-fail",
    description: "Executor fails",
    stages: [
      { role: "planner", handler: createMockHandler("planner", { plan: ["step1"] }) },
      { role: "executor", handler: createMockHandler("executor", null, false) },
      { role: "validator", handler: createMockHandler("validator", { passed: true }) },
    ],
    validatorCanReject: false,
  };

  const failPipeResult = await runAgentPipeline(failPipeline);
  assert("executor failure → ok=false", !failPipeResult.ok);
  assert("executor failure → 1 stage completed (planner)", failPipeResult.stagesCompleted === 1);
  assert("executor failure → error present", failPipeResult.error !== null);

  // ── 6. Validator Rejection → Executor Retry ───────────────────
  header("6. Validator Rejection → Executor Retry");

  const retryPipeline: AgentPipelineDefinition = {
    id: "test-retry",
    description: "Validator rejects once, executor retries",
    stages: [
      { role: "executor", handler: createMockHandler("executor", { result: "data", summary: "ok" }) },
      { role: "validator", handler: createFlappyValidator(1) },
    ],
    validatorCanReject: true,
  };

  const retryResult = await runAgentPipeline(retryPipeline);
  assert("retry pipeline → ok=true (recovered)", retryResult.ok);
  assert("retry pipeline → 1 rejection", retryResult.rejections === 1);
  assert("retry pipeline → warnings mention rejection", retryResult.warnings.some((w) => w.includes("rejected")));

  // ── 7. Validator Rejection Exhausted ──────────────────────────
  header("7. Validator Rejection Exhausted");

  const exhaustedPipeline: AgentPipelineDefinition = {
    id: "test-exhausted",
    description: "Validator always rejects",
    stages: [
      {
        role: "executor",
        handler: createMockHandler("executor", { result: "data" }),
        config: { maxRetries: 1 },
      },
      { role: "validator", handler: createMockHandler("validator", null, false) },
    ],
    validatorCanReject: true,
  };

  const exhaustedResult = await runAgentPipeline(exhaustedPipeline);
  assert("exhausted → ok=false", !exhaustedResult.ok);
  assert("exhausted → error mentions max retries", exhaustedResult.error?.includes("max retries") ?? false);

  // ── 8. Output Chaining ────────────────────────────────────────
  header("8. Output Chaining");

  let capturedPrevious: unknown = "NOT_SET";
  const chainingPipeline: AgentPipelineDefinition = {
    id: "test-chain",
    description: "Output chains between stages",
    stages: [
      { role: "executor", handler: createMockHandler("executor", { step: "first" }) },
      {
        role: "monitor",
        handler: {
          role: "monitor",
          async execute(input) {
            capturedPrevious = input.previousOutput;
            return {
              ok: true, role: "monitor", output: { observed: true },
              durationMs: 1, retries: 0, warnings: [], error: null,
            };
          },
        },
      },
    ],
    validatorCanReject: false,
  };

  await runAgentPipeline(chainingPipeline);
  assert("output chains: monitor receives executor output",
    typeof capturedPrevious === "object" && capturedPrevious !== null && "step" in capturedPrevious);

  // ── 9. Timeout Handling ───────────────────────────────────────
  header("9. Timeout Handling");

  const timeoutPipeline: AgentPipelineDefinition = {
    id: "test-timeout",
    description: "Stage times out",
    stages: [
      {
        role: "executor",
        handler: createSlowHandler("executor", 2000),
        config: { timeoutMs: 50 },
      },
    ],
    validatorCanReject: false,
  };

  const timeoutResult = await runAgentPipeline(timeoutPipeline);
  assert("timeout → ok=false", !timeoutResult.ok);
  assert("timeout → error mentions timeout", timeoutResult.error?.includes("timed out") ?? false);

  // ── 10. Empty Pipeline ────────────────────────────────────────
  header("10. Empty Pipeline");

  const emptyPipeline: AgentPipelineDefinition = {
    id: "test-empty",
    description: "No stages",
    stages: [],
    validatorCanReject: false,
  };

  const emptyPipeResult = await runAgentPipeline(emptyPipeline);
  assert("empty pipeline → ok=true", emptyPipeResult.ok);
  assert("empty pipeline → 0 stages", emptyPipeResult.stagesCompleted === 0);
  assert("empty pipeline → finalOutput null", emptyPipeResult.finalOutput === null);

  // ── 11. Pipeline Factory ──────────────────────────────────────
  header("11. Pipeline Factory");

  const standard = buildStandardPipeline("std-test", "Standard pipeline");
  assert("standard pipeline has 4 stages", standard.stages.length === 4);
  assert("standard pipeline roles: P→E→V→M",
    standard.stages[0]!.role === "planner" &&
    standard.stages[1]!.role === "executor" &&
    standard.stages[2]!.role === "validator" &&
    standard.stages[3]!.role === "monitor");
  assert("standard pipeline validatorCanReject=true", standard.validatorCanReject);

  const execVal = buildExecValidatePipeline("ev-test", "Exec-Validate");
  assert("exec-validate has 2 stages", execVal.stages.length === 2);
  assert("exec-validate roles: E→V",
    execVal.stages[0]!.role === "executor" &&
    execVal.stages[1]!.role === "validator");

  const monitorOnly = buildMonitorPipeline("mon-test", "Monitor Only");
  assert("monitor-only has 1 stage", monitorOnly.stages.length === 1);
  assert("monitor-only role = monitor", monitorOnly.stages[0]!.role === "monitor");
  assert("monitor-only validatorCanReject=false", !monitorOnly.validatorCanReject);

  const skipPlanner = buildStandardPipeline("no-plan", "No planner", { skipPlanner: true });
  assert("skipPlanner → 3 stages", skipPlanner.stages.length === 3);
  assert("skipPlanner → first role is executor", skipPlanner.stages[0]!.role === "executor");

  const skipMonitor = buildStandardPipeline("no-mon", "No monitor", { skipMonitor: true });
  assert("skipMonitor → 3 stages", skipMonitor.stages.length === 3);
  assert("skipMonitor → last role is validator", skipMonitor.stages[2]!.role === "validator");

  // ── 12. Role Handler Factories ────────────────────────────────
  header("12. Role Handler Factories");

  assert("ROLE_HANDLER_FACTORIES has planner", typeof ROLE_HANDLER_FACTORIES.planner === "function");
  assert("ROLE_HANDLER_FACTORIES has executor", typeof ROLE_HANDLER_FACTORIES.executor === "function");
  assert("ROLE_HANDLER_FACTORIES has validator", typeof ROLE_HANDLER_FACTORIES.validator === "function");
  assert("ROLE_HANDLER_FACTORIES has monitor", typeof ROLE_HANDLER_FACTORIES.monitor === "function");

  // ── 13. Flappy Executor in Pipeline ───────────────────────────
  header("13. Flappy Executor Recovery");

  const flappyPipeline: AgentPipelineDefinition = {
    id: "test-flappy",
    description: "Executor fails once, retries succeed",
    stages: [
      {
        role: "executor",
        handler: createFlappyExecutor(1),
        config: { maxRetries: 2 },
      },
      { role: "validator", handler: createMockHandler("validator", { passed: true, checks: [] }) },
    ],
    validatorCanReject: false,
  };

  const flappyResult = await runAgentPipeline(flappyPipeline);
  assert("flappy executor → ok=true (recovered on retry)", flappyResult.ok);

  // ── 14. Multiple Validator Checks ─────────────────────────────
  header("14. Complex Validator Scenarios");

  const complexValidator = createValidatorHandler();

  // Empty array is nonEmpty fail
  const emptyArrayResult = await complexValidator.execute({
    task: "validate",
    payload: { rules: [{ field: "items", check: "nonEmpty" as const }] } satisfies ValidatorInput,
    previousOutput: { items: [] },
  });
  assert("empty array → nonEmpty fails", !emptyArrayResult.ok);

  // Multiple rules on same field
  const multiRuleResult = await complexValidator.execute({
    task: "validate",
    payload: {
      rules: [
        { field: "name", check: "exists" as const },
        { field: "name", check: "nonEmpty" as const },
        { field: "name", check: "isString" as const },
        { field: "name", check: "matches" as const, pattern: "^[A-Z]" },
      ],
    } satisfies ValidatorInput,
    previousOutput: { name: "Alice" },
  });
  assert("multiple rules on same field all pass", multiRuleResult.ok);
  assert("4 checks returned", (multiRuleResult.output as { checks: unknown[] })?.checks.length === 4);

  // Pattern mismatch
  const patternFailResult = await complexValidator.execute({
    task: "validate",
    payload: {
      rules: [{ field: "name", check: "matches" as const, pattern: "^[0-9]+" }],
    } satisfies ValidatorInput,
    previousOutput: { name: "Alice" },
  });
  assert("pattern mismatch fails", !patternFailResult.ok);

  // ── Summary ───────────────────────────────────────────────────
  console.log(`\n═══ Results: ${passed}/${passed + failed} passed ═══`);
  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) FAILED`);
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
