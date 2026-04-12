/**
 * Smoke test for memory-runtime hooks.
 *
 * Exercises beforeRun → afterRun and beforeRun → onFailure flows,
 * then verifies files were written to disk.
 */
import path from "node:path";
import { readFile, rm } from "node:fs/promises";
import { CognitiveMemoryStore } from "../memory-runtime/store.js";
import { beforeRun, afterRun, onFailure, setMemoryStore } from "../memory-runtime/hooks.js";

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

  // ── Test 4: beforeRun loads existing memory ───────────────────
  console.log("\n[Test 4] beforeRun loads existing memory");
  const ctx3 = await beforeRun({ workflow: "fail-workflow", task: "retry" });
  assert(ctx3.cognitiveContext.workingContext.includes("FAILURE"), "loaded previous working context");
  assert(ctx3.cognitiveContext.recentLogs.length > 0, "loaded recent logs");
  assert(ctx3.cognitiveContext.mistakes.length > 0, "loaded relevant mistakes");

  // ── Summary ────────────────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Memory Runtime Hooks: ${passed} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Cleanup
  await rm(TEST_ROOT, { recursive: true, force: true });

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
