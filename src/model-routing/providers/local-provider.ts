import { createRuntimeConfig } from "../../core/config.js";
import type { ModelRoutingResult, TaskType } from "../result-shape.js";
import { createResult } from "../result-shape.js";
import { buildModelPrompt } from "../../prompt/model-prompt-builder.js";
import type { RetrievedContext } from "../../memory-runtime/retrieval.js";

const DEFAULT_MODEL = "gemma3:1b";
const DEFAULT_TIMEOUT_MS = 60_000;

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
}

/**
 * Local model provider — routes to Ollama /api/generate.
 *
 * Uses config.ollamaBaseUrl (default http://localhost:11434).
 * Model is configurable via LOCAL_MODEL env var (default gemma3:1b).
 * All prompts are built through the prompt injection layer.
 */
export async function callLocal<TOutput>(
  taskType: string,
  task: string,
  context: unknown,
  retrievedContext?: RetrievedContext,
): Promise<ModelRoutingResult<TOutput>> {
  const config = createRuntimeConfig();
  const baseUrl = config.ollamaBaseUrl || "http://localhost:11434";
  const model = process.env.LOCAL_MODEL?.trim() || DEFAULT_MODEL;
  const endpoint = `${baseUrl}/api/generate`;
  const startMs = Date.now();

  console.error(`[LOCAL-PROVIDER] ${taskType} → ${model} @ ${baseUrl}`);

  // Build structured prompt via prompt injection layer
  const contextStr = context !== null && context !== undefined
    ? (typeof context === "string" ? context : JSON.stringify(context, null, 2))
    : "";

  const { prompt: modelPrompt, diagnostics } = buildModelPrompt({
    task,
    retrievedContext,
    input: contextStr,
    outputSchema: "Return ONLY the requested output as valid JSON when applicable.",
    constraints: [`Task type: ${taskType}`],
  });

  // Combine sections into single prompt string for Ollama /api/generate
  const promptParts = [modelPrompt.system];
  if (modelPrompt.context.length > 0) {
    promptParts.push(modelPrompt.context);
  }
  promptParts.push(modelPrompt.user);
  const prompt = promptParts.join("\n\n---\n\n");

  console.error(`[LOCAL-PROVIDER] prompt built: ${diagnostics.totalChars} chars, truncated=${diagnostics.truncated}`);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const durationMs = Date.now() - startMs;
      console.error(`[LOCAL-PROVIDER] FAILED ${response.status} (${durationMs}ms)`);
      return createResult<TOutput>({
        taskType: taskType as TaskType,
        ok: false,
        provider: "local",
        model,
        error: `Ollama ${response.status}: ${body.slice(0, 200)}`,
        warnings: ["Local provider returned an error. Escalation may be available."],
      });
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    const durationMs = Date.now() - startMs;
    const ollamaDurationMs = data.total_duration ? Math.round(data.total_duration / 1_000_000) : null;

    console.error(
      `[LOCAL-PROVIDER] OK ${model} (${durationMs}ms fetch${ollamaDurationMs ? `, ${ollamaDurationMs}ms inference` : ""})`,
    );

    // Try to parse as JSON, fall back to raw string
    let output: TOutput;
    const raw = data.response.trim();

    try {
      output = JSON.parse(raw) as TOutput;
    } catch {
      output = raw as unknown as TOutput;
    }

    return createResult<TOutput>({
      taskType: taskType as TaskType,
      ok: true,
      provider: "local",
      model,
      output,
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("abort");
    console.error(`[LOCAL-PROVIDER] FAILED ${isTimeout ? "TIMEOUT" : "ERROR"} (${durationMs}ms): ${message}`);

    return createResult<TOutput>({
      taskType: taskType as TaskType,
      ok: false,
      provider: "local",
      model,
      error: isTimeout
        ? `Ollama request timed out after ${DEFAULT_TIMEOUT_MS}ms`
        : `Ollama connection failed: ${message}`,
      warnings: [
        isTimeout
          ? "Local model may be loading or overloaded."
          : "Ollama may not be running. Start with: ollama serve",
      ],
    });
  }
}
