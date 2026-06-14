import { config } from "../../core/config.js";
import type { ModelRoutingResult } from "../result-shape.js";
import { createResult } from "../result-shape.js";

/**
 * OpenAI provider adapter.
 *
 * Handles planner/reasoning tasks and cloud-escalated transforms.
 * Uses the existing OpenAI API key from runtime config.
 */
export async function callOpenAi<TContext, TOutput>(
  taskType: string,
  task: string,
  context: TContext,
  systemPrompt: string,
  userMessage: string,
  options?: { model?: string; temperature?: number; maxTokens?: number; responseFormat?: "json" | "text" },
): Promise<ModelRoutingResult<TOutput>> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    return createResult<TOutput>({
      taskType: taskType as ModelRoutingResult["taskType"],
      ok: false,
      provider: "openai",
      model: null,
      error: "OPENAI_API_KEY is not configured.",
    });
  }

  const model = options?.model ?? "gpt-4o-mini";

  try {
    const body: Record<string, unknown> = {
      model,
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens ?? 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    };

    if (options?.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return createResult<TOutput>({
        taskType: taskType as ModelRoutingResult["taskType"],
        ok: false,
        provider: "openai",
        model,
        error: `OpenAI API error (${response.status}): ${text.slice(0, 300)}`,
      });
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      return createResult<TOutput>({
        taskType: taskType as ModelRoutingResult["taskType"],
        ok: false,
        provider: "openai",
        model,
        error: "OpenAI returned empty response.",
      });
    }

    const output = (options?.responseFormat === "json" ? JSON.parse(content) : content) as TOutput;

    return createResult<TOutput>({
      taskType: taskType as ModelRoutingResult["taskType"],
      ok: true,
      provider: "openai",
      model,
      output,
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
    return createResult<TOutput>({
      taskType: taskType as ModelRoutingResult["taskType"],
      ok: false,
      provider: "openai",
      model,
      error: err instanceof Error ? err.message : "Unknown OpenAI provider error",
    });
  }
}
