import type { TaskCategoryId } from "./task-category.types.js";

export type DeliverableStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "published"
  | "failed"
  | "archived";

export type DeliverableType =
  | "blog_post"
  | "social_asset"
  | "seo_brief"
  | "transcript_package"
  | "ops_brief"
  | "custom";

export interface DeliverableOutputPolicy {
  draftsPath: string;
  pendingPath?: string | undefined;
  approvedPath: string;
  publishedPath: string;
  publishTarget: string;
}

export interface DeliverableApprovalRoutingPolicy {
  approvalRequired: boolean;
  approvalMode: string;
  approverRoles: string[];
  approverChannels: string[];
}

export interface DeliverableRecord {
  deliverableId: string;
  brandId?: string | undefined;
  brandName?: string | undefined;
  clientId: string;
  runId?: string | undefined;
  workflowId: string;
  taskType: string;
  deliverableType: DeliverableType;
  status: DeliverableStatus;
  categoryId: TaskCategoryId;
  title: string;
  summary: string;
  outputPolicy: DeliverableOutputPolicy;
  outputPath?: string | undefined;
  outputFiles: string[];
  approvalRequired: boolean;
  approvalPolicy: DeliverableApprovalRoutingPolicy;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  approvalNotes?: string | undefined;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | undefined;
  metadata: Record<string, unknown>;
}
