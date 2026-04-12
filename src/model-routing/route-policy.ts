import type { TaskType, RoutingConstraints } from "./result-shape.js";

export type ProviderRoute = "openai" | "local" | "deterministic";

export interface RouteDecision {
  provider: ProviderRoute;
  blocked: boolean;
  blockedReason: string | null;
}

/**
 * Default routing policy matrix.
 *
 * Maps task types to default providers and respects constraint overrides.
 * Does NOT handle escalation — that is the router's responsibility.
 */
const DEFAULT_ROUTES: Record<TaskType, ProviderRoute> = {
  planner: "openai",
  transform: "local",
  format: "deterministic",
  local_agent: "local",
  retrieval_augmented_answer: "openai",
};

export function resolveRoute(
  taskType: TaskType,
  constraints?: RoutingConstraints,
  preferredProvider?: string,
): RouteDecision {
  let provider = DEFAULT_ROUTES[taskType];

  // Preferred provider override (if it's a recognized route)
  if (preferredProvider && isValidRoute(preferredProvider)) {
    provider = preferredProvider;
  }

  // Constraint overrides
  if (constraints?.mustBeLocal) {
    provider = "local";
  }

  if (constraints?.strictFormat && taskType === "format") {
    provider = "deterministic";
  }

  // Offline mode blocks cloud providers
  if (constraints?.offline && provider === "openai") {
    // Try to downgrade to local
    if (taskType === "planner") {
      return {
        provider: "openai",
        blocked: true,
        blockedReason: "Task requires cloud reasoning but offline mode is enabled.",
      };
    }
    provider = "local";
  }

  // Privacy-sensitive: prefer local for transform/local_agent
  if (constraints?.privacySensitive && provider === "openai") {
    if (taskType === "transform" || taskType === "local_agent") {
      provider = "local";
    }
  }

  // Cost tier gating
  if (constraints?.maxCostTier !== undefined) {
    const providerCostTier: Record<ProviderRoute, number> = {
      deterministic: 0,
      local: 1,
      openai: 2,
    };
    if (providerCostTier[provider] > constraints.maxCostTier) {
      // Downgrade to the highest-allowed tier
      if (constraints.maxCostTier >= 1) {
        provider = "local";
      } else {
        provider = "deterministic";
      }
    }
  }

  return { provider, blocked: false, blockedReason: null };
}

function isValidRoute(value: string): value is ProviderRoute {
  return value === "openai" || value === "local" || value === "deterministic";
}

/**
 * Determine the escalation target for a given provider.
 * Returns null if no escalation path exists.
 */
export function getEscalationTarget(current: ProviderRoute): ProviderRoute | null {
  switch (current) {
    case "deterministic":
      return "local";
    case "local":
      return "openai";
    case "openai":
      return null; // No further escalation
  }
}
