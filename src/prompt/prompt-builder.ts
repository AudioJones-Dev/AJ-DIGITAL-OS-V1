import { buildClientPolicy } from "./client-policy.js";
import { buildMemoryContext } from "./memory-context.js";
import { SYSTEM_POLICY } from "./system-policy.js";
import { buildTaskContext } from "./task-context.js";
import { buildWorkflowPolicy } from "./workflow-policy.js";

export interface BuildPromptInput {
  clientId: string;
  workflowId: string;
  objective: string;
  sourceMaterials?: unknown[];
  clientConstraints?: Record<string, unknown>;
  memorySummary?: string;
  outputContract?: string;
}

export interface BuiltPrompt {
  system: string;
  user: string;
  metadata: Record<string, unknown>;
}

export const buildPrompt = (input: BuildPromptInput): BuiltPrompt => {
  const system = [
    SYSTEM_POLICY,
    buildClientPolicy(input.clientId, input.clientConstraints),
    buildWorkflowPolicy(input.workflowId),
  ].join("\n\n");

  const user = [
    buildMemoryContext(input.memorySummary),
    buildTaskContext(input.objective, input.sourceMaterials),
    input.outputContract ?? "Output contract: return a structured result with clear sections and no fabricated claims.",
  ].join("\n\n");

  return {
    system,
    user,
    metadata: {
      clientId: input.clientId,
      workflowId: input.workflowId,
    },
  };
};
