import type { ApprovalContext } from "../permissions/approval-gate.js";
import type { ActionCategory, ActionRisk, AgentActionRequest, PermissionLevel } from "../permissions/permission-levels.js";
import type { TenantContext } from "../tenancy/tenant-types.js";

export interface McpToolPolicy {
  serverName: string;
  toolName: string;
  category: ActionCategory;
  risk: ActionRisk;
  allowedPermissionLevels: PermissionLevel[];
  requiresApproval: boolean;
  allowedEnvironments: string[];
  requiresTenantContext: boolean;
  allowedTenantIds?: string[] | undefined;
  blockedTenantIds?: string[] | undefined;
  oauthScopes?: string[] | undefined;
}

export interface McpSecureExecutionRequest {
  serverName: string;
  toolName: string;
  actionRequest: AgentActionRequest;
  environment: string;
  permissionLevel: PermissionLevel;
  approval?: ApprovalContext | undefined;
  tenantContext?: TenantContext | undefined;
}

export interface McpSecureExecutionBlockedResult {
  status: "blocked";
  reason: string;
  category: ActionCategory;
  risk: ActionRisk;
  auditId?: string | undefined;
}

export interface McpSecureExecutionApprovalResult {
  status: "approval_required";
  reason: string;
  category: ActionCategory;
  risk: ActionRisk;
  auditId?: string | undefined;
}

export interface McpSecureExecutionExecutedResult<T> {
  status: "executed";
  category: ActionCategory;
  risk: ActionRisk;
  auditId?: string | undefined;
  result: T;
}

export type McpSecureExecutionResult<T> =
  | McpSecureExecutionBlockedResult
  | McpSecureExecutionApprovalResult
  | McpSecureExecutionExecutedResult<T>;
