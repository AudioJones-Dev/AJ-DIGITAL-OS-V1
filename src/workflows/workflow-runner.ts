import type { WorkflowResult } from "../browser-agent/workflow-types.js";
import { runWorkflow as runBrowserWorkflow } from "../browser-agent/run-workflow.js";
import { runLocalAgentTask } from "../local-agent/local-agent.js";
import type { LocalAgentResult } from "../local-agent/local-agent.js";
import { validateOutput, type ValidationResult } from "../local-agent/validators.js";
import type { RetrievedContext } from "../memory-runtime/retrieval.js";
import type { CognitiveMemoryStore } from "../memory-runtime/store.js";
import type { RunContext } from "../memory-runtime/types.js";
import type {
  OrchestratorStep,
  StepResult,
  BrowserExtractStep,
  NormalizeConfigStep,
  ValidateStep,
  StoreMemoryStep,
} from "./orchestrator-types.js";

// ── Step Executors ─────────────────────────────────────────────────

async function executeBrowserExtract(
  step: BrowserExtractStep,
  _previousOutput: unknown,
): Promise<WorkflowResult> {
  return runBrowserWorkflow(step.job);
}

async function executeNormalizeConfig(
  step: NormalizeConfigStep,
  previousOutput: unknown,
  retrievedContext: RetrievedContext | undefined,
): Promise<LocalAgentResult> {
  const context: Record<string, unknown> = {
    ...step.context,
  };

  // Inject previous step output if available
  if (previousOutput !== undefined) {
    context["previousStepOutput"] = previousOutput;
  }

  return runLocalAgentTask({
    task: step.task,
    outputTargets: step.outputTargets,
    allowedPaths: step.allowedPaths,
    inputFiles: step.inputFiles,
    mode: "normalize_config",
    context,
    retrievedContext,
  });
}

async function executeValidate(
  step: ValidateStep,
  _previousOutput: unknown,
): Promise<ValidationResult> {
  return validateOutput(step.target, step.rules);
}

async function executeStoreMemory(
  step: StoreMemoryStep,
  previousOutput: unknown,
  runContext: RunContext | undefined,
  store: CognitiveMemoryStore | undefined,
): Promise<{ stored: boolean; key: string }> {
  const value =
    step.content !== undefined
      ? step.content
      : typeof previousOutput === "string"
        ? previousOutput
        : JSON.stringify(previousOutput);

  // Write to RunContext extracted data
  if (runContext) {
    runContext.extractedData[step.key] = value;
    runContext.notes.push(`Stored memory key: ${step.key}`);
  }

  // Also persist to cognitive store if available
  if (store) {
    await store.writeRunLog({
      id: `mem-${step.key}-${Date.now()}`,
      type: "shared_memory",
      workflow: runContext?.workflow ?? "unknown",
      timestamp: new Date().toISOString(),
      content: value,
      tags: step.tags ?? [],
      metadata: { key: step.key },
    });
  }

  return { stored: true, key: step.key };
}

// ── Runner ─────────────────────────────────────────────────────────

export interface RunnerOptions {
  retrievedContext?: RetrievedContext | undefined;
  runContext?: RunContext | undefined;
  store?: CognitiveMemoryStore | undefined;
}

/**
 * Execute a sequence of orchestrator steps.
 *
 * Each step receives the output from the previous step.
 * Execution stops on the first failure.
 */
export async function runSteps(
  steps: OrchestratorStep[],
  options: RunnerOptions = {},
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  let previousOutput: unknown = undefined;

  for (const step of steps) {
    const start = Date.now();
    let output: unknown;
    let ok = false;
    let error: string | undefined;

    try {
      switch (step.type) {
        case "browser-extract": {
          const result = await executeBrowserExtract(step, previousOutput);
          ok = result.ok;
          output = result;
          if (!ok) {
            error = result.errors.join("; ");
          }
          break;
        }
        case "normalize-config": {
          const result = await executeNormalizeConfig(
            step,
            previousOutput,
            options.retrievedContext,
          );
          ok = result.ok;
          output = result;
          if (!ok) {
            error = result.error ?? "normalize-config failed";
          }
          break;
        }
        case "validate": {
          const result = await executeValidate(step, previousOutput);
          ok = result.passed;
          output = result;
          if (!ok) {
            error = result.checks
              .filter((c) => !c.passed)
              .map((c) => c.reason ?? c.name)
              .join("; ");
          }
          break;
        }
        case "store-memory": {
          const result = await executeStoreMemory(
            step,
            previousOutput,
            options.runContext,
            options.store,
          );
          ok = result.stored;
          output = result;
          break;
        }
      }
    } catch (err) {
      ok = false;
      error = err instanceof Error ? err.message : String(err);
      output = undefined;
    }

    // Track step count on run context
    if (options.runContext) {
      options.runContext.stepCount += 1;
    }

    results.push({
      stepName: step.name,
      stepType: step.type,
      ok,
      durationMs: Date.now() - start,
      output,
      error,
    });

    if (!ok) {
      break;
    }

    previousOutput = output;
  }

  return results;
}
