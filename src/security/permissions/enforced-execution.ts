import { enforceAgentAction } from "./enforcement-engine.js";
import type { AgentActionRequest, PermissionLevel } from "./permission-levels.js";
import type { ApprovalContext } from "./approval-gate.js";

export interface ExecuteWithEnforcementContext {
  permissionLevel: PermissionLevel;
  approval?: ApprovalContext | undefined;
}

export interface ApprovalRequestResult {
  status: "approval_required";
  enforcement: {
    decision: "require_approval";
    category: string;
    risk: "low" | "medium" | "high" | "critical";
    reason: string;
    auditId: string;
    approvalId?: string | undefined;
  };
}

export interface ExecutedResult<T> {
  status: "executed";
  enforcement: {
    decision: "allow";
    category: string;
    risk: "low" | "medium" | "high" | "critical";
    reason: string;
    auditId: string;
  };
  result: T;
}

export type ExecuteWithEnforcementResult<T> = ApprovalRequestResult | ExecutedResult<T>;

export class EnforcementBlockedError extends Error {
  readonly auditId: string;

  constructor(message: string, auditId: string) {
    super(message);
    this.name = "EnforcementBlockedError";
    this.auditId = auditId;
  }
}

export async function executeWithEnforcement<T>(
  request: AgentActionRequest,
  context: ExecuteWithEnforcementContext,
  executor: () => Promise<T>,
): Promise<ExecuteWithEnforcementResult<T>> {
  const enforcement = await enforceAgentAction(request, context);

  if (enforcement.decision === "block") {
    throw new EnforcementBlockedError(enforcement.reason, enforcement.auditId);
  }

  if (enforcement.decision === "require_approval") {
    return {
      status: "approval_required",
      enforcement: {
        decision: "require_approval",
        category: enforcement.category,
        risk: enforcement.risk,
        reason: enforcement.reason,
        auditId: enforcement.auditId,
        ...(enforcement.approvalId !== undefined ? { approvalId: enforcement.approvalId } : {}),
      },
    };
  }

  const result = await executor();
  return {
    status: "executed",
    enforcement: {
      decision: "allow",
      category: enforcement.category,
      risk: enforcement.risk,
      reason: enforcement.reason,
      auditId: enforcement.auditId,
    },
    result,
  };
}