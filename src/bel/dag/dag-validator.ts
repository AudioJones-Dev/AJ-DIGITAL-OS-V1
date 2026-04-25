/**
 * BEL v4 DAG — plan validator.
 *
 * Verifies graph integrity and surfaces risk flags before execution.
 */

import type {
  BelDagEdge,
  BelDagNode,
  BelDagPlan,
  BelDagValidationResult,
} from "./dag-types.js";

function detectCycle(nodes: BelDagNode[], edges: BelDagEdge[]): string[] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.nodeId, []);
  }
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) continue;
    adjacency.get(edge.from)!.push(edge.to);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cyclePath: string[] = [];

  function dfs(nodeId: string): boolean {
    if (stack.has(nodeId)) {
      cyclePath.push(nodeId);
      return true;
    }
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    stack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const next of neighbors) {
      if (dfs(next)) {
        cyclePath.push(nodeId);
        return true;
      }
    }

    stack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.nodeId) && dfs(node.nodeId)) {
      return cyclePath.reverse();
    }
  }

  return [];
}

export function validateDagPlan(plan: BelDagPlan): BelDagValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const highRiskNodes: string[] = [];
  const approvalGates: string[] = [];

  // 4. duplicate nodeIds
  const nodeIdSet = new Set<string>();
  for (const node of plan.nodes) {
    if (nodeIdSet.has(node.nodeId)) {
      errors.push(`Duplicate nodeId: ${node.nodeId}`);
    }
    nodeIdSet.add(node.nodeId);
  }

  // 3. edge references must point to valid nodeIds
  for (const edge of plan.edges) {
    if (!nodeIdSet.has(edge.from)) {
      errors.push(`Edge references unknown 'from' node: ${edge.from}`);
    }
    if (!nodeIdSet.has(edge.to)) {
      errors.push(`Edge references unknown 'to' node: ${edge.to}`);
    }
  }

  // 1. cycle detection
  const cycle = detectCycle(plan.nodes, plan.edges);
  if (cycle.length > 0) {
    errors.push(`Cycle detected: ${cycle.join(" -> ")}`);
  }

  // 5. at least one input node
  const inputNodes = plan.nodes.filter((n) => n.type === "input");
  if (inputNodes.length === 0) {
    errors.push("DAG must contain at least one input node");
  }

  // 2. orphan non-input nodes (no incoming edges)
  const incoming = new Map<string, number>();
  for (const node of plan.nodes) incoming.set(node.nodeId, 0);
  for (const edge of plan.edges) {
    if (incoming.has(edge.to)) {
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }
  }
  for (const node of plan.nodes) {
    if (node.type !== "input" && (incoming.get(node.nodeId) ?? 0) === 0) {
      errors.push(`Orphan non-input node: ${node.nodeId}`);
    }
  }

  // 6. at least one terminal/output node (no outgoing edges)
  const outgoing = new Map<string, number>();
  for (const node of plan.nodes) outgoing.set(node.nodeId, 0);
  for (const edge of plan.edges) {
    if (outgoing.has(edge.from)) {
      outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    }
  }
  const terminals = plan.nodes.filter((n) => (outgoing.get(n.nodeId) ?? 0) === 0);
  if (terminals.length === 0) {
    errors.push("DAG must contain at least one terminal/output node");
  }

  // 7. high/restricted risk node flagging
  for (const node of plan.nodes) {
    if (node.riskLevel === "high" || node.riskLevel === "restricted") {
      highRiskNodes.push(node.nodeId);
      warnings.push(`High-risk node flagged: ${node.nodeId} (${node.riskLevel})`);
    }
  }

  // 8. approval gate flagging
  for (const node of plan.nodes) {
    if (node.type === "approval_gate") {
      approvalGates.push(node.nodeId);
      warnings.push(`Approval gate flagged: ${node.nodeId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    flagged: { highRiskNodes, approvalGates },
  };
}
