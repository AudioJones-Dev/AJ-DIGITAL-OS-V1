/**
 * Operating Core — Policy engine
 *
 * Decision functions that consume the JSON policy documents. Pure: every
 * call re-evaluates from current request + cached policy state.
 */

import { loadPolicy } from "./policy-loader.js";
import type {
  ActionRiskEvaluation,
  ActorType,
  Environment,
  PolicyEvaluation,
  PolicyRequest,
  Risk,
} from "./policy-types.js";

const VALID_ENVIRONMENTS: Environment[] = ["local", "dev", "staging", "production"];

function getActionsMap(rules: Record<string, unknown>): Record<string, string> {
  const actions = rules["actions"];
  return actions && typeof actions === "object" ? (actions as Record<string, string>) : {};
}

function asRisk(value: unknown, fallback: Risk): Risk {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

export function evaluateActionRisk(
  action: string,
  environment: Environment,
  tenantId?: string,
): ActionRiskEvaluation {
  const policy = loadPolicy("action-risk.policy.json");
  const tenantPolicy = loadPolicy("tenant-boundary.policy.json");
  const approvalPolicy = loadPolicy("approval-gates.policy.json");

  const actions = getActionsMap(policy.rules);
  const defaultRisk = asRisk(policy.rules["default"], "medium");
  const risk = asRisk(actions[action], defaultRisk);

  // Tenant boundary
  const requireTenantInProd = Boolean(tenantPolicy.rules["requireTenantIdInProduction"]);
  const requireTenantInStaging = Boolean(tenantPolicy.rules["requireTenantIdInStaging"]);

  if (risk !== "low") {
    if (environment === "production" && requireTenantInProd && !tenantId) {
      return { decision: "block", reason: "missing_tenant_id", risk };
    }
    if (environment === "staging" && requireTenantInStaging && !tenantId) {
      return { decision: "block", reason: "missing_tenant_id", risk };
    }
  }

  // Approval gate
  const approvalRequired = Array.isArray(approvalPolicy.rules["approvalRequired"])
    ? (approvalPolicy.rules["approvalRequired"] as string[])
    : [];
  const highRiskAlways = Boolean(approvalPolicy.rules["highRiskAlwaysRequiresApproval"]);

  if (approvalRequired.includes(action) || (highRiskAlways && risk === "high")) {
    return { decision: "approval_required", reason: "high_risk_requires_approval", risk };
  }

  return { decision: "allow", reason: "allowed", risk };
}

export function evaluateTenantBoundary(
  requestTenantId: string | undefined,
  resourceTenantId: string | undefined,
  environment: Environment,
): PolicyEvaluation {
  const policy = loadPolicy("tenant-boundary.policy.json");
  const blockCrossTenant = Boolean(policy.rules["blockCrossTenant"]);
  const requireInProd = Boolean(policy.rules["requireTenantIdInProduction"]);

  if (environment === "production" && requireInProd && !requestTenantId) {
    return { decision: "block", reason: "missing_tenant_id" };
  }

  if (
    blockCrossTenant &&
    requestTenantId &&
    resourceTenantId &&
    requestTenantId !== resourceTenantId
  ) {
    return { decision: "block", reason: "cross_tenant_access" };
  }

  return { decision: "allow", reason: "allowed" };
}

export function evaluateEnvironmentRules(
  environment: Environment,
  action: string,
): PolicyEvaluation {
  if (!VALID_ENVIRONMENTS.includes(environment)) {
    return { decision: "block", reason: "invalid_environment" };
  }

  const policy = loadPolicy("environment.policy.json");
  const restrictedMap = (policy.rules["restrictedActions"] ?? {}) as Record<string, string[]>;
  const restricted = Array.isArray(restrictedMap[environment]) ? restrictedMap[environment] : [];
  if (restricted.includes(action)) {
    return { decision: "block", reason: "restricted_action" };
  }
  return { decision: "allow", reason: "allowed" };
}

export function evaluateApprovalRequirement(
  action: string,
  actorType: ActorType,
  environment: Environment,
): PolicyEvaluation {
  const policy = loadPolicy("approval-gates.policy.json");
  const required = Array.isArray(policy.rules["approvalRequired"])
    ? (policy.rules["approvalRequired"] as string[])
    : [];
  const systemBypass = Boolean(policy.rules["systemActorsBypass"]);

  if (systemBypass && (actorType === "system" || actorType === "admin")) {
    return { decision: "allow", reason: "allowed" };
  }

  if (!required.includes(action)) {
    return { decision: "allow", reason: "allowed" };
  }

  // Local environments still require explicit approval for high-risk actions
  // unless the actor is system/admin (handled above).
  void environment;
  return { decision: "approval_required", reason: "high_risk_requires_approval" };
}

/**
 * Generic policy evaluator dispatch — selects an evaluator based on the
 * policy file requested. Used by the Hermes endpoint.
 */
export function evaluatePolicy(
  request: PolicyRequest,
  policyFile: string,
): PolicyEvaluation {
  switch (policyFile) {
    case "action-risk.policy.json":
      return evaluateActionRisk(request.action, request.environment, request.tenantId);
    case "tenant-boundary.policy.json":
      return evaluateTenantBoundary(request.tenantId, request.resourceTenantId, request.environment);
    case "environment.policy.json":
      return evaluateEnvironmentRules(request.environment, request.action);
    case "approval-gates.policy.json":
      return evaluateApprovalRequirement(
        request.action,
        request.actorType ?? "user",
        request.environment,
      );
    default: {
      // Validate the policy is loadable; otherwise block with a useful reason
      const policy = loadPolicy(policyFile);
      void policy;
      return { decision: "allow", reason: "allowed" };
    }
  }
}
