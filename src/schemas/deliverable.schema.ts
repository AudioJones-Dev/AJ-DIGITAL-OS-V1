import { z } from "zod";

export const DeliverableOutputPolicySchema = z.object({
  draftsPath: z.string().min(1),
  pendingPath: z.string().min(1).optional(),
  approvedPath: z.string().min(1),
  publishedPath: z.string().min(1),
  publishTarget: z.string().min(1),
});

export const DeliverableApprovalRoutingPolicySchema = z.object({
  approvalRequired: z.boolean(),
  approvalMode: z.string().min(1),
  approverRoles: z.array(z.string().min(1)),
  approverChannels: z.array(z.string().min(1)),
});

export const DeliverableSchema = z.object({
  deliverableId: z.string().min(1),
  brandId: z.string().min(1).optional(),
  brandName: z.string().min(1).optional(),
  clientId: z.string().min(1),
  runId: z.string().min(1).optional(),
  workflowId: z.string().min(1),
  taskType: z.string().min(1),
  deliverableType: z.enum([
    "blog_post",
    "social_asset",
    "seo_brief",
    "transcript_package",
    "ops_brief",
    "custom",
  ]),
  status: z.enum([
    "draft",
    "pending_approval",
    "approved",
    "published",
    "failed",
    "archived",
  ]),
  categoryId: z.enum(["research", "lead-gen", "content", "ops", "client-work", "review"]),
  title: z.string().min(1),
  summary: z.string(),
  outputPolicy: DeliverableOutputPolicySchema,
  outputPath: z.string().min(1).optional(),
  outputFiles: z.array(z.string().min(1)),
  approvalRequired: z.boolean(),
  approvalPolicy: DeliverableApprovalRoutingPolicySchema,
  approvedBy: z.string().min(1).optional(),
  approvedAt: z.string().datetime().optional(),
  approvalNotes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()),
});

export type DeliverableRecord = z.infer<typeof DeliverableSchema>;
