import { z } from "zod";

import { ContentAssetSchema } from "./content-asset.schema.js";

export const WorkflowResultSchema = z.object({
  workflowId: z.string().min(1),
  taskType: z.string().min(1),
  status: z.enum(["draft_complete", "needs_revision", "failed"]),
  summary: z.string().min(1),
  assets: z.array(ContentAssetSchema),
  warnings: z.array(z.string()).default([]),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
