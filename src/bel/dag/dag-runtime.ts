/**
 * BEL v4 DAG — execution runtime.
 *
 * Topological execution of a directed acyclic graph with status tracking,
 * retry handling, approval gates, attribution emission, and stub cache hooks.
 */

import { randomUUID } from "node:crypto";

import {
  emitDagContentPublishedIfApplicable,
  emitDagNodeCompleted,
  emitDagNodeFailed,
  emitDagNodeRetried,
  emitDagNodeStarted,
  emitDagRunCompleted,
  emitDagRunCreated,
  emitDagRunFailed,
} from "./dag-attribution.js";
import {
  appendDagAuditEvent,
  saveDagRun,
  saveNodeOutput,
} from "./dag-store.js";
import { emitRunVerdict } from "../../evaluation/eval-emit.js";
import type {
  BelDagAuditEvent,
  BelDagNode,
  BelDagNodeStatus,
  BelDagPlan,
  BelDagRunState,
} from "./dag-types.js";

export interface CreateDagRunOptions {
  /** Override the actor recorded for the dag_run_created event. */
  actor?: string;
  /** Skip persistence — useful for tests that want to inspect state in memory. */
  skipPersist?: boolean;
}

export interface RunToCompletionOptions {
  /** Maximum number of advance iterations before bailing out — defence against unexpected loops. */
  maxIterations?: number;
  /** Re-run completed nodes when true (force=true). */
  force?: boolean;
}

// ── Cache Hooks (stubs — wired to cache-augmentation-layer in a later step) ────

export const dagCacheHooks = {
  async beforeNodeExecute(_node: BelDagNode): Promise<unknown | null> {
    return null;
  },
  async afterNodeComplete(_node: BelDagNode, _output: unknown): Promise<void> {
    return;
  },
};

export async function beforeNodeExecute(node: BelDagNode): Promise<unknown | null> {
  return dagCacheHooks.beforeNodeExecute(node);
}

export async function afterNodeComplete(node: BelDagNode, output: unknown): Promise<void> {
  return dagCacheHooks.afterNodeComplete(node, output);
}

// ── Audit ──────────────────────────────────────────────────────────────────────

function writeAudit(event: Omit<BelDagAuditEvent, "eventId" | "timestamp">): BelDagAuditEvent {
  const full: BelDagAuditEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  try {
    appendDagAuditEvent(full);
  } catch {
    /* persistence is best-effort */
  }
  return full;
}

// ── Run lifecycle ──────────────────────────────────────────────────────────────

export function createDagRun(plan: BelDagPlan, options: CreateDagRunOptions = {}): BelDagRunState {
  // Production runs require tenantId
  if (plan.environment === "production" && !plan.tenantId) {
    throw new Error("tenantId required for production DAG runs");
  }

  const now = new Date().toISOString();
  const nodes: BelDagNode[] = plan.nodes.map((node) => ({
    ...node,
    status: "pending",
    attempts: 0,
  }));

  const state: BelDagRunState = {
    dagId: plan.dagId,
    runId: plan.runId,
    ...(plan.tenantId !== undefined ? { tenantId: plan.tenantId } : {}),
    nodes,
    edges: plan.edges,
    status: "pending",
    environment: plan.environment,
    createdAt: now,
    updatedAt: now,
    ...(plan.createdBy !== undefined ? { createdBy: plan.createdBy } : {}),
  };

  // Flag any high-risk nodes in the audit log (do not block at runtime yet).
  for (const node of nodes) {
    if (node.riskLevel === "high" || node.riskLevel === "restricted") {
      writeAudit({
        dagId: state.dagId,
        runId: state.runId,
        nodeId: node.nodeId,
        event: "high_risk_node_flagged",
        metadata: { riskLevel: node.riskLevel },
      });
    }
  }

  writeAudit({
    dagId: state.dagId,
    runId: state.runId,
    event: "dag_run_created",
    toStatus: "pending",
    ...(options.actor !== undefined ? { actor: options.actor } : {}),
  });

  if (!options.skipPersist) {
    try {
      saveDagRun(state);
    } catch {
      /* best-effort */
    }
  }

  emitDagRunCreated(state, options.actor);
  return state;
}

// ── Status derivation ──────────────────────────────────────────────────────────

export function deriveRunStatusFromNodes(nodes: BelDagNode[]): BelDagRunState["status"] {
  if (nodes.length === 0) return "pending";

  const hasFailed = nodes.some((n) => n.status === "failed");
  if (hasFailed) {
    const allTerminal = nodes.every(
      (n) =>
        n.status === "completed" ||
        n.status === "failed" ||
        n.status === "skipped",
    );
    if (allTerminal) return "failed";
    return "failed";
  }

  if (nodes.some((n) => n.status === "waiting_for_approval")) {
    return "waiting_for_approval";
  }

  if (nodes.every((n) => n.status === "completed" || n.status === "skipped")) {
    return "completed";
  }

  if (nodes.some((n) => n.status === "running")) return "running";

  if (nodes.every((n) => n.status === "pending")) return "pending";

  return "running";
}

// ── Edge / readiness logic ─────────────────────────────────────────────────────

function getParentNodes(state: BelDagRunState, nodeId: string): BelDagNode[] {
  const parentIds = state.edges.filter((e) => e.to === nodeId).map((e) => e.from);
  return state.nodes.filter((n) => parentIds.includes(n.nodeId));
}

export function getReadyNodes(state: BelDagRunState): BelDagNode[] {
  return state.nodes.filter((node) => {
    if (node.status !== "pending") return false;
    const parents = getParentNodes(state, node.nodeId);
    if (parents.length === 0) return true;
    return parents.every((p) => p.status === "completed");
  });
}

function hasFailedAncestor(state: BelDagRunState, nodeId: string, visited = new Set<string>()): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);
  const parents = getParentNodes(state, nodeId);
  for (const parent of parents) {
    const edge = state.edges.find((e) => e.from === parent.nodeId && e.to === nodeId);
    const skipAllowed = edge?.condition === "on_failure" || edge?.condition === "always";
    if (parent.status === "failed" && !skipAllowed) return true;
    if (hasFailedAncestor(state, parent.nodeId, visited)) return true;
  }
  return false;
}

// ── State mutation helpers ─────────────────────────────────────────────────────

function findNodeIndex(state: BelDagRunState, nodeId: string): number {
  return state.nodes.findIndex((n) => n.nodeId === nodeId);
}

function transitionNodeStatus(
  state: BelDagRunState,
  nodeId: string,
  toStatus: BelDagNodeStatus,
  patch: Partial<BelDagNode> = {},
): { state: BelDagRunState; node: BelDagNode } {
  const idx = findNodeIndex(state, nodeId);
  if (idx === -1) throw new Error(`Node not found: ${nodeId}`);

  const previous = state.nodes[idx]!;
  const updatedNode: BelDagNode = { ...previous, ...patch, status: toStatus };
  state.nodes[idx] = updatedNode;
  state.status = deriveRunStatusFromNodes(state.nodes);
  state.updatedAt = new Date().toISOString();

  writeAudit({
    dagId: state.dagId,
    runId: state.runId,
    nodeId,
    event: `node_${toStatus}`,
    fromStatus: previous.status,
    toStatus,
    ...(updatedNode.error !== undefined ? { error: updatedNode.error } : {}),
  });

  try {
    saveDagRun(state);
  } catch {
    /* best-effort */
  }

  return { state, node: updatedNode };
}

// ── Public mutations ───────────────────────────────────────────────────────────

export function completeNode(
  state: BelDagRunState,
  nodeId: string,
  output: unknown,
): BelDagRunState {
  const now = new Date().toISOString();
  const { state: next, node } = transitionNodeStatus(state, nodeId, "completed", {
    completedAt: now,
  });

  try {
    saveNodeOutput({
      nodeId: node.nodeId,
      dagId: state.dagId,
      runId: state.runId,
      output,
      completedAt: now,
    });
  } catch {
    /* best-effort */
  }

  void afterNodeComplete(node, output).catch(() => {
    /* fire-and-forget */
  });

  emitDagNodeCompleted(next, node);
  emitDagContentPublishedIfApplicable(next, node);

  if (next.status === "completed") emitDagRunCompleted(next);
  if (next.status === "failed") emitDagRunFailed(next);
  // L15 Evaluate — sibling verdict emit at the run-completion seam (never throws).
  if (next.status === "completed" || next.status === "failed") emitRunVerdict(next);

  return next;
}

export function failNode(
  state: BelDagRunState,
  nodeId: string,
  error: string,
): BelDagRunState {
  const { state: next, node } = transitionNodeStatus(state, nodeId, "failed", {
    error,
    completedAt: new Date().toISOString(),
  });
  emitDagNodeFailed(next, node);
  if (next.status === "failed") emitDagRunFailed(next);
  // L15 Evaluate — sibling verdict emit at the run-completion seam (never throws).
  if (next.status === "failed") emitRunVerdict(next);
  return next;
}

export function retryNode(state: BelDagRunState, nodeId: string): BelDagRunState {
  const idx = findNodeIndex(state, nodeId);
  if (idx === -1) throw new Error(`Node not found: ${nodeId}`);
  const node = state.nodes[idx]!;

  if (node.status !== "failed") {
    throw new Error(`Cannot retry node ${nodeId}: status is ${node.status}, expected failed`);
  }

  if (node.attempts >= node.maxAttempts) {
    writeAudit({
      dagId: state.dagId,
      runId: state.runId,
      nodeId,
      event: "node_retry_exhausted",
      metadata: { attempts: node.attempts, maxAttempts: node.maxAttempts },
    });
    return state;
  }
  const newAttempts = node.attempts + 1;

  const updatedNode: BelDagNode = {
    ...node,
    status: "pending",
    attempts: newAttempts,
  };
  delete updatedNode.error;
  delete updatedNode.completedAt;
  delete updatedNode.startedAt;

  state.nodes[idx] = updatedNode;
  state.status = deriveRunStatusFromNodes(state.nodes);
  state.updatedAt = new Date().toISOString();

  writeAudit({
    dagId: state.dagId,
    runId: state.runId,
    nodeId,
    event: "node_retried",
    fromStatus: "failed",
    toStatus: "pending",
    metadata: { attempts: newAttempts, maxAttempts: node.maxAttempts },
  });

  try {
    saveDagRun(state);
  } catch {
    /* best-effort */
  }

  emitDagNodeRetried(state, updatedNode);
  return state;
}

export function skipNode(state: BelDagRunState, nodeId: string): BelDagRunState {
  const { state: next } = transitionNodeStatus(state, nodeId, "skipped", {
    completedAt: new Date().toISOString(),
  });
  return next;
}

// ── Node execution ─────────────────────────────────────────────────────────────

export async function executeNode(
  state: BelDagRunState,
  node: BelDagNode,
): Promise<BelDagNode> {
  // Approval gates suspend execution rather than running immediately.
  if (node.type === "approval_gate") {
    const idx = findNodeIndex(state, node.nodeId);
    const previous = state.nodes[idx]!;
    const updatedNode: BelDagNode = {
      ...previous,
      status: "waiting_for_approval",
      startedAt: new Date().toISOString(),
    };
    state.nodes[idx] = updatedNode;
    state.status = deriveRunStatusFromNodes(state.nodes);
    state.updatedAt = new Date().toISOString();

    writeAudit({
      dagId: state.dagId,
      runId: state.runId,
      nodeId: node.nodeId,
      event: "node_waiting_for_approval",
      fromStatus: previous.status,
      toStatus: "waiting_for_approval",
    });

    try {
      saveDagRun(state);
    } catch {
      /* best-effort */
    }

    return updatedNode;
  }

  // Mark running
  const startIdx = findNodeIndex(state, node.nodeId);
  const previous = state.nodes[startIdx]!;
  const startedAt = new Date().toISOString();
  const runningNode: BelDagNode = {
    ...previous,
    status: "running",
    startedAt,
    attempts: previous.attempts + (previous.attempts === 0 ? 1 : 0),
  };
  state.nodes[startIdx] = runningNode;
  state.status = deriveRunStatusFromNodes(state.nodes);
  state.updatedAt = new Date().toISOString();

  writeAudit({
    dagId: state.dagId,
    runId: state.runId,
    nodeId: node.nodeId,
    event: "node_running",
    fromStatus: previous.status,
    toStatus: "running",
  });
  emitDagNodeStarted(state, runningNode);

  // Cache lookup (stub — currently always misses)
  const cached = await beforeNodeExecute(runningNode).catch(() => null);
  if (cached !== null && cached !== undefined) {
    return runningNode;
  }

  // Simulate work — node-type-specific stub. The real adapter swap-in happens later.
  const output: Record<string, unknown> = {
    nodeId: node.nodeId,
    nodeType: node.type,
    nodeName: node.name,
    simulatedAt: new Date().toISOString(),
  };

  const completedAt = new Date().toISOString();
  const completedNode: BelDagNode = {
    ...runningNode,
    status: "completed",
    completedAt,
  };
  state.nodes[startIdx] = completedNode;
  state.status = deriveRunStatusFromNodes(state.nodes);
  state.updatedAt = completedAt;

  writeAudit({
    dagId: state.dagId,
    runId: state.runId,
    nodeId: node.nodeId,
    event: "node_completed",
    fromStatus: "running",
    toStatus: "completed",
  });

  try {
    saveNodeOutput({
      nodeId: completedNode.nodeId,
      dagId: state.dagId,
      runId: state.runId,
      output,
      completedAt,
    });
    saveDagRun(state);
  } catch {
    /* best-effort */
  }

  void afterNodeComplete(completedNode, output).catch(() => {
    /* fire-and-forget */
  });

  emitDagNodeCompleted(state, completedNode);
  emitDagContentPublishedIfApplicable(state, completedNode);

  return completedNode;
}

// ── Step execution ────────────────────────────────────────────────────────────

export async function executeReadyNodes(state: BelDagRunState): Promise<BelDagRunState> {
  const ready = getReadyNodes(state);

  // Mark children of failed parents as skipped (when no override edge condition)
  for (const node of state.nodes) {
    if (node.status !== "pending") continue;
    if (hasFailedAncestor(state, node.nodeId)) {
      const idx = findNodeIndex(state, node.nodeId);
      const previous = state.nodes[idx]!;
      const updatedNode: BelDagNode = {
        ...previous,
        status: "skipped",
        completedAt: new Date().toISOString(),
      };
      state.nodes[idx] = updatedNode;
      writeAudit({
        dagId: state.dagId,
        runId: state.runId,
        nodeId: node.nodeId,
        event: "node_skipped_failed_parent",
        fromStatus: "pending",
        toStatus: "skipped",
      });
    }
  }

  for (const node of ready) {
    await executeNode(state, node);
  }

  state.status = deriveRunStatusFromNodes(state.nodes);
  state.updatedAt = new Date().toISOString();

  try {
    saveDagRun(state);
  } catch {
    /* best-effort */
  }

  if (state.status === "completed") emitDagRunCompleted(state);
  if (state.status === "failed") emitDagRunFailed(state);
  // L15 Evaluate — sibling verdict emit at the run-completion seam (never throws).
  if (state.status === "completed" || state.status === "failed") emitRunVerdict(state);

  return state;
}

export async function runDagToCompletion(
  state: BelDagRunState,
  options: RunToCompletionOptions = {},
): Promise<BelDagRunState> {
  const maxIterations = options.maxIterations ?? state.nodes.length * 4 + 4;

  if (options.force) {
    for (let i = 0; i < state.nodes.length; i += 1) {
      const n = state.nodes[i]!;
      if (n.status === "completed") {
        state.nodes[i] = { ...n, status: "pending", attempts: 0 };
      }
    }
  }

  let iter = 0;
  while (iter < maxIterations) {
    iter += 1;
    const ready = getReadyNodes(state);
    if (ready.length === 0) break;

    await executeReadyNodes(state);

    if (
      state.status === "completed" ||
      state.status === "failed" ||
      state.status === "waiting_for_approval" ||
      state.status === "cancelled"
    ) {
      break;
    }
  }

  state.status = deriveRunStatusFromNodes(state.nodes);
  state.updatedAt = new Date().toISOString();
  try {
    saveDagRun(state);
  } catch {
    /* best-effort */
  }
  return state;
}
