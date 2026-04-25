import { dispatchToTool } from "../mcp/mcp-bridge.js";
import { logExecution } from "../mcp/mcp-logger.js";
import { addActivePlan, completePlan, failPlan } from "./bel-state-store.js";
import { shouldRetry, getDelay } from "./bel-retry-policy.js";
import { normalizeResult } from "./bel-result-normalizer.js";
import { escalate } from "./bel-escalation.js";
import type { BelExecutionPlan, BelNormalizedResult, BelToolCall, BelToolName } from "./bel-types.js";
import type { BridgeRequest, BridgeResult } from "../mcp/mcp-bridge.js";
import type { BrowserParams } from "../mcp/mcp-tools/browser-tool.js";
import { appendSystemEvent } from "../core/events/event-ledger.js";
import { incrementMetric } from "../core/observability/metrics-store.js";

function emitRunLifecycleEvent(
  eventType: "run_created" | "run_completed" | "run_failed",
  plan: BelExecutionPlan,
  extra?: Record<string, unknown>,
): void {
  try {
    appendSystemEvent({
      eventType,
      category: "run",
      runId: plan.taskId,
      actorId: plan.agentId,
      actorType: "agent",
      environment: "local",
      payload: { planId: plan.planId, agentId: plan.agentId, ...(extra ?? {}) },
    });
    if (eventType === "run_created") incrementMetric("run_created_count");
    if (eventType === "run_completed") incrementMetric("run_completed_count");
    if (eventType === "run_failed") incrementMetric("run_failed_count");
  } catch {
    // BEL must never break on observability hook failure
  }
}

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
  emitRunLifecycleEvent("run_created", plan);

  if (plan.steps.length === 0) {
    failPlan(plan.planId);
    emitRunLifecycleEvent("run_failed", plan, { reason: "no_steps" });
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
      emitRunLifecycleEvent("run_failed", plan, { error: lastRaw.error ?? "Step failed" });
      return normalizeResult(lastRaw, plan, Date.now() - startMs);
    }
  }

  completePlan(plan.planId);
  emitRunLifecycleEvent("run_completed", plan);
  return normalizeResult(lastRaw, plan, Date.now() - startMs);
}
