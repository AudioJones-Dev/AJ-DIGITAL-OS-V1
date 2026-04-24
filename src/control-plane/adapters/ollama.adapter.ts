/**
 * Ollama Adapter
 *
 * Connects Telegram control plane /ask requests to local Ollama HTTP API.
 */

import { logger } from "../../core/logger.js";
import { recordAgentExecution } from "../../intelligence/intelligence-engine.js";
import { recordAgentRun } from "../../observability/metrics.js";
import type { OllamaAskResult, OllamaHealthStatus } from "../types/control-plane.types.js";

export interface OllamaAdapter {
  isEnabled(): boolean;
  checkHealth(): Promise<OllamaHealthStatus>;
  ask(prompt: string): Promise<OllamaAskResult>;
}

class LocalOllamaAdapter implements OllamaAdapter {
  constructor(
    private readonly enabled: boolean,
    private readonly baseUrl: string,
    private readonly defaultModel: string,
    private readonly timeoutMs: number = 12000
  ) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  async checkHealth(): Promise<OllamaHealthStatus> {
    if (!this.enabled) {
      return {
        enabled: false,
        healthy: false,
        baseUrl: this.baseUrl,
        model: this.defaultModel,
        error: "disabled",
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        return {
          enabled: true,
          healthy: false,
          baseUrl: this.baseUrl,
          model: this.defaultModel,
          error: `HTTP ${response.status}`,
        };
      }

      return {
        enabled: true,
        healthy: true,
        baseUrl: this.baseUrl,
        model: this.defaultModel,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        enabled: true,
        healthy: false,
        baseUrl: this.baseUrl,
        model: this.defaultModel,
        error: errorMessage,
      };
    }
  }

  async ask(prompt: string): Promise<OllamaAskResult> {
    if (!this.enabled) {
      return {
        ok: false,
        error: "Ollama is disabled.",
      };
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return {
        ok: false,
        error: "Prompt is empty. Use /ask <question>.",
      };
    }

    logger.info("Ollama /ask request", {
      provider: "local",
      requestType: "ask",
      promptLength: trimmedPrompt.length,
      model: this.defaultModel,
      baseUrl: this.baseUrl,
    });

    const startMs = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt: trimmedPrompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = `Ollama HTTP ${response.status}`;
        logger.error("Ollama /ask failed", {
          provider: "local",
          requestType: "ask",
          error: errorText,
          model: this.defaultModel,
          latencyMs: Date.now() - startMs,
        });
        const durationMs = Date.now() - startMs;
        recordAgentRun("ollama", durationMs, false);
        recordAgentExecution({
          agent: "ollama",
          durationMs,
          success: false,
          outputSize: 0,
          confidenceProxy: 0,
        });
        return {
          ok: false,
          error: errorText,
        };
      }

      const data = (await response.json()) as { response?: string };
      const rawAnswer = (data.response || "").trim();
      const conciseAnswer = rawAnswer.length > 700 ? `${rawAnswer.substring(0, 700)}...` : rawAnswer;

      logger.info("Ollama /ask success", {
        provider: "local",
        requestType: "ask",
        model: this.defaultModel,
        answerLength: conciseAnswer.length,
        latencyMs: Date.now() - startMs,
      });

      const durationMs = Date.now() - startMs;
      recordAgentRun("ollama", durationMs, true);
      recordAgentExecution({
        agent: "ollama",
        durationMs,
        success: true,
        outputSize: conciseAnswer.length,
        confidenceProxy: conciseAnswer.length / Math.max(trimmedPrompt.length, 1),
      });
      return {
        ok: true,
        answer: conciseAnswer.length > 0 ? conciseAnswer : "No response from model.",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Ollama /ask exception", {
        provider: "local",
        requestType: "ask",
        error: errorMessage,
        model: this.defaultModel,
        latencyMs: Date.now() - startMs,
      });

      const durationMs = Date.now() - startMs;
      recordAgentRun("ollama", durationMs, false);
      recordAgentExecution({
        agent: "ollama",
        durationMs,
        success: false,
        outputSize: 0,
        confidenceProxy: 0,
      });
      return {
        ok: false,
        error: errorMessage.includes("abort") ? "Request timed out." : errorMessage,
      };
    }
  }
}

export function createOllamaAdapterFromEnv(): OllamaAdapter {
  const enabledRaw = (process.env.AJ_OLLAMA_ENABLED || "false").trim().toLowerCase();
  const enabled = enabledRaw === "1" || enabledRaw === "true" || enabledRaw === "yes";
  const baseUrl = (process.env.AJ_OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const defaultModel = process.env.AJ_OLLAMA_DEFAULT_MODEL || "gemma3:1b";

  return new LocalOllamaAdapter(enabled, baseUrl, defaultModel);
}
