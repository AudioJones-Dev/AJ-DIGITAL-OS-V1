import type { ModelTaskRequest, ModelRoutingResult } from "./result-shape.js";
import { createResult } from "./result-shape.js";
import {
  resolveRoute,
  getEscalationTarget,
  isCloudProvider,
  isPaidApiRouteAllowed,
  type ProviderRoute,
} from "./route-policy.js";
import { callOpenAi } from "./providers/openai-provider.js";
import { callLocal } from "./providers/local-provider.js";
import { callDeterministic } from "./providers/deterministic-provider.js";
import { callPerplexity } from "./providers/perplexity-provider.js";
import type { PerplexityCallOptions } from "./providers/perplexity-provider.js";
import type { RetrievedContext } from "../memory-runtime/retrieval.js";

/**
 * OpenAI-specific call options passed through for paid API-approved tasks.
 */
export interface OpenAiCallOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  responseFormat?: "json" | "text" | undefined;
}

/**
 * Deterministic executor function — synchronous transform with no model.
 */
export type DeterministicExecutor<TContext, TOutput> = (ctx: TContext) => TOutput;

/**
 * Provider-specific dispatch options.
 * The caller supplies whatever the resolved provider needs.
 */
export interface DispatchOptions<TContext = unknown, TOutput = unknown> {
  openai?: OpenAiCallOptions | undefined;
  perplexity?: PerplexityCallOptions | undefined;
  deterministic?: DeterministicExecutor<TContext, TOutput> | undefined;
}

function isHeavyTask(task: string): boolean {
  const normalized = task.toLowerCase();
  return (
    task.length > 200 ||
    normalized.includes("production-ready") ||
    normalized.includes("full api") ||
    normalized.includes("postgresql")
  );
}

function classifyProviderFamily(provider: ProviderRoute): "local" | "cloud" {
  return provider === "openai" || provider === "perplexity" ? "cloud" : "local";
}

/**
 * Central model router entry point.
 *
 * Routes a task to the appropriate provider based on task type,
 * constraints, and routing policy. Handles escalation when the
 * primary provider fails and escalation is allowed.
 *
 * Usage:
 * ```ts
 * const result = await routeModelTask({
 *   taskType: "planner",
 *   task: "Decide next browser action",
 *   context: { pageSummary, previousActions },
 *   allowEscalation: true,
 * }, {
 *   openai: { systemPrompt, userMessage, responseFormat: "json" },
 * });
 * ```
 */
export async function routeModelTask<TContext = unknown, TOutput = unknown>(
  request: ModelTaskRequest<TContext>,
  dispatch: DispatchOptions<TContext, TOutput>,
): Promise<ModelRoutingResult<TOutput>> {
  const { taskType, task, context, constraints, preferredProvider, allowEscalation, retrievedContext } = request;
  const routeStartMs = Date.now();

  let effectivePreferredProvider = preferredProvider;
  let decisionReason = preferredProvider ? "preferred-provider" : "policy-default";

  if (constraints?.mustBeLocal) {
    decisionReason = "mustBeLocal-override";
  } else if (isHeavyTask(task)) {
    if (constraints?.offline) {
      decisionReason = "offline-mode";
    } else if (isPaidApiRouteAllowed(constraints)) {
      effectivePreferredProvider = "openai";
      decisionReason = "heavy-task-detected";
    } else {
      decisionReason = "heavy-task-local-default";
    }
  } else if (constraints?.offline) {
    decisionReason = "offline-mode";
  }

  // Step 1: Resolve route via policy
  const route = resolveRoute(taskType, constraints, effectivePreferredProvider);

  console.error(
    `[MODEL-ROUTER] DECISION → provider=${classifyProviderFamily(route.provider)} reason=${decisionReason} taskType=${taskType} route=${route.provider}`,
  );

  logRouting(taskType, route.provider, route.blocked, route.blockedReason);

  if (route.blocked) {
    return createResult<TOutput>({
      taskType,
      ok: false,
      provider: null,
      decisionReason,
      error: route.blockedReason ?? "Route blocked by policy.",
    });
  }

  // Step 2: Dispatch to resolved provider
  let result = await dispatchToProvider<TContext, TOutput>(
    route.provider,
    taskType,
    task,
    context,
    dispatch,
    retrievedContext,
  );

  // Step 3: Escalation if primary failed and escalation is allowed
  if (!result.ok && allowEscalation !== false) {
    const escalationTarget = getEscalationTarget(route.provider, constraints);

    if (escalationTarget) {
      // Check if escalation is blocked by constraints
      if (constraints?.offline && escalationTarget === "openai") {
        result.warnings.push("Escalation to OpenAI blocked by offline constraint.");
      } else if (constraints?.mustBeLocal && escalationTarget === "openai") {
        result.warnings.push("Escalation to OpenAI blocked by mustBeLocal constraint.");
      } else if (isCloudProvider(escalationTarget) && !isPaidApiRouteAllowed(constraints)) {
        result.warnings.push("Escalation to paid API provider blocked by auth/model-cost policy.");
      } else {
        logRouting(taskType, escalationTarget, false, null, true);
        if (escalationTarget === "openai" || escalationTarget === "perplexity") {
          console.error(`[MODEL-ROUTER] ESCALATION → cloud taskType=${taskType} target=${escalationTarget}`);
        }

        const escalated = await dispatchToProvider<TContext, TOutput>(
          escalationTarget,
          taskType,
          task,
          context,
          dispatch,
          retrievedContext,
        );

        if (escalated.ok) {
          escalated.escalated = true;
          escalated.decisionReason = "escalation";
          escalated.warnings.push(
            `Primary provider (${route.provider}) failed; escalated to ${escalationTarget}.`,
          );
          console.error(
            `[MODEL-ROUTER] COMPLETED taskType=${taskType} provider=${escalated.provider ?? "none"} model=${escalated.model ?? "n/a"} ok=true escalated=true latencyMs=${Date.now() - routeStartMs}`,
          );
          return escalated;
        }

        // Escalation also failed — return original error with warning
        result.warnings.push(
          `Escalation to ${escalationTarget} also failed: ${escalated.error ?? "unknown"}`,
        );
      }
    }
  }

  result = {
    ...result,
    decisionReason,
  };

  console.error(
    `[MODEL-ROUTER] COMPLETED taskType=${taskType} provider=${result.provider ?? "none"} model=${result.model ?? "n/a"} ok=${result.ok} escalated=${result.escalated} latencyMs=${Date.now() - routeStartMs}`,
  );
  return result;
}

async function dispatchToProvider<TContext, TOutput>(
  provider: ProviderRoute,
  taskType: string,
  task: string,
  context: TContext,
  dispatch: DispatchOptions<TContext, TOutput>,
  retrievedContext?: RetrievedContext,
): Promise<ModelRoutingResult<TOutput>> {
  const dispatchStartMs = Date.now();
  switch (provider) {
    case "openai": {
      if (!dispatch.openai) {
        return createResult<TOutput>({
          taskType: taskType as ModelRoutingResult["taskType"],
          ok: false,
          provider: "openai",
          error: "OpenAI dispatch options not provided for this task.",
        });
      }
      const { systemPrompt, userMessage, model, temperature, maxTokens, responseFormat } =
        dispatch.openai;
      const opts: { model?: string; temperature?: number; maxTokens?: number; responseFormat?: "json" | "text" } = {};
      if (model !== undefined) opts.model = model;
      if (temperature !== undefined) opts.temperature = temperature;
      if (maxTokens !== undefined) opts.maxTokens = maxTokens;
      if (responseFormat !== undefined) opts.responseFormat = responseFormat;
      const selectedModel = opts.model ?? "gpt-default";
      console.error(
        `[MODEL-ROUTER] DISPATCH taskType=${taskType} provider=openai model=${selectedModel} requestType=${taskType}`,
      );
      const openAiResult = await callOpenAi<TContext, TOutput>(
        taskType,
        task,
        context,
        systemPrompt,
        userMessage,
        opts,
      );
      console.error(
        `[MODEL-ROUTER] RESULT taskType=${taskType} provider=openai model=${openAiResult.model ?? selectedModel} ok=${openAiResult.ok} latencyMs=${Date.now() - dispatchStartMs}`,
      );
      return openAiResult;
    }

    case "local": {
      const selectedModel = process.env.LOCAL_MODEL?.trim() || "gemma3:1b";
      console.error(
        `[MODEL-ROUTER] DISPATCH taskType=${taskType} provider=local model=${selectedModel} requestType=${taskType}`,
      );
      const localResult = await callLocal<TOutput>(taskType, task, context, retrievedContext);
      console.error(
        `[MODEL-ROUTER] RESULT taskType=${taskType} provider=local model=${localResult.model ?? selectedModel} ok=${localResult.ok} latencyMs=${Date.now() - dispatchStartMs}`,
      );
      return localResult;
    }

    case "deterministic": {
      if (!dispatch.deterministic) {
        return createResult<TOutput>({
          taskType: taskType as ModelRoutingResult["taskType"],
          ok: false,
          provider: "deterministic",
          error: "Deterministic executor function not provided for this task.",
        });
      }
      console.error(
        `[MODEL-ROUTER] DISPATCH taskType=${taskType} provider=deterministic model=n/a requestType=${taskType}`,
      );
      const deterministicResult = await callDeterministic<TContext, TOutput>(
        taskType,
        task,
        context,
        dispatch.deterministic,
      );
      console.error(
        `[MODEL-ROUTER] RESULT taskType=${taskType} provider=deterministic model=n/a ok=${deterministicResult.ok} latencyMs=${Date.now() - dispatchStartMs}`,
      );
      return deterministicResult;
    }

    case "perplexity": {
      if (!dispatch.perplexity) {
        // Auto-build dispatch from openai options if available
        const opts = dispatch.openai;
        if (opts) {
          console.error(
            `[MODEL-ROUTER] DISPATCH taskType=${taskType} provider=perplexity model=${opts.model ?? "sonar-default"} requestType=${taskType}`,
          );
          const perplexityResult = await callPerplexity<TOutput>(taskType, task, context, opts);
          console.error(
            `[MODEL-ROUTER] RESULT taskType=${taskType} provider=perplexity model=${perplexityResult.model ?? opts.model ?? "sonar-default"} ok=${perplexityResult.ok} latencyMs=${Date.now() - dispatchStartMs}`,
          );
          return perplexityResult;
        }
        return createResult<TOutput>({
          taskType: taskType as ModelRoutingResult["taskType"],
          ok: false,
          provider: "perplexity",
          error: "Perplexity dispatch options not provided for this task.",
        });
      }
      const selectedModel = dispatch.perplexity.model ?? "sonar-default";
      console.error(
        `[MODEL-ROUTER] DISPATCH taskType=${taskType} provider=perplexity model=${selectedModel} requestType=${taskType}`,
      );
      const perplexityResult = await callPerplexity<TOutput>(taskType, task, context, dispatch.perplexity);
      console.error(
        `[MODEL-ROUTER] RESULT taskType=${taskType} provider=perplexity model=${perplexityResult.model ?? selectedModel} ok=${perplexityResult.ok} latencyMs=${Date.now() - dispatchStartMs}`,
      );
      return perplexityResult;
    }
  }
}

function logRouting(
  taskType: string,
  provider: string,
  blocked: boolean,
  blockedReason: string | null,
  escalation = false,
): void {
  const prefix = escalation ? "[MODEL-ROUTER] [ESCALATION]" : "[MODEL-ROUTER]";
  if (blocked) {
    console.error(`${prefix} BLOCKED ${taskType} → ${provider}: ${blockedReason}`);
  } else {
    console.error(`${prefix} ${taskType} → ${provider}`);
  }
}

// Re-export types for consumers
export type { ModelTaskRequest, ModelRoutingResult, RoutingConstraints, TaskType } from "./result-shape.js";
export type { ProviderRoute } from "./route-policy.js";
