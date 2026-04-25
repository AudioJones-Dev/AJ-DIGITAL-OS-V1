import { randomUUID } from "node:crypto";
import { dispatchToTool } from "./mcp-bridge.js";
import { logExecution } from "./mcp-logger.js";
import {
  assertAgentToolAccess,
  resolveAgentContext,
} from "../security/agents/agent-registry.js";

export type McpTaskType =
  | "read_file"
  | "write_file"
  | "list_directory"
  | "run_safe_command";

export interface McpExecutionRequest {
  taskType: McpTaskType;
  task: string;
  dryRun?: boolean;
  targetPath?: string;
  command?: string;
  /** Caller-supplied task ID; generated if absent. */
  taskId?: string;
  /** Agent that triggered this request. */
  agentId?: string;
}

export type McpExecutionResult = {
  ok: boolean;
  taskType: string;
  output?: unknown;
  error?: string;
  latencyMs: number;
};

export async function executeMcpTask(request: McpExecutionRequest): Promise<McpExecutionResult> {
  const startMs = Date.now();
  const taskId = request.taskId ?? randomUUID();
  const agentId = request.agentId ?? "mcp-adapter";
  const agentContext = resolveAgentContext(agentId);
  assertAgentToolAccess(agentContext, request.taskType);

  if (request.dryRun) {
    console.log("[MCP-ADAPTER] dry-run — skipping execution", { taskType: request.taskType });
    return { ok: true, taskType: request.taskType, output: "dry-run: no action taken", latencyMs: 0 };
  }

  const bridgeResult = await dispatchToTool({
    taskType: request.taskType,
    task: request.task,
    agentId: agentContext.agentId,
    permissionLevel: agentContext.permissionLevel,
    environment: agentContext.environment,
    ...(request.targetPath !== undefined ? { targetPath: request.targetPath } : {}),
    ...(request.command !== undefined ? { command: request.command } : {}),
  });

  const latencyMs = Date.now() - startMs;

  logExecution({
    timestamp: new Date().toISOString(),
    taskId,
    agentId,
    task: request.task,
    tool: request.taskType,
    approved: true,
    ok: bridgeResult.ok,
    ...(bridgeResult.output !== undefined ? { output: String(bridgeResult.output) } : {}),
    ...(bridgeResult.error !== undefined ? { error: bridgeResult.error } : {}),
    latencyMs,
  });

  return {
    ok: bridgeResult.ok,
    taskType: request.taskType,
    ...(bridgeResult.output !== undefined ? { output: bridgeResult.output } : {}),
    ...(bridgeResult.error !== undefined ? { error: bridgeResult.error } : {}),
    latencyMs,
  };
}
