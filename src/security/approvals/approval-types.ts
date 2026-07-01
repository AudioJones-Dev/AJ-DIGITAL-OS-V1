import type { ActionCategory, ActionRisk, PermissionLevel } from "../permissions/permission-levels.js";

export type ApprovalType =
  | "git_push"
  | "remote_change"
  | "deployment"
  | "secret_modify"
  | "destructive_admin"
  | "client_data_export"
  | "browser_purchase"
  | "browser_send"
  | "mcp_privileged_tool_call"
  | "offer_approval";

export type ApprovalState = "pending" | "approved" | "denied" | "expired" | "cancelled";

export type ApprovalChannel = "cli" | "telegram" | "dashboard" | "email" | "manual";

export type ApprovalEnvironment = "local" | "dev" | "staging" | "production";

export interface ApprovalRequest {
  approvalId: string;
  requestedAt: string;
  expiresAt: string;
  requestedByAgentId: string;
  permissionLevel: PermissionLevel;
  actionCategory: ActionCategory;
  risk: ActionRisk;
  reason: string;
  target: string | null;
  command: string | null;
  clientId: string | null;
  environment: ApprovalEnvironment;
  status: ApprovalState;
  approvedBy: string | null;
  approvalChannel: ApprovalChannel | null;
  auditId: string | null;
}

export interface CreateApprovalInput {
  approvalType: ApprovalType;
  requestedByAgentId: string;
  permissionLevel: PermissionLevel;
  actionCategory: ActionCategory;
  risk: ActionRisk;
  reason: string;
  expiresAt: string;
  target?: string | null | undefined;
  command?: string | null | undefined;
  clientId?: string | null | undefined;
  environment?: ApprovalEnvironment | undefined;
  auditId?: string | null | undefined;
}

export interface ApprovalDecisionInput {
  approvalId: string;
  actorId: string;
  channel: ApprovalChannel;
}
