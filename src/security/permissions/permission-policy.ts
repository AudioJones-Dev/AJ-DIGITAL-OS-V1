import type {
  ActionCategory,
  ActionClassification,
  AgentActionRequest,
  PermissionLevel,
  PolicyDecision,
} from "./permission-levels.js";

export interface PolicyEvaluation {
  decision: PolicyDecision;
  reason: string;
}

interface CategoryRule {
  minLevel: PermissionLevel;
  baseDecision: PolicyDecision;
}

const CATEGORY_RULES: Record<ActionCategory, CategoryRule> = {
  READ: { minLevel: 0, baseDecision: "allowed" },
  WRITE: { minLevel: 2, baseDecision: "allowed" },
  COMMAND_SAFE: { minLevel: 2, baseDecision: "allowed" },
  COMMAND_CAUTION: { minLevel: 2, baseDecision: "requires_approval" },
  COMMAND_RESTRICTED: { minLevel: 5, baseDecision: "requires_approval" },
  GIT_COMMIT: { minLevel: 3, baseDecision: "allowed" },
  GIT_PUSH: { minLevel: 4, baseDecision: "requires_approval" },
  REMOTE_CHANGE: { minLevel: 4, baseDecision: "requires_approval" },
  DEPLOYMENT: { minLevel: 4, baseDecision: "requires_approval" },
  SECRET_ACCESS: { minLevel: 4, baseDecision: "requires_approval" },
  SECRET_MODIFY: { minLevel: 5, baseDecision: "requires_approval" },
  MCP_TOOL_CALL: { minLevel: 2, baseDecision: "allowed" },
  BROWSER_ACTION: { minLevel: 2, baseDecision: "allowed" },
  CLIENT_DATA_ACCESS: { minLevel: 2, baseDecision: "requires_approval" },
  DESTRUCTIVE_ADMIN: { minLevel: 5, baseDecision: "requires_approval" },
};

function isProductionTarget(target: string | undefined): boolean {
  if (!target) return false;
  const normalized = target.trim().toLowerCase();
  return normalized.includes("prod") || normalized.includes("production");
}

export function evaluatePermissionPolicy(
  permissionLevel: PermissionLevel,
  classification: ActionClassification,
  request: AgentActionRequest,
): PolicyEvaluation {
  const rule = CATEGORY_RULES[classification.category];

  if (permissionLevel < rule.minLevel) {
    return {
      decision: "blocked",
      reason: `Permission level ${permissionLevel} cannot execute ${classification.category}.`,
    };
  }

  if (classification.category === "DEPLOYMENT" && isProductionTarget(request.target) && permissionLevel < 5) {
    return {
      decision: "blocked",
      reason: "Production deployment requires level 5 with explicit approval.",
    };
  }

  if (classification.category === "GIT_PUSH" && (request.command ?? "").toLowerCase().includes("--force")) {
    if (permissionLevel < 5) {
      return {
        decision: "blocked",
        reason: "Force push is restricted to level 5 with approval.",
      };
    }
    return {
      decision: "requires_approval",
      reason: "Force push is destructive and requires approval.",
    };
  }

  if (rule.baseDecision === "requires_approval") {
    return {
      decision: "requires_approval",
      reason: `${classification.category} requires approval at permission level ${permissionLevel}.`,
    };
  }

  if (classification.requiresApproval) {
    return {
      decision: "requires_approval",
      reason: classification.reason,
    };
  }

  return {
    decision: "allowed",
    reason: `${classification.category} is allowed at permission level ${permissionLevel}.`,
  };
}
