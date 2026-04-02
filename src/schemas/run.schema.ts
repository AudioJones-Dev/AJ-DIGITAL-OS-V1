import { z } from "zod";

import { WorkflowResultSchema } from "./workflow-result.schema.js";

export const RunSchema = z.object({
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  taskType: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum([
    "queued",
    "context_loaded",
    "in_progress",
    "draft_complete",
    "validation_passed",
    "validation_failed",
    "pending_approval",
    "approved",
    "rejected",
    "revision_requested",
    "executed",
    "logged",
    "closed",
  ]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  revisionCount: z.number().int().min(0),
  approvalRequired: z.boolean(),
  approvalStatus: z.enum(["not_required", "not_requested", "pending", "approved", "rejected", "revision_requested"]),
  approvalMessageId: z.number().int().optional(),
  approvedAt: z.string().min(1).optional(),
  approvedBy: z.string().min(1).optional(),
  workflowResult: WorkflowResultSchema.optional(),
  publishedPath: z.string().min(1).optional(),
  publishedFiles: z.array(z.string().min(1)).optional(),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
});

export type RunRecord = z.infer<typeof RunSchema>;
