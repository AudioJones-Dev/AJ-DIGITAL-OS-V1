import type { ModelTaskRequest, ModelRoutingResult } from "./result-shape.js";
import { createResult } from "./result-shape.js";
import { resolveRoute, getEscalationTarget, type ProviderRoute } from "./route-policy.js";
import { callOpenAi } from "./providers/openai-provider.js";
import { callLocal } from "./providers/local-provider.js";
import { callDeterministic } from "./providers/deterministic-provider.js";
import { callPerplexity } from "./providers/perplexity-provider.js";
import type { PerplexityCallOptions } from "./providers/perplexity-provider.js";
import type { RetrievedContext } from "../memory-runtime/retrieval.js";

/**
 * OpenAI-specific call options passed through for planner tasks.
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

  // Step 1: Resolve route via policy
  const route = resolveRoute(taskType, constraints, preferredProvider);

  logRouting(taskType, route.provider, route.blocked, route.blockedReason);

  if (route.blocked) {
    return createResult<TOutput>({
      taskType,
      ok: false,
      provider: null,
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
    const escalationTarget = getEscalationTarget(route.provider);

    if (escalationTarget) {
      // Check if escalation is blocked by constraints
      if (constraints?.offline && escalationTarget === "openai") {
        result.warnings.push("Escalation to OpenAI blocked by offline constraint.");
      } else if (constraints?.mustBeLocal && escalationTarget === "openai") {
        result.warnings.push("Escalation to OpenAI blocked by mustBeLocal constraint.");
      } else {
        logRouting(taskType, escalationTarget, false, null, true);

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
          escalated.warnings.push(
            `Primary provider (${route.provider}) failed; escalated to ${escalationTarget}.`,
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
      return callOpenAi<TContext, TOutput>(
        taskType,
        task,
        context,
        systemPrompt,
        userMessage,
        opts,
      );
    }

    case "local":
      return callLocal<TOutput>(taskType, task, context, retrievedContext);

    case "deterministic": {
      if (!dispatch.deterministic) {
        return createResult<TOutput>({
          taskType: taskType as ModelRoutingResult["taskType"],
          ok: false,
          provider: "deterministic",
          error: "Deterministic executor function not provided for this task.",
        });
      }
      return callDeterministic<TContext, TOutput>(
        taskType,
        task,
        context,
        dispatch.deterministic,
      );
    }

    case "perplexity": {
      if (!dispatch.perplexity) {
        // Auto-build dispatch from openai options if available
        const opts = dispatch.openai;
        if (opts) {
          return callPerplexity<TOutput>(taskType, task, context, opts);
        }
        return createResult<TOutput>({
          taskType: taskType as ModelRoutingResult["taskType"],
          ok: false,
          provider: "perplexity",
          error: "Perplexity dispatch options not provided for this task.",
        });
      }
      return callPerplexity<TOutput>(taskType, task, context, dispatch.perplexity);
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
