import { executeWithEnforcement } from "../permissions/enforced-execution.js";
import { enforceAgentAction } from "../permissions/enforcement-engine.js";
import { evaluateTenantPolicy } from "../tenancy/tenant-policy.js";
import { getMcpToolPolicy } from "./mcp-tool-policy.js";
import type {
  McpSecureExecutionRequest,
  McpSecureExecutionResult,
} from "./mcp-security-types.js";

export async function mcpSecureExecute<T>(
  request: McpSecureExecutionRequest,
  executor: () => Promise<T>,
): Promise<McpSecureExecutionResult<T>> {
  const policy = getMcpToolPolicy(request.serverName, request.toolName);
  if (!policy) {
    return {
      status: "blocked",
      reason: `Unregistered MCP tool: ${request.serverName}/${request.toolName}`,
      category: "MCP_TOOL_CALL",
      risk: "critical",
    };
  }

  if (!policy.allowedPermissionLevels.includes(request.permissionLevel)) {
    return {
      status: "blocked",
      reason: `Permission level ${request.permissionLevel} is not allowed for ${request.toolName}.`,
      category: policy.category,
      risk: policy.risk,
    };
  }

  if (!policy.allowedEnvironments.includes(request.environment)) {
    return {
      status: "blocked",
      reason: `Environment ${request.environment} is not allowed for ${request.toolName}.`,
      category: policy.category,
      risk: policy.risk,
    };
  }

  if (policy.requiresTenantContext && !request.tenantContext) {
    return {
      status: "blocked",
      reason: `Tenant context is required for ${request.toolName}.`,
      category: policy.category,
      risk: policy.risk,
    };
  }

  if (request.tenantContext) {
    if (policy.allowedTenantIds && !policy.allowedTenantIds.includes(request.tenantContext.tenantId)) {
      return {
        status: "blocked",
        reason: `Tenant ${request.tenantContext.tenantId} is not allowed for ${request.toolName}.`,
        category: policy.category,
        risk: policy.risk,
      };
    }

    if (policy.blockedTenantIds && policy.blockedTenantIds.includes(request.tenantContext.tenantId)) {
      return {
        status: "blocked",
        reason: `Tenant ${request.tenantContext.tenantId} is blocked for ${request.toolName}.`,
        category: policy.category,
        risk: policy.risk,
      };
    }

    const tenantDecision = evaluateTenantPolicy({
      context: request.tenantContext,
      agentId: request.actionRequest.agentId,
      toolName: request.toolName,
      environment: request.environment,
    });
    if (!tenantDecision.allowed) {
      return {
        status: "blocked",
        reason: tenantDecision.reason,
        category: policy.category,
        risk: policy.risk,
      };
    }
  }

  if (policy.requiresApproval && request.approval?.approved !== true) {
    const enforcement = await enforceAgentAction(
      request.actionRequest,
      {
        permissionLevel: request.permissionLevel,
        ...(request.approval !== undefined ? { approval: request.approval } : {}),
        environment: request.environment === "local" || request.environment === "dev" || request.environment === "staging" || request.environment === "production"
          ? request.environment
          : "local",
      },
    );

    if (enforcement.decision === "block") {
      return {
        status: "blocked",
        reason: enforcement.reason,
        category: policy.category,
        risk: policy.risk,
        auditId: enforcement.auditId,
      };
    }

    return {
      status: "approval_required",
      reason: enforcement.reason,
      category: policy.category,
      risk: policy.risk,
      auditId: enforcement.auditId,
    };
  }

  const enforced = await executeWithEnforcement(
    request.actionRequest,
    {
      permissionLevel: request.permissionLevel,
      ...(request.approval !== undefined ? { approval: request.approval } : {}),
    },
    executor,
  );

  if (enforced.status === "approval_required") {
    return {
      status: "approval_required",
      reason: enforced.enforcement.reason,
      category: policy.category,
      risk: policy.risk,
      auditId: enforced.enforcement.auditId,
    };
  }

  if (policy.requiresApproval && request.approval?.approved !== true) {
    return {
      status: "approval_required",
      reason: `Policy requires approval for ${request.serverName}/${request.toolName}.`,
      category: policy.category,
      risk: policy.risk,
      auditId: enforced.enforcement.auditId,
    };
  }

  return {
    status: "executed",
    category: policy.category,
    risk: policy.risk,
    auditId: enforced.enforcement.auditId,
    result: enforced.result,
  };
}
