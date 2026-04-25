import { validateTenantContext } from "./tenant-context.js";
import type {
  TenantDataClassification,
  TenantPolicyDecision,
  TenantPolicyInput,
} from "./tenant-types.js";

function classificationRank(value: TenantDataClassification): number {
  switch (value) {
    case "public":
      return 0;
    case "internal":
      return 1;
    case "confidential":
      return 2;
    case "restricted":
      return 3;
  }
}

export function evaluateTenantPolicy(input: TenantPolicyInput): TenantPolicyDecision {
  const validation = validateTenantContext(input.context);
  if (!validation.valid) {
    return {
      allowed: false,
      reason: `Invalid tenant context: ${validation.errors.join(" ")}`,
    };
  }

  if (!input.context.allowedAgents.includes(input.agentId)) {
    return {
      allowed: false,
      reason: `Agent ${input.agentId} is not assigned to tenant ${input.context.tenantId}.`,
    };
  }

  if (input.toolName && !input.context.allowedTools.includes(input.toolName)) {
    return {
      allowed: false,
      reason: `Tool ${input.toolName} is not allowed for tenant ${input.context.tenantId}.`,
    };
  }

  if (!input.context.allowedEnvironments.includes(input.environment)) {
    return {
      allowed: false,
      reason: `Environment ${input.environment} is not allowed for tenant ${input.context.tenantId}.`,
    };
  }

  const requested = input.requestedDataClassification ?? input.context.dataClassification;
  if (
    (input.context.tenantType === "sandbox" || input.context.tenantType === "demo")
    && classificationRank(requested) >= classificationRank("restricted")
  ) {
    return {
      allowed: false,
      reason: "Restricted data cannot be used in sandbox or demo tenants.",
    };
  }

  return {
    allowed: true,
    reason: `Tenant policy allows access for ${input.context.tenantId}.`,
  };
}
