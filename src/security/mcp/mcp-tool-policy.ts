import type { McpToolPolicy } from "./mcp-security-types.js";

const DEFAULT_POLICIES: McpToolPolicy[] = [
  {
    serverName: "mcp-bridge",
    toolName: "read_file",
    category: "READ",
    risk: "low",
    allowedPermissionLevels: [0, 1, 2, 3, 4, 5],
    requiresApproval: false,
    allowedEnvironments: ["local", "dev", "staging", "production"],
    requiresTenantContext: false,
  },
  {
    serverName: "mcp-bridge",
    toolName: "list_directory",
    category: "READ",
    risk: "low",
    allowedPermissionLevels: [0, 1, 2, 3, 4, 5],
    requiresApproval: false,
    allowedEnvironments: ["local", "dev", "staging", "production"],
    requiresTenantContext: false,
  },
  {
    serverName: "mcp-bridge",
    toolName: "run_safe_command",
    category: "COMMAND_SAFE",
    risk: "medium",
    allowedPermissionLevels: [2, 3, 4, 5],
    requiresApproval: false,
    allowedEnvironments: ["local", "dev"],
    requiresTenantContext: false,
  },
  {
    serverName: "mcp-bridge",
    toolName: "browser_task",
    category: "BROWSER_ACTION",
    risk: "high",
    allowedPermissionLevels: [2, 3, 4, 5],
    requiresApproval: true,
    allowedEnvironments: ["local", "dev", "staging"],
    requiresTenantContext: true,
    oauthScopes: ["browser:automation"],
  },
];

function key(serverName: string, toolName: string): string {
  return `${serverName}::${toolName}`.toLowerCase();
}

const policyMap = new Map<string, McpToolPolicy>(
  DEFAULT_POLICIES.map((p) => [key(p.serverName, p.toolName), p]),
);

export function getMcpToolPolicy(serverName: string, toolName: string): McpToolPolicy | null {
  return policyMap.get(key(serverName, toolName)) ?? null;
}

export function registerMcpToolPolicy(policy: McpToolPolicy): void {
  policyMap.set(key(policy.serverName, policy.toolName), policy);
}

export function listMcpToolPolicies(): McpToolPolicy[] {
  return [...policyMap.values()];
}
