import { beforeRun, afterRun, onFailure } from "../memory-runtime/hooks.js";
import { CognitiveMemoryStore } from "../memory-runtime/store.js";
import type { OrchestratorWorkflow, OrchestratorResult } from "./orchestrator-types.js";
import { runSteps } from "./workflow-runner.js";

// ── Orchestrator ───────────────────────────────────────────────────

/**
 * Execute an orchestrator workflow end-to-end.
 *
 * Lifecycle:
 *   1. beforeRun() — bootstrap memory context
 *   2. runSteps()  — execute each step sequentially, chaining outputs
 *   3. afterRun()  — persist memory on success
 *      onFailure() — record failure context on error
 *
 * Returns a structured result with per-step detail.
 */
export async function executeWorkflow(
  workflow: OrchestratorWorkflow,
): Promise<OrchestratorResult> {
  const start = Date.now();
  const warnings: string[] = [];

  // 1. Bootstrap memory
  const runContext = await beforeRun({
    workflow: workflow.id,
    task: workflow.description,
    memoryPolicy: workflow.memoryPolicy,
  });

  const store = new CognitiveMemoryStore();

  // Build retrieved context from cognitive context for prompt injection
  const retrievedContext = {
    workingContext: runContext.cognitiveContext.workingContext,
    lastRun: runContext.cognitiveContext.lastRun,
    lastFailure: runContext.cognitiveContext.lastFailure,
    recentLogs: runContext.cognitiveContext.recentLogs,
    charCounts: {
      working_context: runContext.cognitiveContext.workingContext.length,
      last_run: runContext.cognitiveContext.lastRun?.content.length ?? 0,
      last_failure: runContext.cognitiveContext.lastFailure?.content.length ?? 0,
      recent_logs: runContext.cognitiveContext.recentLogs.reduce(
        (sum, log) => sum + log.content.length,
        0,
      ),
    },
    totalChars: 0,
  };
  retrievedContext.totalChars =
    retrievedContext.charCounts.working_context +
    retrievedContext.charCounts.last_run +
    retrievedContext.charCounts.last_failure +
    retrievedContext.charCounts.recent_logs;

  // 2. Execute steps
  let stepResults;
  try {
    stepResults = await runSteps(workflow.steps, {
      retrievedContext,
      runContext,
      store,
    });
  } catch (err) {
    // Catastrophic runner failure
    const error = err instanceof Error ? err.message : String(err);
    await onFailure(runContext, err instanceof Error ? err : new Error(error));

    return {
      workflowId: workflow.id,
      ok: false,
      stepsCompleted: 0,
      totalSteps: workflow.steps.length,
      stepResults: [],
      durationMs: Date.now() - start,
      runContext,
      warnings,
      error,
    };
  }

  // 3. Evaluate outcome
  const allOk = stepResults.every((r) => r.ok);
  const stepsCompleted = stepResults.filter((r) => r.ok).length;

  // Collect per-step warnings
  for (const r of stepResults) {
    if (r.error) {
      warnings.push(`[${r.stepName}] ${r.error}`);
    }
  }

  // 4. Lifecycle hooks
  if (allOk) {
    runContext.notes.push(
      `Workflow ${workflow.id} completed: ${stepsCompleted}/${workflow.steps.length} steps`,
    );
    const hookResult = await afterRun(runContext);
    if (!hookResult.ok) {
      warnings.push(...hookResult.warnings);
    }
  } else {
    const failedStep = stepResults.find((r) => !r.ok);
    const failError = new Error(
      `Step "${failedStep?.stepName}" failed: ${failedStep?.error ?? "unknown"}`,
    );
    await onFailure(runContext, failError);
  }

  return {
    workflowId: workflow.id,
    ok: allOk,
    stepsCompleted,
    totalSteps: workflow.steps.length,
    stepResults,
    durationMs: Date.now() - start,
    runContext,
    warnings,
  };
}
