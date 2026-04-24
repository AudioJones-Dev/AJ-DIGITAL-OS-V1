import type { McpTaskType } from "./mcp-execution-adapter.js";
import type { McpTaskClassification } from "./mcp-task-classifier.js";

const ALLOWED_PATH_ROOTS = ["c:\\dev", "c:\\dev\\aj-digital-os"];

const BLOCKED_PATH_PREFIXES = [
  "c:\\windows",
  "c:\\users\\tyron.audiojones\\appdata",
  "g:\\cache",
];

const BLOCKED_PATH_CONTAINS = [".env", "secret", "token", "credential", "key"];

const ALLOWED_COMMANDS = ["git status", "git diff", "npm run build", "npm test", "docker compose ps"];

const BLOCKED_COMMAND_CONTAINS = [
  "remove-item",
  "del ",
  "rmdir",
  "format",
  "shutdown",
  "setx",
  "credential",
  "token",
  "secret",
  "key",
  "appdata",
  "c:\\windows",
];

export interface McpPolicyInput {
  task: string;
  classification: McpTaskClassification;
}

export interface McpPolicyDecision {
  approved: boolean;
  reason: string;
  plannedAction: string;
  taskType: McpTaskType | null;
  targetPath?: string;
  command?: string;
}

function normalize(value: string): string {
  return value.trim().replaceAll("/", "\\").toLowerCase();
}

function extractWindowsPath(task: string): string | null {
  const match = task.match(/[a-zA-Z]:\\[^\s"']+/);
  if (match?.[0]) return match[0];
  if (task.toLowerCase().includes("package.json")) return "C:\\dev\\aj-digital-os\\package.json";
  if (task.toLowerCase().includes("repo")) return "C:\\dev\\aj-digital-os";
  return null;
}

function isBlockedPath(path: string): boolean {
  const normalized = normalize(path);
  return (
    BLOCKED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    BLOCKED_PATH_CONTAINS.some((segment) => normalized.includes(segment))
  );
}

function isAllowedPath(path: string): boolean {
  const normalized = normalize(path);
  return ALLOWED_PATH_ROOTS.some((prefix) => normalized.startsWith(prefix));
}

function extractAllowedCommand(task: string): string | null {
  const normalized = task.trim().toLowerCase();
  const found = ALLOWED_COMMANDS.find((cmd) => normalized.includes(cmd));
  return found ?? null;
}

function hasBlockedCommand(task: string): boolean {
  const normalized = task.trim().toLowerCase();
  return BLOCKED_COMMAND_CONTAINS.some((token) => normalized.includes(token));
}

export function evaluateMcpPolicy(input: McpPolicyInput): McpPolicyDecision {
  const task = input.task.trim();
  const classification = input.classification;

  if (classification === "unsafe_task") {
    return {
      approved: false,
      reason: "Task classified as unsafe.",
      plannedAction: "Reject unsafe request.",
      taskType: null,
    };
  }

  if (classification === "not_mcp_task" || classification === "code_task") {
    return {
      approved: false,
      reason: "Task is not an MCP-approved local machine action.",
      plannedAction: "Route to normal model workflow.",
      taskType: null,
    };
  }

  if (classification === "filesystem_task") {
    const path = extractWindowsPath(task) ?? "C:\\dev\\aj-digital-os";

    if (isBlockedPath(path)) {
      return {
        approved: false,
        reason: "Path is blocked by MCP policy.",
        plannedAction: `Reject filesystem access to ${path}`,
        taskType: null,
        targetPath: path,
      };
    }

    if (!isAllowedPath(path)) {
      return {
        approved: false,
        reason: "Path is outside allowed MCP roots.",
        plannedAction: `Reject filesystem access to ${path}`,
        taskType: null,
        targetPath: path,
      };
    }

    const normalizedTask = task.toLowerCase();
    const taskType: McpTaskType = normalizedTask.includes("write") ? "write_file" : normalizedTask.includes("read") ? "read_file" : "list_directory";

    return {
      approved: true,
      reason: "Filesystem request approved by policy.",
      plannedAction: `${taskType} on ${path}`,
      taskType,
      targetPath: path,
    };
  }

  const command = extractAllowedCommand(task);

  if (hasBlockedCommand(task)) {
    return {
      approved: false,
      reason: "Command contains blocked operations.",
      plannedAction: "Reject shell request.",
      taskType: null,
    };
  }

  if (!command) {
    return {
      approved: false,
      reason: "Command is not in allowlist.",
      plannedAction: "Reject shell request.",
      taskType: null,
    };
  }

  return {
    approved: true,
    reason: "Shell request approved by command allowlist.",
    plannedAction: `run_safe_command: ${command}`,
    taskType: "run_safe_command",
    command,
  };
}
