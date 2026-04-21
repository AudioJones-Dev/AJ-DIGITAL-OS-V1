import { routeModelTask } from "../../model-routing/model-router.js";
import type { RoleHandler, RoleStepInput, RoleStepOutput } from "../agent-role-types.js";

// ── Executor Input / Output ────────────────────────────────────────

export interface ExecutorInput {
  action: string;
  context?: Record<string, unknown> | undefined;
}

export interface ExecutorOutput {
  result: unknown;
  summary: string;
}

/**
 * Executor role handler — uses cheap/local model (Ollama) or
 * deterministic transforms to carry out a specific action.
 *
 * This handler routes through model-routing with cost tier constraints
 * so it always resolves to local or deterministic providers.
 */
export function createExecutorHandler(): RoleHandler<ExecutorInput, ExecutorOutput> {
  return {
    role: "executor",
    async execute(input: RoleStepInput<ExecutorInput>): Promise<RoleStepOutput<ExecutorOutput>> {
      const start = Date.now();
      const payload = input.payload;

      const result = await routeModelTask<ExecutorInput, string>(
        {
          taskType: "transform",
          task: payload.action,
          context: payload,
          constraints: { maxCostTier: 1 },
          allowEscalation: false,
        },
        {
          deterministic: (ctx) => JSON.stringify({
            result: ctx.context ?? {},
            summary: `Deterministic execution of: ${ctx.action}`,
          }),
        },
      );

      if (!result.ok || result.output === null) {
        return {
          ok: false,
          role: "executor",
          output: null,
          durationMs: Date.now() - start,
          retries: 0,
          warnings: result.warnings,
          error: result.error ?? "Executor produced no output.",
        };
      }

      let parsed: ExecutorOutput;
      try {
        const raw = typeof result.output === "string" ? JSON.parse(result.output) : result.output;
        parsed = {
          result: raw.result ?? raw,
          summary: typeof raw.summary === "string" ? raw.summary : String(result.output).slice(0, 200),
        };
      } catch {
        // Non-JSON output is still valid — wrap it
        parsed = {
          result: result.output,
          summary: String(result.output).slice(0, 200),
        };
      }

      return {
        ok: true,
        role: "executor",
        output: parsed,
        durationMs: Date.now() - start,
        retries: 0,
        warnings: result.warnings,
        error: null,
      };
    },
  };
}
