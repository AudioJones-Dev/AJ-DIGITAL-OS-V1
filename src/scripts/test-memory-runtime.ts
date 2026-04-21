/**
 * Smoke test for memory-runtime hooks + retrieval layer.
 *
 * Exercises beforeRun → afterRun and beforeRun → onFailure flows,
 * verifies retrieval returns structured context with priority/bounded
 * logs, and confirms memory reuse across runs.
 */
import path from "node:path";
import { readFile, rm } from "node:fs/promises";
import { CognitiveMemoryStore } from "../memory-runtime/store.js";
import { beforeRun, afterRun, onFailure, setMemoryStore } from "../memory-runtime/hooks.js";
import { retrieve, type RetrievedContext } from "../memory-runtime/retrieval.js";

const TEST_ROOT = path.resolve("output", "test-memory-runtime");

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.log(`  ✗ ${label}`);
      failed++;
    }
  }

  // Clean slate
  await rm(TEST_ROOT, { recursive: true, force: true });

  // Wire up store with test root
  const store = new CognitiveMemoryStore({
    cognitiveRoot: TEST_ROOT,
    logsDir: path.join(TEST_ROOT, "logs"),
    mistakesFile: path.join(TEST_ROOT, "mistakes.md"),
    workingContextFile: path.join(TEST_ROOT, "working-context.md"),
    maxRecentLogs: 3,
    maxPromptContextChars: 12_000,
  });
  setMemoryStore(store);

  // ── Test 1: beforeRun bootstraps RunContext ────────────────────
  console.log("\n[Test 1] beforeRun bootstraps RunContext");
  const ctx = await beforeRun({ workflow: "test-workflow", task: "unit test" });
  assert(typeof ctx.runId === "string" && ctx.runId.length > 0, "runId generated");
  assert(ctx.workflow === "test-workflow", "workflow set");
  assert(ctx.task === "unit test", "task set");
  assert(ctx.stepCount === 0, "stepCount starts at 0");
  assert(Array.isArray(ctx.notes), "notes is array");
  assert(ctx.cognitiveContext.workingContext === "", "working context empty on fresh store");
  assert(ctx.cognitiveContext.lastRun === null, "lastRun null on fresh store");
  assert(ctx.cognitiveContext.lastFailure === null, "lastFailure null on fresh store");
  assert(ctx.cognitiveContext.recentLogs.length === 0, "no recent logs on fresh store");
  assert(ctx.cognitiveContext.mistakes.length === 0, "no mistakes on fresh store");

  // ── Test 2: afterRun writes run log + working context ─────────
  console.log("\n[Test 2] afterRun writes memory records");
  ctx.stepCount = 3;
  ctx.extractedData = { project_id: "abc123" };
  ctx.outputFiles = ["output/test.env"];
  ctx.notes.push("Extracted 1 field");

  const afterResult = await afterRun(ctx);
  assert(afterResult.ok, "afterRun returns ok");
  assert(afterResult.warnings.length === 0, "no warnings");

  // Verify working context written
  const wc = await readFile(path.join(TEST_ROOT, "working-context.md"), "utf-8");
  assert(wc.includes("test-workflow"), "working context contains workflow name");
  assert(wc.includes(ctx.runId), "working context contains run ID");

  // Verify daily log written
  const today = new Date().toISOString().slice(0, 10) + ".md";
  const log = await readFile(path.join(TEST_ROOT, "logs", today), "utf-8");
  assert(log.includes("test-workflow"), "daily log contains workflow name");

  // Verify run log JSON written
  const runLogPath = path.join(TEST_ROOT, "run-logs", `${ctx.runId}.json`);
  const runLog = JSON.parse(await readFile(runLogPath, "utf-8"));
  assert(runLog.type === "run_log", "run log type correct");
  assert(runLog.workflow === "test-workflow", "run log workflow correct");

  // ── Test 3: onFailure writes mistake + failure log ────────────
  console.log("\n[Test 3] onFailure writes mistakes and failure log");
  const ctx2 = await beforeRun({ workflow: "fail-workflow", task: "break things" });
  const failResult = await onFailure(ctx2, new Error("Something broke"));
  assert(failResult.ok, "onFailure returns ok");
  assert(failResult.error === "Something broke", "error message captured");

  // Verify mistake written
  const mistakes = await readFile(path.join(TEST_ROOT, "mistakes.md"), "utf-8");
  assert(mistakes.includes("fail-workflow"), "mistake references workflow");
  assert(mistakes.includes("Something broke"), "mistake references error");

  // Verify working context updated to failure
  const wc2 = await readFile(path.join(TEST_ROOT, "working-context.md"), "utf-8");
  assert(wc2.includes("FAILURE"), "working context shows failure");

  // ── Test 4: beforeRun loads existing memory via retrieval ─────
  console.log("\n[Test 4] beforeRun loads existing memory via retrieval");
  const ctx3 = await beforeRun({ workflow: "fail-workflow", task: "retry" });
  assert(ctx3.cognitiveContext.workingContext.includes("FAILURE"), "loaded previous working context");
  assert(ctx3.cognitiveContext.recentLogs.length > 0, "loaded recent logs");
  assert(ctx3.cognitiveContext.mistakes.length > 0, "loaded relevant mistakes");

  // ── Test 5: Retrieval returns structured context ───────────────
  console.log("\n[Test 5] Retrieval returns structured lastRun + lastFailure");
  const retrieved: RetrievedContext = await retrieve(store, "test-workflow");
  assert(retrieved.workingContext.length > 0, "workingContext populated");
  assert(retrieved.lastRun !== null, "lastRun found");
  assert(retrieved.lastRun !== null && !retrieved.lastRun.tags.includes("failure"), "lastRun is not a failure");
  assert(retrieved.lastFailure !== null, "lastFailure found");
  assert(retrieved.lastFailure !== null && retrieved.lastFailure.tags.includes("failure"), "lastFailure is tagged failure");
  assert(retrieved.recentLogs.length > 0, "recentLogs populated");
  assert(retrieved.totalChars > 0, "totalChars > 0");
  assert(typeof retrieved.charCounts.working_context === "number", "charCounts has working_context");

  // ── Test 6: Logs are bounded ──────────────────────────────────
  console.log("\n[Test 6] Retrieval bounds recent logs");
  // Write 5 extra log entries to exceed maxRecentLogs (3)
  for (let i = 0; i < 5; i++) {
    await store.appendDailyLog(`Extra log entry ${i}`);
  }
  const retrieved2: RetrievedContext = await retrieve(store, "test-workflow");
  assert(retrieved2.recentLogs.length <= store.config.maxRecentLogs, `recentLogs bounded to ${store.config.maxRecentLogs}`);

  // ── Test 7: Memory reuse across runs ──────────────────────────
  console.log("\n[Test 7] Memory reuse: second run sees first run's data");
  const ctx4 = await beforeRun({ workflow: "test-workflow", task: "second run" });
  ctx4.stepCount = 1;
  ctx4.notes.push("Second run note");
  await afterRun(ctx4);

  const ctx5 = await beforeRun({ workflow: "test-workflow", task: "third run" });
  assert(ctx5.cognitiveContext.workingContext.includes("second run"), "third run sees second run's working context");
  assert(ctx5.cognitiveContext.lastRun !== null, "third run sees a lastRun");

  // ── Test 8: Failure memory injected into next run ─────────────
  console.log("\n[Test 8] Failure memory injected into next run");
  const ctxFail = await beforeRun({ workflow: "fail-workflow", task: "will fail" });
  await onFailure(ctxFail, new Error("DB timeout"));

  const ctxAfterFail = await beforeRun({ workflow: "fail-workflow", task: "recover" });
  assert(ctxAfterFail.cognitiveContext.lastFailure !== null, "next run sees lastFailure");
  assert(
    ctxAfterFail.cognitiveContext.lastFailure !== null &&
    ctxAfterFail.cognitiveContext.lastFailure.content.includes("DB timeout"),
    "lastFailure contains error message",
  );
  assert(ctxAfterFail.cognitiveContext.mistakes.length > 0, "mistakes loaded for workflow");

  // ── Summary ────────────────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Memory Runtime + Retrieval: ${passed} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Cleanup
  await rm(TEST_ROOT, { recursive: true, force: true });

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
