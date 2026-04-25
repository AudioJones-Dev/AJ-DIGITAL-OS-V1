import type {
  DecisionInput,
  DecisionPolicyContext,
  DecisionPolicyResult,
  MapEvaluation,
} from "./decision-types.js";
import { CATEGORIES_REQUIRING_MAP } from "./decision-types.js";

export function requiresMapEvaluation(category: DecisionInput["category"]): boolean {
  return CATEGORIES_REQUIRING_MAP.includes(category);
}

export function validateProductionTenant(input: DecisionInput): {
  ok: boolean;
  reason?: string;
} {
  if (input.environment === "production" && !input.tenantId) {
    return { ok: false, reason: "tenantId required for production evaluations" };
  }
  return { ok: true };
}

export function applyDecisionPolicy(
  evaluation: MapEvaluation,
  context: DecisionPolicyContext = {},
): DecisionPolicyResult {
  if (evaluation.decision === "execute") {
    return { allowed: true, routedTo: "execute" };
  }

  if (evaluation.decision === "improve") {
    return {
      allowed: false,
      routedTo: "improve",
      reason: "moderate_alignment requires improvement before execution",
    };
  }

  // weak_alignment / reconsider
  if (context.actorType === "system" || context.forceExecute === true) {
    return {
      allowed: true,
      routedTo: "execute",
      reason: "weak_alignment override (system actor or forceExecute=true)",
    };
  }

  return {
    allowed: false,
    routedTo: "blocked",
    reason: "weak_alignment blocks execution",
  };
}
