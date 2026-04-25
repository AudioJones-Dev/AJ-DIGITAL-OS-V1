import { dispatchToTool } from "../mcp/mcp-bridge.js";
import { logExecution } from "../mcp/mcp-logger.js";
import { addActivePlan, completePlan, failPlan } from "./bel-state-store.js";
import { shouldRetry, getDelay } from "./bel-retry-policy.js";
import { normalizeResult } from "./bel-result-normalizer.js";
import { escalate } from "./bel-escalation.js";
import type { BelExecutionPlan, BelNormalizedResult, BelToolCall, BelToolName } from "./bel-types.js";
import type { BridgeRequest, BridgeResult } from "../mcp/mcp-bridge.js";
import type { BrowserParams } from "../mcp/mcp-tools/browser-tool.js";

function buildBridgeRequest(step: BelToolCall, taskDesc: string): BridgeRequest {
  if (step.tool === "filesystem") {
    const p = step.params as { filePath?: string; dirPath?: string };
    if (step.operation === "read_file") {
      return {
        taskType: "read_file",
        task: taskDesc,
        ...(p.filePath ? { targetPath: p.filePath } : {}),
      };
    }
    return {
      taskType: "list_directory",
      task: taskDesc,
      ...(p.dirPath ? { targetPath: p.dirPath } : {}),
    };
  }

  if (step.tool === "shell") {
    const p = step.params as { command?: string };
    return {
      taskType: "run_safe_command",
      task: taskDesc,
      command: p.command ?? step.operation,
    };
  }

  if (step.tool === "browser") {
    return {
      taskType: "browser_task",
      task: taskDesc,
      browserParams: step.params as unknown as BrowserParams,
    };
  }

  return { taskType: "list_directory", task: taskDesc };
}

export async function executePlan(plan: BelExecutionPlan): Promise<BelNormalizedResult> {
  const startMs = Date.now();
  addActivePlan(plan);

  if (plan.steps.length === 0) {
    failPlan(plan.planId);
    return normalizeResult({ ok: false, error: "Execution plan has no steps." }, plan, 0);
  }

  let lastRaw: BridgeResult = { ok: false, error: "Not started" };

  for (const step of plan.steps) {
    const bridgeReq = buildBridgeRequest(step, `plan:${plan.planId}`);
    let attempt = 0;

    while (true) {
      attempt++;
      try {
        lastRaw = await dispatchToTool(bridgeReq);
      } catch (err: unknown) {
        lastRaw = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }

      logExecution({
        timestamp: new Date().toISOString(),
        taskId: plan.taskId,
        agentId: plan.agentId,
        task: `plan:${plan.planId} step:${step.operation} attempt:${attempt}`,
        tool: step.tool,
        approved: true,
        ok: lastRaw.ok,
        ...(lastRaw.output !== undefined ? { output: String(lastRaw.output) } : {}),
        ...(lastRaw.error !== undefined ? { error: lastRaw.error } : {}),
        latencyMs: Date.now() - startMs,
      });

      if (lastRaw.ok) break;
      if (!shouldRetry(step.tool as BelToolName, attempt, lastRaw.error ?? "")) break;
      await new Promise<void>((r) => setTimeout(r, getDelay(attempt)));
    }

    if (!lastRaw.ok) {
      escalate(plan, lastRaw.error ?? "Step failed", attempt);
      return normalizeResult(lastRaw, plan, Date.now() - startMs);
    }
  }

  completePlan(plan.planId);
  return normalizeResult(lastRaw, plan, Date.now() - startMs);
}
