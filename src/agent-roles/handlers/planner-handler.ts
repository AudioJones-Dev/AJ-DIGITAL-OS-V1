import { routeModelTask } from "../../model-routing/model-router.js";
import type { RoleHandler, RoleStepInput, RoleStepOutput } from "../agent-role-types.js";

// ── Planner Input / Output ─────────────────────────────────────────

export interface PlannerInput {
  objective: string;
  systemPrompt?: string | undefined;
  contextSummary?: string | undefined;
}

export interface PlanStep {
  stepIndex: number;
  action: string;
  expectedOutput: string;
  role: "executor" | "validator" | "monitor";
}

export interface PlannerOutput {
  plan: PlanStep[];
  reasoning: string;
}

/**
 * Planner role handler — uses high-intelligence model (OpenAI)
 * to decompose an objective into executable steps.
 */
export function createPlannerHandler(): RoleHandler<PlannerInput, PlannerOutput> {
  return {
    role: "planner",
    async execute(input: RoleStepInput<PlannerInput>): Promise<RoleStepOutput<PlannerOutput>> {
      const start = Date.now();
      const payload = input.payload;

      const systemPrompt = payload.systemPrompt ??
        "You are a task planner for AJ Digital OS. Decompose the objective into concrete executable steps. Return JSON: { plan: [{ stepIndex, action, expectedOutput, role }], reasoning: string }";

      const userMessage = [
        `Objective: ${payload.objective}`,
        payload.contextSummary ? `Context: ${payload.contextSummary}` : "",
        input.previousOutput ? `Previous output: ${JSON.stringify(input.previousOutput)}` : "",
      ].filter(Boolean).join("\n\n");

      const result = await routeModelTask<PlannerInput, string>(
        {
          taskType: "planner",
          task: payload.objective,
          context: payload,
          allowEscalation: true,
        },
        {
          openai: {
            systemPrompt,
            userMessage,
            responseFormat: "json",
            temperature: 0.3,
          },
        },
      );

      if (!result.ok || result.output === null) {
        return {
          ok: false,
          role: "planner",
          output: null,
          durationMs: Date.now() - start,
          retries: 0,
          warnings: result.warnings,
          error: result.error ?? "Planner produced no output.",
        };
      }

      // Parse structured plan from model output
      let parsed: PlannerOutput;
      try {
        const raw = typeof result.output === "string" ? JSON.parse(result.output) : result.output;
        parsed = {
          plan: Array.isArray(raw.plan) ? raw.plan : [],
          reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
        };
      } catch {
        return {
          ok: false,
          role: "planner",
          output: null,
          durationMs: Date.now() - start,
          retries: 0,
          warnings: result.warnings,
          error: "Planner output is not valid JSON.",
        };
      }

      if (parsed.plan.length === 0) {
        return {
          ok: false,
          role: "planner",
          output: null,
          durationMs: Date.now() - start,
          retries: 0,
          warnings: result.warnings,
          error: "Planner returned an empty plan.",
        };
      }

      return {
        ok: true,
        role: "planner",
        output: parsed,
        durationMs: Date.now() - start,
        retries: 0,
        warnings: result.warnings,
        error: null,
      };
    },
  };
}
