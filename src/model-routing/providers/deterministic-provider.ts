import type { ModelRoutingResult } from "../result-shape.js";
import { createResult } from "../result-shape.js";

/**
 * Deterministic provider — no-model execution path.
 *
 * Accepts a synchronous executor function that transforms context into output
 * without any LLM involvement. Used for strict-format tasks like .env
 * serialization, JSON shaping, and CSV schema enforcement.
 */
export async function callDeterministic<TContext, TOutput>(
  taskType: string,
  _task: string,
  context: TContext,
  executor: (ctx: TContext) => TOutput,
): Promise<ModelRoutingResult<TOutput>> {
  try {
    const output = executor(context);
    return createResult<TOutput>({
      taskType: taskType as ModelRoutingResult["taskType"],
      ok: true,
      provider: "deterministic",
      model: null,
      output,
    });
  } catch (err) {
    return createResult<TOutput>({
      taskType: taskType as ModelRoutingResult["taskType"],
      ok: false,
      provider: "deterministic",
      model: null,
      error: err instanceof Error ? err.message : "Deterministic provider execution failed",
    });
  }
}
