import { randomUUID } from "node:crypto";
import type {
  BelTaskRequest,
  BelToolName,
  BelExecutionMode,
  BelExecutionPlan,
  BelToolCall,
} from "./bel-types.js";

function inferTool(req: BelTaskRequest): BelToolName {
  if (req.tool) return req.tool;
  const lower = req.task.toLowerCase();
  if (
    lower.includes("http://") ||
    lower.includes("https://") ||
    lower.includes("browser") ||
    lower.includes("screenshot")
  ) {
    return "browser";
  }
  if (
    lower.includes("run ") ||
    lower.includes("git ") ||
    lower.includes("npm ") ||
    lower.includes("docker ")
  ) {
    return "shell";
  }
  return "filesystem";
}

function inferOperation(tool: BelToolName, req: BelTaskRequest): string {
  if (tool === "shell") {
    return (req.params as { command?: string } | undefined)?.command ?? req.task;
  }
  if (tool === "browser") {
    return (req.params as { op?: string } | undefined)?.op ?? "open_url";
  }
  const lower = req.task.toLowerCase();
  if (lower.includes("read")) return "read_file";
  return "list_directory";
}

function inferMode(task: string, tool: BelToolName): BelExecutionMode {
  const lower = task.toLowerCase();
  if (
    lower.includes("research") ||
    lower.includes("explore") ||
    lower.includes("find") ||
    lower.includes("search")
  ) {
    return "explore";
  }
  if (tool === "shell" || tool === "browser") {
    return "supervisor";
  }
  return "script";
}

function requiresApproval(tool: BelToolName, operation: string): boolean {
  if (tool === "shell" || tool === "browser") return true;
  if (tool === "filesystem" && (operation === "read_file" || operation === "list_directory")) {
    return false;
  }
  return false;
}

export function createExecutionPlan(req: BelTaskRequest): BelExecutionPlan {
  const tool = inferTool(req);
  const operation = inferOperation(tool, req);
  const mode = inferMode(req.task, tool);

  const step: BelToolCall = {
    tool,
    operation,
    params: req.params ?? {},
    retryable: tool !== "filesystem",
    timeout: tool === "browser" ? 30_000 : 10_000,
  };

  return {
    planId: randomUUID(),
    taskId: req.taskId,
    agentId: req.agentId,
    mode,
    steps: [step],
    estimatedDuration: step.timeout,
    requiresApproval: requiresApproval(tool, operation),
    createdAt: new Date().toISOString(),
  };
}
