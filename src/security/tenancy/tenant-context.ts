import type { TenantContext } from "./tenant-types.js";

export interface TenantValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTenantContext(context: TenantContext | null | undefined): TenantValidationResult {
  const errors: string[] = [];

  if (!context) {
    return {
      valid: false,
      errors: ["Tenant context is required."],
    };
  }

  if (!context.tenantId?.trim()) errors.push("tenantId is required.");
  if (!context.workspaceRoot?.trim()) errors.push("workspaceRoot is required.");
  if (!context.retentionPolicy?.trim()) errors.push("retentionPolicy is required.");
  if (!context.createdAt?.trim()) errors.push("createdAt is required.");
  if (!Array.isArray(context.allowedAgents)) errors.push("allowedAgents must be an array.");
  if (!Array.isArray(context.allowedTools)) errors.push("allowedTools must be an array.");
  if (!Array.isArray(context.allowedEnvironments)) errors.push("allowedEnvironments must be an array.");

  const createdAt = new Date(context.createdAt).getTime();
  if (Number.isNaN(createdAt)) {
    errors.push("createdAt must be a valid ISO date.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
