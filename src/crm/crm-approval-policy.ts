import type { CrmApprovalStatus, CrmRiskLevel } from "./crm-types.js";

export type CrmServiceAction =
  | "create_contact"
  | "update_contact"
  | "create_lead"
  | "update_lead"
  | "create_opportunity"
  | "update_opportunity";

export interface CrmApprovalDecision {
  action: CrmServiceAction;
  riskLevel: CrmRiskLevel;
  approvalRequired: boolean;
  approved: boolean;
  reason: string;
}

const ACTION_RISK: Record<CrmServiceAction, CrmRiskLevel> = {
  create_contact: "L1",
  update_contact: "L1",
  create_lead: "L1",
  update_lead: "L2",
  create_opportunity: "L2",
  update_opportunity: "L2",
};

const APPROVAL_REQUIRED: readonly CrmServiceAction[] = [
  "update_opportunity",
];

export function crmRiskForAction(action: CrmServiceAction): CrmRiskLevel {
  return ACTION_RISK[action];
}

export function evaluateCrmApproval(
  action: CrmServiceAction,
  approvalStatus: CrmApprovalStatus | undefined,
): CrmApprovalDecision {
  const riskLevel = crmRiskForAction(action);
  const approvalRequired = APPROVAL_REQUIRED.includes(action);
  if (!approvalRequired) {
    return {
      action,
      riskLevel,
      approvalRequired,
      approved: true,
      reason: "Approval is not required for this CRM action.",
    };
  }

  const approved = approvalStatus === "approved";
  return {
    action,
    riskLevel,
    approvalRequired,
    approved,
    reason: approved
      ? "Approval is present for this CRM action."
      : `Approval required for CRM action: ${action}.`,
  };
}
