import { failPlan } from "./bel-state-store.js";
import { logExecution } from "../mcp/mcp-logger.js";
import type { BelExecutionPlan, BelToolName } from "./bel-types.js";

export type EscalationLevel = "log" | "block" | "notify";

export function escalate(
  plan: BelExecutionPlan,
  error: string,
  attempts: number,
): EscalationLevel {
  const tool = plan.steps[0]?.tool as BelToolName | undefined;

  let level: EscalationLevel;
  if (attempts >= 3 || tool === "shell") {
    level = "block";
  } else if (attempts >= 2 || tool === "browser") {
    level = "notify";
  } else {
    level = "log";
  }

  failPlan(plan.planId);

  logExecution({
    timestamp: new Date().toISOString(),
    taskId: plan.taskId,
    agentId: plan.agentId,
    task: `ESCALATION[${level}]: ${error}`,
    tool: tool ?? "filesystem",
    approved: true,
    ok: false,
    error,
    latencyMs: 0,
  });

  return level;
}
