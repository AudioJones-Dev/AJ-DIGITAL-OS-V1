import type { PermissionLevel } from "../permissions/permission-levels.js";

export type AgentEnvironment = "local" | "dev" | "staging" | "production";

export interface AgentIdentityContext {
  agentId: string;
  permissionLevel: PermissionLevel;
  tenantId: string | null;
  allowedTools: readonly string[];
  environment: AgentEnvironment;
  capabilities: readonly string[];
}

interface AgentIdentityTemplate {
  permissionLevel: PermissionLevel;
  tenantId: string | null;
  allowedTools: readonly string[];
  environment: AgentEnvironment;
  capabilities: readonly string[];
}

const AGENT_REGISTRY: Readonly<Record<string, AgentIdentityTemplate>> = {
  "api-mcp-execute": {
    permissionLevel: 2,
    tenantId: null,
    allowedTools: ["read_file", "list_directory", "run_safe_command", "browser_task"],
    environment: "local",
    capabilities: ["mcp_execute"],
  },
  "approval-webhook": {
    permissionLevel: 4,
    tenantId: null,
    allowedTools: ["remote_change"],
    environment: "local",
    capabilities: ["approval_resolution"],
  },
  "execution-webhook": {
    permissionLevel: 4,
    tenantId: null,
    allowedTools: ["remote_change"],
    environment: "local",
    capabilities: ["execution_resume"],
  },
  "mcp-adapter": {
    permissionLevel: 2,
    tenantId: null,
    allowedTools: ["read_file", "list_directory", "run_safe_command", "browser_task"],
    environment: "local",
    capabilities: ["mcp_dispatch"],
  },
  "mcp-bridge": {
    permissionLevel: 2,
    tenantId: null,
    allowedTools: ["read_file", "list_directory", "run_safe_command", "browser_task"],
    environment: "local",
    capabilities: ["mcp_route"],
  },
  "shared-memory": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["memory_persistence"],
  },
  "publisher-agent": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["artifact_publish"],
  },
  "local-agent-file-tools": {
    permissionLevel: 2,
    tenantId: null,
    allowedTools: ["write_file", "read_file", "list_directory"],
    environment: "local",
    capabilities: ["local_file_io"],
  },
  "run-store": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["run_persistence"],
  },
  "deliverable-store": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["deliverable_persistence"],
  },
  "assistant-session-store": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["session_persistence"],
  },
  "conversation-store": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["conversation_persistence"],
  },
  "browser-agent-session-manager": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["session_storage"],
  },
  "browser-agent-md-writer": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["report_write"],
  },
  "browser-agent-csv-writer": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["report_write"],
  },
  "browser-agent-env-writer": {
    permissionLevel: 3,
    tenantId: null,
    allowedTools: ["write_file"],
    environment: "local",
    capabilities: ["config_write"],
  },
  "runtime-default": {
    permissionLevel: 2,
    tenantId: null,
    allowedTools: ["filesystem", "shell", "browser"],
    environment: "local",
    capabilities: ["bel_execute"],
  },
};

export class AgentIdentityResolutionError extends Error {
  constructor(agentId: string) {
    super(`Unknown agent identity: ${agentId}`);
    this.name = "AgentIdentityResolutionError";
  }
}

export class AgentTenantMismatchError extends Error {
  constructor(agentId: string, tenantId: string, clientId: string) {
    super(`Agent ${agentId} cannot access client ${clientId}; expected tenant ${tenantId}.`);
    this.name = "AgentTenantMismatchError";
  }
}

export class AgentToolAccessError extends Error {
  constructor(agentId: string, toolName: string) {
    super(`Agent ${agentId} is not allowed to use tool ${toolName}.`);
    this.name = "AgentToolAccessError";
  }
}

export function resolveAgentContext(agentId: string): AgentIdentityContext {
  const normalizedAgentId = agentId.trim();
  if (!normalizedAgentId) {
    throw new AgentIdentityResolutionError(agentId);
  }

  const template = AGENT_REGISTRY[normalizedAgentId];
  if (!template) {
    throw new AgentIdentityResolutionError(normalizedAgentId);
  }

  return {
    agentId: normalizedAgentId,
    permissionLevel: template.permissionLevel,
    tenantId: template.tenantId,
    allowedTools: template.allowedTools,
    environment: template.environment,
    capabilities: template.capabilities,
  };
}

export function assertAgentTenantAccess(agent: AgentIdentityContext, clientId?: string | null): void {
  if (!clientId || agent.tenantId === null) {
    return;
  }

  if (agent.tenantId !== clientId) {
    throw new AgentTenantMismatchError(agent.agentId, agent.tenantId, clientId);
  }
}

export function assertAgentToolAccess(agent: AgentIdentityContext, toolName: string): void {
  if (!agent.allowedTools.includes(toolName)) {
    throw new AgentToolAccessError(agent.agentId, toolName);
  }
}

export function listAgents(): AgentIdentityContext[] {
  return Object.keys(AGENT_REGISTRY).map((agentId) => resolveAgentContext(agentId));
}
