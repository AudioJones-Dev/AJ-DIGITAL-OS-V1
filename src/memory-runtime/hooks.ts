import { randomUUID } from "node:crypto";
import { CognitiveMemoryStore } from "./store.js";
import {
  DEFAULT_MEMORY_POLICY,
  type CognitiveContext,
  type HookResult,
  type MemoryPolicy,
  type RunContext,
} from "./types.js";
import { retrieve } from "./retrieval.js";

// ── Shared store instance ──────────────────────────────────────────

let _store: CognitiveMemoryStore | undefined;

function getStore(): CognitiveMemoryStore {
  if (!_store) {
    _store = new CognitiveMemoryStore();
  }
  return _store;
}

/** Override the default store (useful for tests). */
export function setMemoryStore(store: CognitiveMemoryStore): void {
  _store = store;
}

// ── beforeRun ──────────────────────────────────────────────────────

export interface BeforeRunInput {
  workflow: string;
  task: string;
  memoryPolicy?: MemoryPolicy | undefined;
}

/**
 * Bootstrap memory before a run.
 *
 * Uses the retrieval layer to load memory in priority order
 * (working context → last run → last failure → recent logs),
 * applying per-slot budgets and truncation, then returns a
 * fully initialised RunContext.
 */
export async function beforeRun(input: BeforeRunInput): Promise<RunContext> {
  const store = getStore();
  const policy = input.memoryPolicy ?? DEFAULT_MEMORY_POLICY;

  // Retrieve structured memory via the retrieval layer
  const retrieved = await retrieve(store, input.workflow);

  // Load mistakes separately (workflow-filtered, not slot-budgeted)
  const mistakes = policy.loadMistakes
    ? await store.getRelevantMistakes(input.workflow)
    : [];

  const cognitiveContext: CognitiveContext = {
    workingContext: policy.loadWorkingContext ? retrieved.workingContext : "",
    lastRun: retrieved.lastRun,
    lastFailure: retrieved.lastFailure,
    recentLogs: policy.loadRecentLogs ? retrieved.recentLogs : [],
    mistakes,
  };

  return {
    runId: randomUUID(),
    workflow: input.workflow,
    task: input.task,
    startedAt: new Date().toISOString(),
    memoryPolicy: policy,
    cognitiveContext,
    stepCount: 0,
    extractedData: {},
    outputFiles: [],
    notes: [],
    warnings: [],
  };
}

// ── afterRun ───────────────────────────────────────────────────────

/**
 * Persist memory after a successful run.
 *
 * Writes a run log, updates working context with a summary of
 * what happened, and returns a HookResult.
 */
export async function afterRun(ctx: RunContext): Promise<HookResult> {
  const store = getStore();
  const warnings: string[] = [];

  const summary = [
    `# ${ctx.workflow}`,
    `- Run ID: ${ctx.runId}`,
    `- Task: ${ctx.task}`,
    `- Steps: ${ctx.stepCount}`,
    `- Outputs: ${ctx.outputFiles.join(", ") || "none"}`,
    `- Notes:`,
    ...ctx.notes.map((n) => `  - ${n}`),
  ].join("\n");

  try {
    if (ctx.memoryPolicy.writeRunLog) {
      await store.writeRunLog({
        id: ctx.runId,
        type: "run_log",
        workflow: ctx.workflow,
        timestamp: new Date().toISOString(),
        content: summary,
        tags: [],
        metadata: {
          task: ctx.task,
          stepCount: ctx.stepCount,
          outputFiles: ctx.outputFiles,
          extractedKeys: Object.keys(ctx.extractedData),
        },
      });
      await store.appendDailyLog(summary);
    }

    if (ctx.memoryPolicy.writeWorkingContext) {
      await store.updateWorkingContext(summary);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown afterRun error";
    warnings.push(`afterRun write failed: ${message}`);
  }

  return { ok: true, warnings };
}

// ── onFailure ──────────────────────────────────────────────────────

/**
 * Record failure state to memory.
 *
 * Logs the error as a mistake, writes a failure run log, and updates
 * working context so subsequent runs see the last failure.
 */
export async function onFailure(ctx: RunContext, error: unknown): Promise<HookResult> {
  const store = getStore();
  const warnings: string[] = [];
  const message = error instanceof Error ? error.message : String(error);

  const failureSummary = [
    `# FAILURE — ${ctx.workflow}`,
    `- Run ID: ${ctx.runId}`,
    `- Task: ${ctx.task}`,
    `- Error: ${message}`,
  ].join("\n");

  try {
    if (ctx.memoryPolicy.writeMistakes) {
      await store.appendMistake({
        workflow: ctx.workflow,
        error: message,
        cause: "Workflow execution failure",
        fix: "Review recent logs, selectors, auth state, and schema validation.",
      });
    }

    if (ctx.memoryPolicy.writeRunLog) {
      await store.writeRunLog({
        id: ctx.runId,
        type: "run_log",
        workflow: ctx.workflow,
        timestamp: new Date().toISOString(),
        content: failureSummary,
        tags: ["failure"],
        metadata: {
          task: ctx.task,
          error: message,
          stepCount: ctx.stepCount,
        },
      });
      await store.appendDailyLog(failureSummary);
    }

    if (ctx.memoryPolicy.writeWorkingContext) {
      await store.updateWorkingContext(failureSummary);
    }
  } catch (err) {
    const writeErr = err instanceof Error ? err.message : "Unknown onFailure error";
    warnings.push(`onFailure write failed: ${writeErr}`);
  }

  return { ok: true, warnings, error: message };
}
