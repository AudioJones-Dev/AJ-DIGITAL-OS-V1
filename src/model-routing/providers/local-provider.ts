import { createRuntimeConfig } from "../../core/config.js";
import type { ModelRoutingResult, TaskType } from "../result-shape.js";
import { createResult } from "../result-shape.js";
import { buildModelPrompt } from "../../prompt/model-prompt-builder.js";
import type { RetrievedContext } from "../../memory-runtime/retrieval.js";
import { getLocalProviderWarmedUp, setLocalProviderWarmedUp } from "./local-provider-state.js";

const DEFAULT_MODEL = "gemma3:1b";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 1;

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
}

interface LocalProviderControls {
  timeoutMs: number;
  retryOnTimeout: boolean;
  maxRetries: number;
  warmupEnabled: boolean;
}

function getLocalProviderControls(): LocalProviderControls {
  const timeoutMs = Number(process.env.LOCAL_PROVIDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const retryRaw = (process.env.LOCAL_PROVIDER_RETRY_ON_TIMEOUT || "false").trim().toLowerCase();
  const warmupRaw = (process.env.LOCAL_PROVIDER_WARMUP_ENABLED || "false").trim().toLowerCase();
  const retryOnTimeout = retryRaw === "1" || retryRaw === "true" || retryRaw === "yes";
  const warmupEnabled = warmupRaw === "1" || warmupRaw === "true" || warmupRaw === "yes";
  const maxRetries = Math.max(0, Number(process.env.LOCAL_PROVIDER_MAX_RETRIES || DEFAULT_MAX_RETRIES));

  return {
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    retryOnTimeout,
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : DEFAULT_MAX_RETRIES,
    warmupEnabled,
  };
}

async function fetchOllamaGenerate(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function warmupIfNeeded(
  endpoint: string,
  model: string,
  controls: LocalProviderControls,
): Promise<boolean> {
  if (!controls.warmupEnabled || getLocalProviderWarmedUp()) {
    return false;
  }

  const warmupStartMs = Date.now();
  console.error(`[LOCAL-PROVIDER] WARMUP start provider=local model=${model} timeoutMs=${controls.timeoutMs}`);

  try {
    const response = await fetchOllamaGenerate(endpoint, model, "ping", controls.timeoutMs);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[LOCAL-PROVIDER] WARMUP failed provider=local model=${model} status=${response.status} latencyMs=${Date.now() - warmupStartMs} error=${body.slice(0, 200)}`,
      );
      return false;
    }

    await response.json().catch(() => null);
    setLocalProviderWarmedUp(true);
    console.error(`[LOCAL-PROVIDER] WARMUP end provider=local model=${model} latencyMs=${Date.now() - warmupStartMs}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown warmup error";
    console.error(
      `[LOCAL-PROVIDER] WARMUP failed provider=local model=${model} latencyMs=${Date.now() - warmupStartMs} error=${message}`,
    );
    return false;
  }
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
  const controls = getLocalProviderControls();
  let retryCount = 0;
  let warmupExecuted = false;
  const warmedUpAtStart = getLocalProviderWarmedUp();

  console.error(
    `[LOCAL-PROVIDER] START provider=local requestType=${taskType} model=${model} baseUrl=${baseUrl} timeoutMs=${controls.timeoutMs} maxRetries=${controls.maxRetries} retryOnTimeout=${controls.retryOnTimeout} warmupEnabled=${controls.warmupEnabled} warmedUp=${warmedUpAtStart}`,
  );

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

  if (!warmedUpAtStart) {
    warmupExecuted = await warmupIfNeeded(endpoint, model, controls);
  }

  const totalAttempts = controls.retryOnTimeout ? controls.maxRetries + 1 : 1;

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    try {
      const response = await fetchOllamaGenerate(endpoint, model, prompt, controls.timeoutMs);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const durationMs = Date.now() - startMs;
        console.error(
          `[LOCAL-PROVIDER] FAILED provider=local requestType=${taskType} model=${model} status=${response.status} latencyMs=${durationMs} retryCount=${retryCount} warmupExecuted=${warmupExecuted} warmedUp=${getLocalProviderWarmedUp()}`,
        );
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
        `[LOCAL-PROVIDER] OK provider=local requestType=${taskType} model=${model} latencyMs=${durationMs}${ollamaDurationMs ? ` ollamaInferenceMs=${ollamaDurationMs}` : ""} retryCount=${retryCount} warmupExecuted=${warmupExecuted} warmedUp=${getLocalProviderWarmedUp()} result=success`,
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

      if (isTimeout && controls.retryOnTimeout && retryCount < controls.maxRetries) {
        retryCount += 1;
        console.error(
          `[LOCAL-PROVIDER] RETRY triggered attempt=${retryCount} provider=local requestType=${taskType} model=${model} latencyMs=${durationMs} warmupExecuted=${warmupExecuted} warmedUp=${getLocalProviderWarmedUp()}`,
        );
        continue;
      }

      console.error(
        `[LOCAL-PROVIDER] FAILED provider=local requestType=${taskType} model=${model} mode=${isTimeout ? "TIMEOUT" : "ERROR"} latencyMs=${durationMs} retryCount=${retryCount} warmupExecuted=${warmupExecuted} warmedUp=${getLocalProviderWarmedUp()} result=failure error=${message}`,
      );

      return createResult<TOutput>({
        taskType: taskType as TaskType,
        ok: false,
        provider: "local",
        model,
        error: isTimeout
          ? `Ollama request timed out after ${controls.timeoutMs}ms`
          : `Ollama connection failed: ${message}`,
        warnings: [
          isTimeout
            ? "Local model may be loading or overloaded. Escalation may be available."
            : "Ollama may not be running. Start with: ollama serve",
        ],
      });
    }
  }

  return createResult<TOutput>({
    taskType: taskType as TaskType,
    ok: false,
    provider: "local",
    model,
    error: `Ollama request timed out after ${controls.timeoutMs}ms`,
    warnings: ["Local model may be loading or overloaded. Escalation may be available."],
  });
}
