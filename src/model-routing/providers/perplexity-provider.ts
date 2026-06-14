/**
 * Perplexity Provider — research + validation tasks.
 *
 * Uses the Perplexity chat completions API (OpenAI-compatible format).
 * Default model: sonar (web-connected reasoning).
 *
 * Requires env: PERPLEXITY_API_KEY
 */

import { createRuntimeConfig } from "../../core/config.js";
import type { ModelRoutingResult, TaskType } from "../result-shape.js";
import { createResult } from "../result-shape.js";

const DEFAULT_MODEL = "sonar";
const DEFAULT_TIMEOUT_MS = 30_000;
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export interface PerplexityCallOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  responseFormat?: "json" | "text" | undefined;
}

/**
 * Call Perplexity's chat completions API.
 *
 * Perplexity uses an OpenAI-compatible request format with its own models.
 * Best for research tasks (web-grounded) and validation (fact-checking).
 */
export async function callPerplexity<TOutput>(
  taskType: string,
  task: string,
  _context: unknown,
  options: PerplexityCallOptions,
): Promise<ModelRoutingResult<TOutput>> {
  const config = createRuntimeConfig();
  const apiKey = config.perplexityApiKey;

  if (!apiKey) {
    return createResult<TOutput>({
      taskType: taskType as TaskType,
      ok: false,
      provider: "perplexity",
      model: null,
      error: "PERPLEXITY_API_KEY is not configured.",
    });
  }

  const model = options.model ?? DEFAULT_MODEL;

  console.error(`[PERPLEXITY-PROVIDER] ${taskType} → ${model}`);

  try {
    const body: Record<string, unknown> = {
      model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1024,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return createResult<TOutput>({
        taskType: taskType as TaskType,
        ok: false,
        provider: "perplexity",
        model,
        error: `Perplexity API error (${response.status}): ${text.slice(0, 300)}`,
      });
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      citations?: string[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      return createResult<TOutput>({
        taskType: taskType as TaskType,
        ok: false,
        provider: "perplexity",
        model,
        error: "Perplexity returned empty response.",
      });
    }

    let output: TOutput;
    if (options.responseFormat === "json") {
      try {
        output = JSON.parse(content) as TOutput;
      } catch {
        // Perplexity may wrap JSON in markdown — try to extract
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch?.[1]) {
          output = JSON.parse(jsonMatch[1]) as TOutput;
        } else {
          return createResult<TOutput>({
            taskType: taskType as TaskType,
            ok: false,
            provider: "perplexity",
            model,
            error: "Perplexity response is not valid JSON.",
            warnings: [`Raw response: ${content.slice(0, 200)}`],
          });
        }
      }
    } else {
      output = content as unknown as TOutput;
    }

    const warnings: string[] = [];
    if (data.citations && data.citations.length > 0) {
      warnings.push(`Citations: ${data.citations.join(", ")}`);
    }

    return createResult<TOutput>({
      taskType: taskType as TaskType,
      ok: true,
      provider: "perplexity",
      model,
      output,
      warnings,
      ...(data.usage
        ? {
            usage: {
              promptTokens: data.usage.prompt_tokens ?? 0,
              completionTokens: data.usage.completion_tokens ?? 0,
              totalTokens:
                data.usage.total_tokens ??
                (data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0),
            },
          }
        : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("abort");
    return createResult<TOutput>({
      taskType: taskType as TaskType,
      ok: false,
      provider: "perplexity",
      model,
      error: isTimeout
        ? `Perplexity request timed out after ${DEFAULT_TIMEOUT_MS}ms`
        : `Perplexity connection failed: ${message}`,
    });
  }
}
