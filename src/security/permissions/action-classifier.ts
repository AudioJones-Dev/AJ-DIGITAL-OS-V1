import type { ActionClassification, ActionRisk, AgentActionRequest } from "./permission-levels.js";

const SAFE_COMMANDS = [
  "git status",
  "git diff",
  "git log",
  "npm run lint",
  "npm run test",
  "npm run build",
  "npm run typecheck",
] as const;

const CAUTION_COMMAND_PREFIXES = [
  "npm install",
  "npm ci",
  "pip install",
  "git pull",
  "git merge",
  "docker compose up",
  "database migrate",
  "db migrate",
] as const;

const RESTRICTED_COMMAND_PATTERNS = [
  "rm -rf",
  "del /s",
  "git reset --hard",
  "git push --force",
  "git branch -d",
  "git branch -D",
  "git push origin --delete",
  "deploy production",
  "secret rotate",
  "database delete",
  "chmod -r",
  "chown -r",
] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function classifyTerminalCommand(commandRaw: string): ActionClassification {
  const command = normalize(commandRaw);

  if (RESTRICTED_COMMAND_PATTERNS.some((pattern) => command.includes(pattern.toLowerCase()))) {
    return {
      category: "COMMAND_RESTRICTED",
      risk: "critical",
      requiresApproval: true,
      reason: "Command is classified as restricted or destructive.",
    };
  }

  if (command.startsWith("git push")) {
    return {
      category: "GIT_PUSH",
      risk: "high",
      requiresApproval: true,
      reason: "Remote push modifies shared repository state.",
    };
  }

  if (SAFE_COMMANDS.some((safe) => command === safe)) {
    return {
      category: "COMMAND_SAFE",
      risk: "low",
      requiresApproval: false,
      reason: "Command is in the explicit safe allowlist.",
    };
  }

  if (CAUTION_COMMAND_PREFIXES.some((prefix) => command.startsWith(prefix))) {
    return {
      category: "COMMAND_CAUTION",
      risk: "medium",
      requiresApproval: true,
      reason: "Command may change dependencies, containers, or shared state.",
    };
  }

  return {
    category: "COMMAND_CAUTION",
    risk: "high",
    requiresApproval: true,
    reason: "Unrecognized command defaults to caution and approval requirement.",
  };
}

function browserRisk(browserAction: string | undefined, target: string | undefined): { risk: ActionRisk; requiresApproval: boolean; reason: string } {
  const signal = normalize(`${browserAction ?? ""} ${target ?? ""}`);
  const criticalPatterns = ["purchase", "buy", "checkout", "send", "delete", "submit", "account", "payment"];

  if (criticalPatterns.some((p) => signal.includes(p))) {
    return {
      risk: "high",
      requiresApproval: true,
      reason: "Browser action appears transactional, destructive, or account-changing.",
    };
  }

  return {
    risk: "medium",
    requiresApproval: false,
    reason: "Browser action is non-destructive but still a privileged runtime action.",
  };
}

export function classifyAgentAction(request: AgentActionRequest): ActionClassification {
  const actionType = normalize(request.actionType);

  if (actionType === "terminal_command") {
    return classifyTerminalCommand(request.command ?? "");
  }

  if (actionType === "read" || actionType === "read_file" || actionType === "inspect_docs" || actionType === "summarize_repo") {
    return {
      category: "READ",
      risk: "low",
      requiresApproval: false,
      reason: "Read-only inspection action.",
    };
  }

  if (actionType === "write" || actionType === "write_file" || actionType === "edit_file") {
    return {
      category: "WRITE",
      risk: "medium",
      requiresApproval: false,
      reason: "Filesystem write action.",
    };
  }

  if (actionType === "git_commit") {
    return {
      category: "GIT_COMMIT",
      risk: "medium",
      requiresApproval: false,
      reason: "Commit action mutates repository history.",
    };
  }

  if (actionType === "git_push") {
    return {
      category: "GIT_PUSH",
      risk: "high",
      requiresApproval: true,
      reason: "Remote push modifies shared repository state.",
    };
  }

  if (actionType === "remote_change") {
    return {
      category: "REMOTE_CHANGE",
      risk: "high",
      requiresApproval: true,
      reason: "Remote system configuration change.",
    };
  }

  if (actionType === "deployment") {
    const target = normalize(request.target ?? "");
    const isProduction = target.includes("prod") || target.includes("production");
    return {
      category: "DEPLOYMENT",
      risk: isProduction ? "critical" : "high",
      requiresApproval: true,
      reason: isProduction ? "Production deployment is a critical action." : "Deployment action changes runtime environments.",
    };
  }

  if (actionType === "secret_access") {
    return {
      category: "SECRET_ACCESS",
      risk: "high",
      requiresApproval: true,
      reason: "Secret read/access is sensitive.",
    };
  }

  if (actionType === "secret_modify") {
    return {
      category: "SECRET_MODIFY",
      risk: "critical",
      requiresApproval: true,
      reason: "Secret modification requires explicit approval.",
    };
  }

  if (actionType === "mcp_tool_call") {
    const tool = normalize(request.toolName ?? "");
    const highRiskTool = tool.includes("shell") || tool.includes("browser") || tool.includes("write");
    return {
      category: "MCP_TOOL_CALL",
      risk: highRiskTool ? "high" : "medium",
      requiresApproval: highRiskTool,
      reason: highRiskTool
        ? "MCP tool call targets a privileged execution surface."
        : "MCP tool call is privileged and must be policy-checked.",
    };
  }

  if (actionType === "browser_action") {
    const browser = browserRisk(request.browserAction, request.target);
    return {
      category: "BROWSER_ACTION",
      risk: browser.risk,
      requiresApproval: browser.requiresApproval,
      reason: browser.reason,
    };
  }

  if (actionType === "client_data_access") {
    return {
      category: "CLIENT_DATA_ACCESS",
      risk: "high",
      requiresApproval: true,
      reason: "Client data access is sensitive and must be traceable.",
    };
  }

  if (actionType === "destructive_admin") {
    return {
      category: "DESTRUCTIVE_ADMIN",
      risk: "critical",
      requiresApproval: true,
      reason: "Destructive/admin action requires explicit human approval.",
    };
  }

  return {
    category: "COMMAND_CAUTION",
    risk: "high",
    requiresApproval: true,
    reason: "Unknown action type defaults to caution and approval.",
  };
}
