import type { BridgeResult } from "../mcp/mcp-bridge.js";
import type { BelExecutionPlan, BelNormalizedResult, BelToolName } from "./bel-types.js";

export function normalizeResult(
  raw: BridgeResult,
  plan: BelExecutionPlan,
  latencyMs: number,
): BelNormalizedResult {
  const tool: BelToolName = plan.steps[0]?.tool ?? "filesystem";

  return {
    planId: plan.planId,
    taskId: plan.taskId,
    success: raw.ok,
    ...(raw.output !== undefined ? { output: String(raw.output) } : {}),
    ...(raw.error !== undefined ? { error: raw.error } : {}),
    stepsCompleted: raw.ok ? plan.steps.length : 0,
    stepsTotal: plan.steps.length,
    latencyMs,
    tool,
    timestamp: new Date().toISOString(),
  };
}
