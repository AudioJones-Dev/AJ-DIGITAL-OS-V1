export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ActionRisk = "low" | "medium" | "high" | "critical";

export type ActionCategory =
  | "READ"
  | "WRITE"
  | "COMMAND_SAFE"
  | "COMMAND_CAUTION"
  | "COMMAND_RESTRICTED"
  | "GIT_COMMIT"
  | "GIT_PUSH"
  | "REMOTE_CHANGE"
  | "DEPLOYMENT"
  | "SECRET_ACCESS"
  | "SECRET_MODIFY"
  | "MCP_TOOL_CALL"
  | "BROWSER_ACTION"
  | "CLIENT_DATA_ACCESS"
  | "DESTRUCTIVE_ADMIN";

export type PolicyDecision = "allowed" | "blocked" | "requires_approval";

export type EnforcementDecision = "allow" | "block" | "require_approval";

export type ApprovalStatus = "not_required" | "required" | "approved" | "denied" | "expired";

export interface AgentActionRequest {
  agentId: string;
  actionType: string;
  command?: string | undefined;
  target?: string | undefined;
  toolName?: string | undefined;
  browserAction?: string | undefined;
  clientId?: string | null | undefined;
}

export interface ActionClassification {
  category: ActionCategory;
  risk: ActionRisk;
  requiresApproval: boolean;
  reason: string;
}
