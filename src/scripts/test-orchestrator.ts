/**
 * Test: Workflow Orchestrator Layer
 *
 * Validates the step runner and orchestrator with mock steps:
 * - Sequential step execution with output chaining
 * - Stop-on-failure behavior
 * - StoreMemory step injects into RunContext
 * - Validate step with passing and failing rules
 * - Full orchestrator lifecycle (beforeRun → steps → afterRun)
 */
import path from "node:path";
import { rm } from "node:fs/promises";
import { CognitiveMemoryStore } from "../memory-runtime/store.js";
import { setMemoryStore } from "../memory-runtime/hooks.js";
import type {
  OrchestratorWorkflow,
  OrchestratorStep,
  StepResult,
} from "../workflows/orchestrator-types.js";
import { runSteps, type RunnerOptions } from "../workflows/workflow-runner.js";
import { executeWorkflow } from "../workflows/orchestrator.js";
import type { RunContext } from "../memory-runtime/types.js";
import { safeWriteFile } from "../local-agent/file-tools.js";

const TEST_ROOT = path.resolve("output", "test-orchestrator");

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  function header(group: string): void {
    console.log(`\n── ${group} ──`);
  }

  // Clean slate
  await rm(TEST_ROOT, { recursive: true, force: true });

  // Wire up isolated memory store
  const memoryRoot = path.join(TEST_ROOT, "memory");
  const store = new CognitiveMemoryStore({
    cognitiveRoot: memoryRoot,
    logsDir: path.join(memoryRoot, "logs"),
    mistakesFile: path.join(memoryRoot, "mistakes.jsonl"),
    workingContextFile: path.join(memoryRoot, "working-context.md"),
    maxRecentLogs: 10,
    maxPromptContextChars: 12_000,
  });
  setMemoryStore(store);

  // ── Test 1: Store-memory step writes to RunContext ──────────

  header("1. Store-memory step writes to RunContext");

  const fakeRunContext: RunContext = {
    runId: "test-run-001",
    workflow: "test-orchestrator",
    task: "unit-test",
    startedAt: new Date().toISOString(),
    memoryPolicy: {
      loadWorkingContext: true,
      loadRecentLogs: true,
      loadMistakes: true,
      writeRunLog: true,
      writeMistakes: true,
      writeWorkingContext: true,
    },
    cognitiveContext: {
      workingContext: "",
      lastRun: null,
      lastFailure: null,
      recentLogs: [],
      mistakes: [],
    },
    stepCount: 0,
    extractedData: {},
    outputFiles: [],
    notes: [],
    warnings: [],
  };

  const storeSteps: OrchestratorStep[] = [
    {
      type: "store-memory",
      name: "store-test-key",
      key: "testData",
      content: "hello from test",
      tags: ["test"],
    },
  ];

  const storeResults = await runSteps(storeSteps, {
    runContext: fakeRunContext,
    store,
  });

  assert(storeResults.length === 1, "One step result returned");
  assert(storeResults[0]!.ok === true, "Store step succeeded");
  assert(storeResults[0]!.stepType === "store-memory", "Step type is store-memory");
  assert(fakeRunContext.extractedData["testData"] === "hello from test", "RunContext has extracted data");
  assert(fakeRunContext.stepCount === 1, "RunContext step count incremented");
  assert(fakeRunContext.notes.length === 1, "RunContext has note about stored key");

  // ── Test 2: Validate step — passing rules ──────────────────

  header("2. Validate step — passing rules");

  const testFilePath = path.join(TEST_ROOT, "validate-test.json");
  await safeWriteFile(testFilePath, '{"name": "test"}');

  const validatePassSteps: OrchestratorStep[] = [
    {
      type: "validate",
      name: "validate-exists",
      target: testFilePath,
      rules: [{ type: "exists" }, { type: "nonEmpty" }, { type: "validJson" }],
    },
  ];

  const validatePassResults = await runSteps(validatePassSteps);

  assert(validatePassResults.length === 1, "One validate result");
  assert(validatePassResults[0]!.ok === true, "Validate passed");

  // ── Test 3: Validate step — failing rules ──────────────────

  header("3. Validate step — failing rules");

  const missingFilePath = path.join(TEST_ROOT, "does-not-exist.json");

  const validateFailSteps: OrchestratorStep[] = [
    {
      type: "validate",
      name: "validate-missing",
      target: missingFilePath,
      rules: [{ type: "exists" }],
    },
  ];

  const validateFailResults = await runSteps(validateFailSteps);

  assert(validateFailResults.length === 1, "One validate result");
  assert(validateFailResults[0]!.ok === false, "Validate correctly failed");
  assert(typeof validateFailResults[0]!.error === "string", "Error message present");

  // ── Test 4: Stop on failure ────────────────────────────────

  header("4. Stop-on-failure behavior");

  const mixedSteps: OrchestratorStep[] = [
    {
      type: "validate",
      name: "will-fail",
      target: missingFilePath,
      rules: [{ type: "exists" }],
    },
    {
      type: "store-memory",
      name: "should-not-run",
      key: "nope",
      content: "unreachable",
    },
  ];

  const mixedResults = await runSteps(mixedSteps);

  assert(mixedResults.length === 1, "Only one step ran (stopped at failure)");
  assert(mixedResults[0]!.ok === false, "First step failed");

  // ── Test 5: Sequential step chaining ───────────────────────

  header("5. Sequential step chaining — output passes forward");

  const chainingContext: RunContext = {
    ...fakeRunContext,
    runId: "test-chain-001",
    stepCount: 0,
    extractedData: {},
    notes: [],
    warnings: [],
  };

  const chainSteps: OrchestratorStep[] = [
    {
      type: "store-memory",
      name: "store-first",
      key: "chainA",
      content: "value-A",
    },
    {
      type: "store-memory",
      name: "store-second",
      key: "chainB",
    },
  ];

  const chainResults = await runSteps(chainSteps, {
    runContext: chainingContext,
    store,
  });

  assert(chainResults.length === 2, "Both steps ran");
  assert(chainResults[0]!.ok === true, "First chain step ok");
  assert(chainResults[1]!.ok === true, "Second chain step ok");
  assert(chainingContext.extractedData["chainA"] === "value-A", "Chain A stored");
  // chainB got previous output (the result object of store-first) serialized
  assert(chainingContext.extractedData["chainB"] !== undefined, "Chain B stored from previous output");
  assert(chainingContext.stepCount === 2, "Step count is 2");

  // ── Test 6: Step timing ────────────────────────────────────

  header("6. Step timing is recorded");

  assert(storeResults[0]!.durationMs >= 0, "Duration is non-negative");
  assert(typeof storeResults[0]!.durationMs === "number", "Duration is a number");

  // ── Test 7: Full orchestrator lifecycle ────────────────────

  header("7. Full orchestrator lifecycle (executeWorkflow)");

  const testFile2 = path.join(TEST_ROOT, "orchestrator-e2e.json");
  await safeWriteFile(testFile2, '{"status": "ok"}');

  const workflow: OrchestratorWorkflow = {
    id: "test-e2e-workflow",
    description: "End-to-end orchestrator test",
    steps: [
      {
        type: "validate",
        name: "check-file",
        target: testFile2,
        rules: [{ type: "exists" }, { type: "validJson" }],
      },
      {
        type: "store-memory",
        name: "record-validation",
        key: "e2e-result",
        content: "file validated successfully",
        tags: ["e2e", "test"],
      },
    ],
  };

  const orchResult = await executeWorkflow(workflow);

  assert(orchResult.workflowId === "test-e2e-workflow", "Workflow ID matches");
  assert(orchResult.ok === true, "Orchestrator succeeded");
  assert(orchResult.stepsCompleted === 2, "Both steps completed");
  assert(orchResult.totalSteps === 2, "Total steps correct");
  assert(orchResult.stepResults.length === 2, "Two step results");
  assert(orchResult.durationMs >= 0, "Duration recorded");
  assert(orchResult.runContext !== undefined, "RunContext returned");
  assert(
    orchResult.runContext?.extractedData["e2e-result"] === "file validated successfully",
    "Memory stored via orchestrator",
  );

  // ── Test 8: Orchestrator with failing step ─────────────────

  header("8. Orchestrator with failing step triggers onFailure");

  const failWorkflow: OrchestratorWorkflow = {
    id: "test-fail-workflow",
    description: "Orchestrator failure test",
    steps: [
      {
        type: "validate",
        name: "check-missing",
        target: path.join(TEST_ROOT, "nope.txt"),
        rules: [{ type: "exists" }],
      },
      {
        type: "store-memory",
        name: "unreachable",
        key: "should-not-exist",
        content: "nope",
      },
    ],
  };

  const failResult = await executeWorkflow(failWorkflow);

  assert(failResult.workflowId === "test-fail-workflow", "Fail workflow ID matches");
  assert(failResult.ok === false, "Orchestrator correctly reports failure");
  assert(failResult.stepsCompleted === 0, "Zero steps completed");
  assert(failResult.stepResults.length === 1, "Only one step attempted");
  assert(failResult.warnings.length > 0, "Warnings contain failure info");

  // ── Test 9: Empty workflow ─────────────────────────────────

  header("9. Empty workflow succeeds");

  const emptyWorkflow: OrchestratorWorkflow = {
    id: "test-empty",
    description: "Empty workflow test",
    steps: [],
  };

  const emptyResult = await executeWorkflow(emptyWorkflow);

  assert(emptyResult.ok === true, "Empty workflow is ok");
  assert(emptyResult.stepsCompleted === 0, "Zero steps completed");
  assert(emptyResult.totalSteps === 0, "Zero total steps");

  // ── Summary ────────────────────────────────────────────────

  console.log(`\n════════════════════════════════════════`);
  console.log(`  Orchestrator tests: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════\n`);

  // Clean up
  await rm(TEST_ROOT, { recursive: true, force: true });

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(2);
});
