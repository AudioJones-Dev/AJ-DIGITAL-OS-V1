import type { WorkflowExecutionResult } from "./workflow.types.js";

/**
 * Lifecycle states for a single orchestrated run.
 */
export type RunStatus =
  | "queued"
  | "context_loaded"
  | "in_progress"
  | "draft_complete"
  | "validation_passed"
  | "validation_failed"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "executed"
  | "logged"
  | "closed";

export type ApprovalStatus =
  | "not_required"
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected"
  | "revision_requested";

export type ApprovalDecision = "approve" | "reject" | "request_revision";

/**
 * Persistent run metadata tracked throughout workflow execution.
 */
export interface RunRecord {
  runId: string;
  workflowId: string;
  taskType: string;
  clientId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  revisionCount: number;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
  approvalMessageId?: number | undefined;
  approvedAt?: string | undefined;
  approvedBy?: string | undefined;
  workflowResult?: WorkflowExecutionResult | undefined;
  publishedPath?: string | undefined;
  publishedFiles?: string[] | undefined;
  warnings: string[];
  errors: string[];
}
