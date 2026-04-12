import { PermissionGate } from "./permission-gate.js";
import { ToolRegistry } from "./tool-registry.js";
import type { ToolExecutionContext, ToolExecutionResult } from "./tool-types.js";

/**
 * Permission-aware tool executor scaffold.
 */
export class ToolExecutor {
  constructor(
    private readonly registry = new ToolRegistry(),
    private readonly permissionGate = new PermissionGate(),
  ) {}

  async execute<TResult = unknown>(
    toolName: string,
    payload: unknown,
    context: ToolExecutionContext = {},
  ): Promise<ToolExecutionResult<TResult>> {
    const decision = this.permissionGate.evaluate(toolName, context);

    if (!decision.allowed) {
      return {
        ok: false,
        toolName,
        warnings: [],
        errors: decision.reasons,
      };
    }

    const tool = this.registry.get(toolName);
    const result = await tool.execute(payload, context) as TResult;

    return {
      ok: true,
      toolName,
      result,
      warnings: [],
      errors: [],
    };
  }
}
