/**
 * BEL Controller — top-level entry point for Browser Execution Layer requests.
 *
 * Flow:
 *   inbound request
 *     → classify task
 *     → evaluate policy
 *     → attach / create session
 *     → run task via BEL task runner
 *     → return result
 */

import { randomUUID } from "node:crypto";
import { classifyMcpTask } from "../mcp/mcp-task-classifier.js";
import { evaluateMcpPolicy } from "../mcp/mcp-policy.js";
import { getOrCreateSession } from "./bel-session-manager.js";
import { runBelTask } from "./bel-task-runner.js";
import { logExecution } from "../mcp/mcp-logger.js";
import type { BelTaskRequest, BelTaskResult } from "./bel-types.js";

export interface BelControllerInput {
  /** Agent identifier */
  agentId: string;
  /** Natural-language task */
  task: string;
  /** Explicit tool override */
  tool?: BelTaskRequest["tool"] | undefined;
  /** Tool-specific parameters */
  params?: Record<string, unknown> | undefined;
  /** Named session to attach to */
  sessionName?: string | undefined;
  /** If true: validate & plan but do not execute */
  dryRun?: boolean | undefined;
}

export interface BelControllerResult {
  taskId: string;
  agentId: string;
  sessionId: string | null;
  approved: boolean;
  dryRun: boolean;
  plannedAction: string;
  result: BelTaskResult | null;
  error?: string;
}

export async function handleBelRequest(input: BelControllerInput): Promise<BelControllerResult> {
  const taskId = randomUUID();
  const dryRun = input.dryRun ?? false;

  // 1. Classify
  const classification = classifyMcpTask(input.task);

  // 2. Policy check
  const policy = evaluateMcpPolicy({ task: input.task, classification });

  if (!policy.approved) {
    logExecution({
      timestamp: new Date().toISOString(),
      taskId,
      agentId: input.agentId,
      task: input.task,
      tool: "policy-blocked",
      approved: false,
      ok: false,
      error: policy.reason,
      latencyMs: 0,
    });

    return {
      taskId,
      agentId: input.agentId,
      sessionId: null,
      approved: false,
      dryRun,
      plannedAction: policy.plannedAction,
      result: null,
      error: policy.reason,
    };
  }

  // 3. Session
  const sessionName = input.sessionName ?? "default";
  const session = getOrCreateSession(input.agentId, sessionName);

  // 4. Build task request
  const taskReq: BelTaskRequest = {
    taskId,
    agentId: input.agentId,
    task: input.task,
    ...(input.tool !== undefined ? { tool: input.tool } : {}),
    ...(input.params !== undefined ? { params: input.params } : {}),
    sessionName,
    dryRun,
  };

  // 5. Execute
  const result = await runBelTask(taskReq);

  return {
    taskId,
    agentId: input.agentId,
    sessionId: session.sessionId,
    approved: true,
    dryRun,
    plannedAction: policy.plannedAction,
    result,
  };
}
