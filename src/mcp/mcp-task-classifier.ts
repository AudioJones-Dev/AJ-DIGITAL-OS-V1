export type McpTaskClassification =
  | "filesystem_task"
  | "shell_task"
  | "code_task"
  | "unsafe_task"
  | "not_mcp_task";

const UNSAFE_PATTERNS = [
  "delete",
  "remove-item",
  "del ",
  "rmdir",
  "format",
  "shutdown",
  "wipe",
  "erase",
  "setx",
  "credential",
  "token",
  "secret",
  "api key",
  "password",
];

const FILESYSTEM_HINTS = [
  "list files",
  "list directory",
  "show files",
  "read file",
  "write file",
  "open file",
  "folder",
  "directory",
  "package.json",
  "c:\\",
  "g:\\",
];

const SHELL_HINTS = [
  "run build",
  "npm run build",
  "npm test",
  "git status",
  "git diff",
  "docker compose ps",
  "run command",
];

const CODE_HINTS = [
  "write code",
  "implement",
  "refactor",
  "typescript",
  "function",
  "strategy doc",
  "design doc",
];

function includesAny(input: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => input.includes(p));
}

export function classifyMcpTask(task: string): McpTaskClassification {
  const normalized = task.trim().toLowerCase();

  if (!normalized) {
    return "not_mcp_task";
  }

  if (includesAny(normalized, UNSAFE_PATTERNS)) {
    return "unsafe_task";
  }

  if (includesAny(normalized, FILESYSTEM_HINTS)) {
    return "filesystem_task";
  }

  if (includesAny(normalized, SHELL_HINTS)) {
    return "shell_task";
  }

  if (includesAny(normalized, CODE_HINTS)) {
    return "code_task";
  }

  return "not_mcp_task";
}
