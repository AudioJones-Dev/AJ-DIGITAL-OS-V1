/**
 * Operating Core — Policy-as-Code v1 types
 */

export type PolicyDecision = "allow" | "block" | "approval_required";

export type PolicyReason =
  | "allowed"
  | "missing_tenant_id"
  | "cross_tenant_access"
  | "invalid_environment"
  | "high_risk_requires_approval"
  | "restricted_action"
  | "terminal_state_blocked"
  | "policy_version_mismatch";

export type Risk = "low" | "medium" | "high";
export type Environment = "local" | "dev" | "staging" | "production";
export type ActorType = "user" | "admin" | "system" | "agent" | "client";

export interface PolicyDocument {
  policy: string;
  version: string;
  description?: string;
  rules: Record<string, unknown>;
}

export interface PolicyRequest {
  action: string;
  environment: Environment;
  tenantId?: string;
  resourceTenantId?: string;
  actorType?: ActorType;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  reason: PolicyReason;
}

export interface ActionRiskEvaluation extends PolicyEvaluation {
  risk: Risk;
}
