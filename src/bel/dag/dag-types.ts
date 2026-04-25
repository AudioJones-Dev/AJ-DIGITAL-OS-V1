/**
 * BEL v4 DAG — type definitions.
 *
 * Graph-based execution runtime for autonomous tasks.
 */

export type BelDagNodeType =
  | "input"
  | "transform"
  | "retrieve"
  | "score"
  | "generate"
  | "tool_call"
  | "approval_gate"
  | "publish"
  | "audit"
  | "attribution";

export type BelDagNodeStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting_for_approval";

export type BelDagRiskLevel = "low" | "medium" | "high" | "restricted";

export type BelDagEnvironment = "development" | "staging" | "production";

export type BelDagRunStatus =
  | "pending"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";

export interface BelDagCachePolicy {
  enabled: boolean;
  ttlMs?: number;
  scope?: "node" | "run" | "tenant";
}

export interface BelDagRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  retryOn: string[];
}

export interface BelDagNode {
  nodeId: string;
  type: BelDagNodeType;
  name: string;
  status: BelDagNodeStatus;
  riskLevel: BelDagRiskLevel;
  inputRefs: string[];
  outputRefs: string[];
  attempts: number;
  maxAttempts: number;
  cachePolicy?: BelDagCachePolicy;
  retryPolicy?: BelDagRetryPolicy;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface BelDagEdge {
  from: string;
  to: string;
  /** Optional condition expression — when set, allows the edge under specific upstream states. */
  condition?: string;
}

export interface BelDagPlan {
  dagId: string;
  runId: string;
  tenantId?: string;
  name: string;
  version: string;
  environment: BelDagEnvironment;
  policyVersion: string;
  nodes: BelDagNode[];
  edges: BelDagEdge[];
  createdAt: string;
  createdBy: string;
}

export interface BelDagRunState {
  dagId: string;
  runId: string;
  tenantId?: string;
  nodes: BelDagNode[];
  edges: BelDagEdge[];
  status: BelDagRunStatus;
  environment: BelDagEnvironment;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface BelDagValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  flagged?: {
    highRiskNodes: string[];
    approvalGates: string[];
  };
}

export interface BelDagExecutionResult {
  dagId: string;
  runId: string;
  status: BelDagRunStatus;
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];
  durationMs: number;
}

export interface BelDagNodeOutput {
  nodeId: string;
  dagId: string;
  runId: string;
  output: unknown;
  completedAt: string;
}

export interface BelDagAuditEvent {
  eventId: string;
  dagId: string;
  runId: string;
  nodeId?: string;
  event: string;
  fromStatus?: BelDagNodeStatus | BelDagRunStatus;
  toStatus?: BelDagNodeStatus | BelDagRunStatus;
  timestamp: string;
  actor?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
