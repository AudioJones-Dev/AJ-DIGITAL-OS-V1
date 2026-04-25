/**
 * BEL v4 DAG — MAP attribution emitters.
 *
 * Fire-and-forget bridge into the attribution-tracker. Never throws.
 */

import { emitEvent } from "../../attribution/attribution-tracker.js";
import type { AttributionEventType, AttributionChannel } from "../../attribution/attribution-types.js";
import type { BelDagNode, BelDagRunState } from "./dag-types.js";

const DEFAULT_AGENT_ID = "bel-dag-runtime";

function safeEmit(payload: {
  eventType: AttributionEventType;
  runId: string;
  agentId: string;
  channel: AttributionChannel;
  clientId?: string;
  contentType?: string;
  contentId?: string;
  metadata?: Record<string, unknown>;
}): void {
  try {
    void emitEvent(payload).catch(() => {
      /* swallow async failures */
    });
  } catch {
    /* swallow sync failures */
  }
}

export function emitDagRunCreated(state: BelDagRunState, actor?: string): void {
  safeEmit({
    eventType: "dag_run_created",
    runId: state.runId,
    agentId: actor ?? DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    metadata: { dagId: state.dagId, environment: state.environment, nodeCount: state.nodes.length },
  });
}

export function emitDagNodeStarted(state: BelDagRunState, node: BelDagNode): void {
  safeEmit({
    eventType: "dag_node_started",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    contentType: node.type,
    contentId: node.nodeId,
    metadata: { dagId: state.dagId, nodeName: node.name, attempt: node.attempts },
  });
}

export function emitDagNodeCompleted(state: BelDagRunState, node: BelDagNode): void {
  safeEmit({
    eventType: "dag_node_completed",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    contentType: node.type,
    contentId: node.nodeId,
    metadata: { dagId: state.dagId, nodeName: node.name },
  });
}

export function emitDagNodeFailed(state: BelDagRunState, node: BelDagNode): void {
  safeEmit({
    eventType: "dag_node_failed",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    contentType: node.type,
    contentId: node.nodeId,
    metadata: { dagId: state.dagId, error: node.error, attempts: node.attempts },
  });
}

export function emitDagNodeRetried(state: BelDagRunState, node: BelDagNode): void {
  safeEmit({
    eventType: "dag_node_retried",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    contentType: node.type,
    contentId: node.nodeId,
    metadata: { dagId: state.dagId, attempts: node.attempts, maxAttempts: node.maxAttempts },
  });
}

export function emitDagRunCompleted(state: BelDagRunState): void {
  safeEmit({
    eventType: "dag_run_completed",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    metadata: { dagId: state.dagId, environment: state.environment },
  });
}

export function emitDagRunFailed(state: BelDagRunState): void {
  safeEmit({
    eventType: "dag_run_failed",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    metadata: { dagId: state.dagId, environment: state.environment },
  });
}

/**
 * For terminal nodes whose output is content-bearing — emits a content_published event
 * so the existing MAP validator picks it up.
 */
export function emitDagContentPublishedIfApplicable(state: BelDagRunState, node: BelDagNode): void {
  const eligible = node.type === "publish" || node.type === "generate" || node.type === "attribution";
  if (!eligible) return;

  safeEmit({
    eventType: "content_published",
    runId: state.runId,
    agentId: DEFAULT_AGENT_ID,
    channel: "distribution",
    ...(state.tenantId ? { clientId: state.tenantId } : {}),
    contentType: node.type,
    contentId: node.nodeId,
    metadata: { dagId: state.dagId, nodeName: node.name },
  });
}
