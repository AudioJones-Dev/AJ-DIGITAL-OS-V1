import type {
  AgentPipelineDefinition,
  AgentPipelineResult,
  AgentRoleConfig,
  PipelineStage,
  RoleStepInput,
  RoleStepOutput,
} from "./agent-role-types.js";
import { ROLE_DEFAULTS } from "./agent-role-types.js";

/**
 * Execute an agent role pipeline end-to-end.
 *
 * Flow:
 *   planner → executor → validator → (reject? re-execute) → monitor
 *
 * Validator rejection:
 *   When `validatorCanReject` is true and a validator stage returns
 *   `{ ok: false }`, the pipeline re-runs the immediately preceding
 *   executor stage (up to the executor's maxRetries).
 */
export async function runAgentPipeline(
  pipeline: AgentPipelineDefinition,
): Promise<AgentPipelineResult> {
  const start = Date.now();
  const stageResults: RoleStepOutput[] = [];
  const warnings: string[] = [];
  let rejections = 0;
  let previousOutput: unknown = undefined;

  for (let i = 0; i < pipeline.stages.length; i++) {
    const stage = pipeline.stages[i]!;
    const config = resolveConfig(stage);

    const result = await executeStageWithRetry(stage, config, previousOutput);
    stageResults.push(result);

    if (!result.ok) {
      // Validator rejection → re-run executor
      if (
        stage.role === "validator" &&
        pipeline.validatorCanReject &&
        i > 0
      ) {
        const executorIndex = findPrecedingExecutor(pipeline.stages, i);
        if (executorIndex !== null) {
          const executorStage = pipeline.stages[executorIndex]!;
          const executorConfig = resolveConfig(executorStage);
          const executorPrev = executorIndex > 0
            ? stageResults[executorIndex - 1]?.output
            : undefined;

          rejections++;
          warnings.push(
            `Validator [${stage.handler.role}] rejected executor output (rejection #${rejections}).`,
          );

          if (rejections <= executorConfig.maxRetries) {
            // Re-run executor
            const retry = await executeStageWithRetry(
              executorStage,
              executorConfig,
              executorPrev,
            );
            stageResults.push(retry);

            if (retry.ok) {
              previousOutput = retry.output;
              // Re-run this validator
              i--;
              continue;
            }
          }
        }

        // Rejection exhausted — fail pipeline
        return buildResult(pipeline, stageResults, rejections, warnings, {
          ok: false,
          error: `Validator rejected executor output after max retries.${result.error ? ` Last: ${result.error}` : ""}`,
          previousOutput,
          start,
        });
      }

      // Non-validator failure or no rejection support — stop pipeline
      return buildResult(pipeline, stageResults, rejections, warnings, {
        ok: false,
        error: result.error ?? `Stage [${stage.role}] failed.`,
        previousOutput,
        start,
      });
    }

    previousOutput = result.output;
  }

  return buildResult(pipeline, stageResults, rejections, warnings, {
    ok: true,
    error: null,
    previousOutput,
    start,
  });
}

// ── Internals ──────────────────────────────────────────────────────

function resolveConfig(stage: PipelineStage): AgentRoleConfig {
  const defaults = ROLE_DEFAULTS[stage.role];
  if (!stage.config) return defaults;
  return { ...defaults, ...stage.config, kind: stage.role };
}

async function executeStageWithRetry(
  stage: PipelineStage,
  config: AgentRoleConfig,
  previousOutput: unknown,
): Promise<RoleStepOutput> {
  let lastResult: RoleStepOutput | undefined;
  const maxAttempts = config.maxRetries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const input: RoleStepInput = {
      task: `[${stage.role}] stage execution`,
      payload: previousOutput,
      previousOutput,
    };

    lastResult = await executeWithTimeout(stage.handler, input, config.timeoutMs);

    if (lastResult.ok) {
      lastResult.retries = attempt;
      return lastResult;
    }

    // Only retry on non-validator roles (validators don't retry internally)
    if (stage.role === "validator") break;
  }

  return lastResult ?? {
    ok: false,
    role: stage.role,
    output: null,
    durationMs: 0,
    retries: maxAttempts - 1,
    warnings: [],
    error: "No execution result produced.",
  };
}

async function executeWithTimeout<TIn, TOut>(
  handler: PipelineStage["handler"],
  input: RoleStepInput<TIn>,
  timeoutMs: number,
): Promise<RoleStepOutput<TOut>> {
  if (timeoutMs <= 0) {
    return handler.execute(input) as Promise<RoleStepOutput<TOut>>;
  }

  return Promise.race([
    handler.execute(input) as Promise<RoleStepOutput<TOut>>,
    new Promise<RoleStepOutput<TOut>>((resolve) =>
      setTimeout(() => {
        resolve({
          ok: false,
          role: handler.role,
          output: null,
          durationMs: timeoutMs,
          retries: 0,
          warnings: [],
          error: `Stage timed out after ${timeoutMs}ms.`,
        });
      }, timeoutMs),
    ),
  ]);
}

function findPrecedingExecutor(
  stages: PipelineStage[],
  validatorIndex: number,
): number | null {
  for (let j = validatorIndex - 1; j >= 0; j--) {
    if (stages[j]!.role === "executor") return j;
  }
  return null;
}

function buildResult(
  pipeline: AgentPipelineDefinition,
  stageResults: RoleStepOutput[],
  rejections: number,
  warnings: string[],
  outcome: { ok: boolean; error: string | null; previousOutput: unknown; start: number },
): AgentPipelineResult {
  const completed = stageResults.filter((r) => r.ok).length;

  // Collect per-stage warnings
  for (const r of stageResults) {
    if (r.warnings.length > 0) {
      warnings.push(...r.warnings);
    }
  }

  return {
    pipelineId: pipeline.id,
    ok: outcome.ok,
    stagesCompleted: completed,
    totalStages: pipeline.stages.length,
    stageResults,
    finalOutput: outcome.previousOutput ?? null,
    durationMs: Date.now() - outcome.start,
    rejections,
    warnings,
    error: outcome.error,
  };
}
