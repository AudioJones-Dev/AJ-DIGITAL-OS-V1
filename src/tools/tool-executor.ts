import { randomUUID } from "node:crypto";
import { PermissionGate } from "./permission-gate.js";
import { ToolRegistry } from "./tool-registry.js";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolInputSchema,
} from "./tool-types.js";

// ── Input Validation ───────────────────────────────────────────────

function validateInput(
  input: unknown,
  schema: ToolInputSchema,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["Input must be a plain object."] };
  }

  const record = input as Record<string, unknown>;

  for (const [fieldName, field] of Object.entries(schema)) {
    const value = record[fieldName];

    // Required check
    if (field.required === true && value === undefined) {
      errors.push(`Missing required field: "${fieldName}".`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    // Type check
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== field.type) {
      errors.push(
        `Field "${fieldName}" expected type "${field.type}", got "${actualType}".`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

// ── Executor ───────────────────────────────────────────────────────

/**
 * Permission-aware, schema-validating tool executor.
 *
 * Lifecycle:
 *   1. Permission gate evaluation
 *   2. Enabled check
 *   3. Input validation against inputSchema (if defined)
 *   4. Execute handler with try/catch
 *   5. Return structured result with invocation ID + timing
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
    const invocationId = context.invocation?.invocationId ?? randomUUID();
    const start = Date.now();

    // 1. Permission gate
    const decision = this.permissionGate.evaluate(toolName, context);

    if (!decision.allowed) {
      return {
        ok: false,
        toolName,
        invocationId,
        durationMs: Date.now() - start,
        warnings: [],
        errors: decision.reasons,
      };
    }

    // 2. Resolve tool
    let tool;
    try {
      tool = this.registry.get(toolName);
    } catch {
      return {
        ok: false,
        toolName,
        invocationId,
        durationMs: Date.now() - start,
        warnings: [],
        errors: [`Tool "${toolName}" is not registered.`],
      };
    }

    // 3. Enabled check
    if (tool.enabled === false) {
      return {
        ok: false,
        toolName,
        invocationId,
        durationMs: Date.now() - start,
        warnings: [],
        errors: [`Tool "${toolName}" is disabled.`],
      };
    }

    // 4. Input validation
    if (tool.inputSchema) {
      const validation = validateInput(payload, tool.inputSchema);
      if (!validation.ok) {
        return {
          ok: false,
          toolName,
          invocationId,
          durationMs: Date.now() - start,
          warnings: [],
          errors: validation.errors,
        };
      }
    }

    // 5. Execute
    try {
      const result = (await tool.execute(payload, context)) as TResult;

      return {
        ok: true,
        toolName,
        invocationId,
        result,
        durationMs: Date.now() - start,
        warnings: [],
        errors: [],
      };
    } catch (err) {
      return {
        ok: false,
        toolName,
        invocationId,
        durationMs: Date.now() - start,
        warnings: [],
        errors: [err instanceof Error ? err.message : String(err)],
      };
    }
  }
}

export { validateInput };
