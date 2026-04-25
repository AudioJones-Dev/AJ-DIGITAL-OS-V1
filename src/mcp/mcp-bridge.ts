/**
 * MCP Bridge — routes an approved MCP task to the correct tool implementation.
 *
 * Acts as a single dispatch surface so the execution adapter and the BEL
 * controller do not need to know about individual tool modules.
 */

import type { McpTaskType } from "./mcp-execution-adapter.js";
import { runFilesystemTool } from "./mcp-tools/filesystem-tool.js";
import { runBrowserTool, type BrowserParams } from "./mcp-tools/browser-tool.js";
import { runShellTool } from "./mcp-tools/shell-tool.js";
import type { AgentActionRequest } from "../security/permissions/permission-levels.js";
import { mcpSecureExecute } from "../security/mcp/mcp-secure-executor.js";
import type { ExecuteWithEnforcementContext } from "../security/permissions/enforced-execution.js";
import type { TenantContext } from "../security/tenancy/tenant-types.js";
import { resolveAgentContext } from "../security/agents/agent-registry.js";

export interface BridgeRequest {
  taskType: McpTaskType | "browser_task";
  task: string;
  targetPath?: string | undefined;
  command?: string | undefined;
  browserParams?: BrowserParams | undefined;
  agentId?: string | undefined;
  permissionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | undefined;
  approval?: ExecuteWithEnforcementContext["approval"];
  clientId?: string | null | undefined;
  tenantContext?: TenantContext | undefined;
  environment?: "local" | "dev" | "staging" | "production" | undefined;
}

export interface BridgeResult {
  ok: boolean;
  output?: unknown | undefined;
  error?: string | undefined;
  approvalRequired?: boolean | undefined;
  auditId?: string | undefined;
  approvalId?: string | undefined;
}

function mapSecureResult<T extends BridgeResult>(
  result: Awaited<ReturnType<typeof mcpSecureExecute<T>>>,
): BridgeResult {
  if (result.status === "blocked") {
    return {
      ok: false,
      error: result.reason,
      ...(result.auditId !== undefined ? { auditId: result.auditId } : {}),
    };
  }

  if (result.status === "approval_required") {
    return {
      ok: false,
      error: result.reason,
      approvalRequired: true,
      ...(result.auditId !== undefined ? { auditId: result.auditId } : {}),
    };
  }

  return {
    ...result.result,
    ...(result.auditId !== undefined ? { auditId: result.auditId } : {}),
  };
}

function toActionRequest(req: BridgeRequest): AgentActionRequest {
  const actionType =
    req.taskType === "run_safe_command"
      ? "terminal_command"
      : req.taskType === "browser_task"
        ? "browser_action"
        : req.taskType === "read_file" || req.taskType === "list_directory"
          ? "read_file"
          : "mcp_tool_call";

  return {
    agentId: req.agentId ?? "mcp-bridge",
    actionType,
    ...(req.command !== undefined ? { command: req.command } : {}),
    ...(req.targetPath !== undefined ? { target: req.targetPath } : {}),
    ...(req.browserParams?.op !== undefined ? { browserAction: req.browserParams.op } : {}),
    ...(req.taskType !== undefined ? { toolName: req.taskType } : {}),
    ...(req.clientId !== undefined ? { clientId: req.clientId } : {}),
  };
}

export async function dispatchToTool(req: BridgeRequest): Promise<BridgeResult> {
  const agentContext = resolveAgentContext(req.agentId ?? "mcp-bridge");
  const environment = req.environment ?? agentContext.environment;

  if (req.clientId && !req.tenantContext) {
    return {
      ok: false,
      error: "Tenant context is required for client-facing MCP operations.",
    };
  }

  if (req.taskType === "list_directory") {
    const secured = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "list_directory",
        actionRequest: toActionRequest(req),
        environment,
        permissionLevel: req.permissionLevel ?? agentContext.permissionLevel,
        ...(req.approval !== undefined ? { approval: req.approval } : {}),
        ...(req.tenantContext !== undefined ? { tenantContext: req.tenantContext } : {}),
      },
      async () => runFilesystemTool({ op: "list_files", dirPath: req.targetPath ?? "c:\\dev\\aj-digital-os" }),
    );
    return mapSecureResult(secured);
  }

  if (req.taskType === "read_file") {
    if (!req.targetPath) return { ok: false, error: "targetPath is required for read_file." };
    const filePath = req.targetPath;
    const secured = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "read_file",
        actionRequest: toActionRequest(req),
        environment,
        permissionLevel: req.permissionLevel ?? agentContext.permissionLevel,
        ...(req.approval !== undefined ? { approval: req.approval } : {}),
        ...(req.tenantContext !== undefined ? { tenantContext: req.tenantContext } : {}),
      },
      async () => runFilesystemTool({ op: "read_file", filePath }),
    );
    return mapSecureResult(secured);
  }

  if (req.taskType === "run_safe_command") {
    if (!req.command) return { ok: false, error: "command is required for run_safe_command." };
    const secured = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "run_safe_command",
        actionRequest: toActionRequest(req),
        environment,
        permissionLevel: req.permissionLevel ?? agentContext.permissionLevel,
        ...(req.approval !== undefined ? { approval: req.approval } : {}),
        ...(req.tenantContext !== undefined ? { tenantContext: req.tenantContext } : {}),
      },
      async () => {
        const r = await runShellTool({ command: req.command as string });
        return {
          ok: r.ok,
          ...(r.output !== undefined ? { output: r.output } : {}),
          ...(r.error !== undefined ? { error: r.error } : {}),
        };
      },
    );
    return mapSecureResult(secured);
  }

  if (req.taskType === "browser_task") {
    if (!req.browserParams) return { ok: false, error: "browserParams are required for browser_task." };
    const secured = await mcpSecureExecute(
      {
        serverName: "mcp-bridge",
        toolName: "browser_task",
        actionRequest: toActionRequest(req),
        environment,
        permissionLevel: req.permissionLevel ?? agentContext.permissionLevel,
        ...(req.approval !== undefined ? { approval: req.approval } : {}),
        ...(req.tenantContext !== undefined ? { tenantContext: req.tenantContext } : {}),
      },
      async () => runBrowserTool(req.browserParams as BrowserParams),
    );
    return mapSecureResult(secured);
  }

  // write_file is intentionally not wired — read-only policy for now.
  if (req.taskType === "write_file") {
    return { ok: false, error: "write_file is not permitted via MCP bridge." };
  }

  return { ok: false, error: `Unhandled taskType: ${req.taskType as string}` };
}
