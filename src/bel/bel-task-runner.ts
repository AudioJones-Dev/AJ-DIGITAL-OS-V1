/**
 * BEL Task Runner — executes a validated BEL task via the MCP bridge.
 *
 * Takes an approved BelTaskRequest, dispatches to the correct tool,
 * logs the result, and returns a BelTaskResult.
 */

import { randomUUID } from "node:crypto";
import { dispatchToTool } from "../mcp/mcp-bridge.js";
import { logExecution } from "../mcp/mcp-logger.js";
import type { BelTaskRequest, BelTaskResult, BelToolName } from "./bel-types.js";

function inferTool(task: string): BelToolName {
  const lower = task.toLowerCase();
  if (lower.includes("http://") || lower.includes("https://") || lower.includes("browser") || lower.includes("screenshot")) {
    return "browser";
  }
  if (lower.includes("run ") || lower.includes("git ") || lower.includes("npm ") || lower.includes("docker ")) {
    return "shell";
  }
  return "filesystem";
}

export async function runBelTask(req: BelTaskRequest): Promise<BelTaskResult> {
  const taskId = req.taskId ?? randomUUID();
  const startMs = Date.now();
  const tool: BelToolName = req.tool ?? inferTool(req.task);

  if (req.dryRun) {
    return {
      taskId,
      agentId: req.agentId,
      tool,
      status: "completed",
      output: "dry-run: no action taken",
      dryRun: true,
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    };
  }

  let bridgeTaskType: Parameters<typeof dispatchToTool>[0]["taskType"];
  let targetPath: string | undefined;
  let command: string | undefined;

  switch (tool) {
    case "filesystem": {
      const params = req.params as { op?: string; filePath?: string; dirPath?: string } | undefined;
      if (params?.op === "read_file") {
        bridgeTaskType = "read_file";
        targetPath = params.filePath;
      } else {
        bridgeTaskType = "list_directory";
        targetPath = params?.dirPath;
      }
      break;
    }
    case "shell": {
      bridgeTaskType = "run_safe_command";
      command = (req.params as { command?: string } | undefined)?.command ?? req.task;
      break;
    }
    case "browser": {
      bridgeTaskType = "browser_task";
      break;
    }
  }

  const result = await dispatchToTool({
    taskType: bridgeTaskType,
    task: req.task,
    agentId: req.agentId,
    permissionLevel: tool === "browser" ? 4 : 2,
    ...(targetPath !== undefined ? { targetPath } : {}),
    ...(command !== undefined ? { command } : {}),
    ...(tool === "browser" && req.params !== undefined
      ? { browserParams: req.params as unknown as Parameters<typeof dispatchToTool>[0]["browserParams"] }
      : {}),
  });

  const latencyMs = Date.now() - startMs;
  const status = result.ok ? "completed" : "failed";

  logExecution({
    timestamp: new Date().toISOString(),
    taskId,
    agentId: req.agentId,
    task: req.task,
    tool,
    approved: true,
    ok: result.ok,
    ...(result.output !== undefined ? { output: String(result.output) } : {}),
    ...(result.error !== undefined ? { error: result.error } : {}),
    latencyMs,
  });

  return {
    taskId,
    agentId: req.agentId,
    tool,
    status,
    ...(result.output !== undefined ? { output: result.output } : {}),
    ...(result.error !== undefined ? { error: result.error } : {}),
    dryRun: false,
    latencyMs,
    timestamp: new Date().toISOString(),
  };
}
