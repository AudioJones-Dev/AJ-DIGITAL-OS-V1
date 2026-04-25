import type { ApprovalStatus } from "./permission-levels.js";

export interface ApprovalContext {
  approved?: boolean | undefined;
  denied?: boolean | undefined;
  expiresAt?: string | undefined;
}

export interface ApprovalDecision {
  status: ApprovalStatus;
  reason: string;
}

export function evaluateApprovalGate(
  requiresApproval: boolean,
  context: ApprovalContext | undefined,
): ApprovalDecision {
  if (!requiresApproval) {
    return {
      status: "not_required",
      reason: "Approval is not required for this action.",
    };
  }

  if (context?.denied) {
    return {
      status: "denied",
      reason: "Approval has been denied.",
    };
  }

  if (!context?.approved) {
    return {
      status: "required",
      reason: "Approval is required before execution.",
    };
  }

  if (context.expiresAt) {
    const expiry = new Date(context.expiresAt).getTime();
    if (!Number.isNaN(expiry) && Date.now() > expiry) {
      return {
        status: "expired",
        reason: "Approval has expired and must be renewed.",
      };
    }
  }

  return {
    status: "approved",
    reason: "Valid approval is present.",
  };
}
