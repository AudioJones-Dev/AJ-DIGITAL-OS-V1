import type { PermissionLevel } from "../../security/permissions/permission-levels.js";

export interface ControlActionContext {
  agentId: string;
  permissionLevel: PermissionLevel;
  tenantId?: string;
  environment: "local" | "dev" | "staging" | "production";
  performedBy: string;
}

/** Build a permissive default context for backward-compatible callers */
export function defaultContext(performedBy: string): ControlActionContext {
  return {
    agentId: performedBy,
    permissionLevel: 2,
    environment: "local",
    performedBy,
  };
}
