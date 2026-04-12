import type { ModelRoutingResult } from "../result-shape.js";
import { createResult } from "../result-shape.js";

/**
 * Local model provider adapter (stub).
 *
 * Placeholder for Gemma / Ollama / LM Studio local inference.
 * Returns a structured stub result so the router can test
 * escalation and fallback paths.
 */
export async function callLocal<TOutput>(
  taskType: string,
  task: string,
  _context: unknown,
): Promise<ModelRoutingResult<TOutput>> {
  // TODO: Integrate with Ollama or LM Studio via config.ollamaBaseUrl / config.lmstudioBaseUrl
  return createResult<TOutput>({
    taskType: taskType as ModelRoutingResult["taskType"],
    ok: false,
    provider: "local",
    model: null,
    error: "Local model provider is not yet implemented. Escalation may be available.",
    warnings: ["Local provider is a stub — escalate to cloud if allowed."],
  });
}
