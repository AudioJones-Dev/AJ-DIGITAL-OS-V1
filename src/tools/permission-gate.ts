import type { ToolExecutionContext, ToolPermissionDecision } from "./tool-types.js";

/**
 * Lightweight permission gate for future tool execution routing.
 */
export class PermissionGate {
  evaluate(toolName: string, context: ToolExecutionContext): ToolPermissionDecision {
    const allowedToolNames = context.allowedToolNames;

    if (!allowedToolNames || allowedToolNames.length === 0) {
      return {
        allowed: true,
        toolName,
        reasons: [],
      };
    }

    const allowed = allowedToolNames.includes(toolName);

    return {
      allowed,
      toolName,
      reasons: allowed ? [] : [`Tool "${toolName}" is not allowed in the current execution context.`],
    };
  }
}
