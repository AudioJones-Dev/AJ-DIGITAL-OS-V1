export type TenantType = "internal_aj" | "client" | "sandbox" | "demo";

export type TenantDataClassification = "public" | "internal" | "confidential" | "restricted";

export interface TenantContext {
  tenantId: string;
  tenantType: TenantType;
  workspaceRoot: string;
  dataClassification: TenantDataClassification;
  allowedAgents: string[];
  allowedTools: string[];
  allowedEnvironments: string[];
  retentionPolicy: string;
  createdAt: string;
}

export interface TenantPolicyInput {
  context: TenantContext;
  agentId: string;
  toolName?: string | undefined;
  environment: string;
  requestedDataClassification?: TenantDataClassification | undefined;
}

export interface TenantPolicyDecision {
  allowed: boolean;
  reason: string;
}
