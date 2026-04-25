import { describe, expect, it } from "vitest";

import { registerMcpToolPolicy } from "../../../src/security/mcp/mcp-tool-policy.js";
import { mcpSecureExecute } from "../../../src/security/mcp/mcp-secure-executor.js";
import type { TenantContext } from "../../../src/security/tenancy/tenant-types.js";

const tenant: TenantContext = {
  tenantId: "client-acme",
  tenantType: "client",
  workspaceRoot: "c:/dev/AJ-DIGITAL-OS/data/clients/acme",
  dataClassification: "confidential",
  allowedAgents: ["agent-1"],
  allowedTools: ["browser_task", "read_file"],
  allowedEnvironments: ["dev", "staging"],
  retentionPolicy: "90-days",
  createdAt: new Date().toISOString(),
};

describe("mcp secure executor", () => {
  it("blocks unregistered MCP tool", async () => {
    const result = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "unknown_tool",
        actionRequest: { agentId: "agent-1", actionType: "mcp_tool_call", toolName: "unknown_tool" },
        permissionLevel: 4,
        environment: "dev",
      },
      async () => ({ ok: true }),
    );

    expect(result.status).toBe("blocked");
  });

  it("allows registered low-risk tool", async () => {
    const result = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "read_file",
        actionRequest: { agentId: "agent-1", actionType: "read_file", target: "README.md" },
        permissionLevel: 2,
        environment: "dev",
      },
      async () => ({ ok: true, output: "ok" }),
    );

    expect(result.status).toBe("executed");
  });

  it("requires approval for privileged MCP tool", async () => {
    let executed = false;

    const result = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "browser_task",
        actionRequest: {
          agentId: "agent-1",
          actionType: "mcp_tool_call",
          toolName: "browser_task",
        },
        permissionLevel: 4,
        environment: "dev",
        tenantContext: tenant,
      },
      async () => {
        executed = true;
        return { ok: true };
      },
    );

    expect(result.status).toBe("approval_required");
    expect(executed).toBe(false);
  });

  it("blocks tenant-required tool without tenant context", async () => {
    const result = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "browser_task",
        actionRequest: {
          agentId: "agent-1",
          actionType: "mcp_tool_call",
          toolName: "browser_task",
        },
        permissionLevel: 4,
        environment: "dev",
      },
      async () => ({ ok: true }),
    );

    expect(result.status).toBe("blocked");
  });

  it("blocks tool outside allowed environment", async () => {
    const result = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "run_safe_command",
        actionRequest: { agentId: "agent-1", actionType: "terminal_command", command: "npm run test" },
        permissionLevel: 2,
        environment: "production",
      },
      async () => ({ ok: true }),
    );

    expect(result.status).toBe("blocked");
  });

  it("supports custom policy registration", async () => {
    registerMcpToolPolicy({
      serverName: "mcp-bridge",
      toolName: "custom_low_risk",
      category: "MCP_TOOL_CALL",
      risk: "low",
      allowedPermissionLevels: [2, 3, 4, 5],
      requiresApproval: false,
      allowedEnvironments: ["dev"],
      requiresTenantContext: false,
    });

    const result = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "custom_low_risk",
        actionRequest: { agentId: "agent-1", actionType: "mcp_tool_call", toolName: "custom_low_risk" },
        permissionLevel: 2,
        environment: "dev",
      },
      async () => ({ ok: true }),
    );

    expect(result.status).toBe("executed");
  });
});
