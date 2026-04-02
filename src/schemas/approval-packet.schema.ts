import { z } from "zod";

export const ApprovalPacketSchema = z.object({
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  artifactPreview: z.string().min(1),
  decisionOptions: z
    .array(z.enum(["approve", "reject", "request_revision"]))
    .default(["approve", "reject", "request_revision"]),
  riskFlags: z.array(z.string()).default([]),
  createdAt: z.string().min(1),
});

export type ApprovalPacket = z.infer<typeof ApprovalPacketSchema>;
