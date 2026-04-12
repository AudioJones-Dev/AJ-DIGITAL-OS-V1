import { z } from "zod";

export const ConversationTurnSchema = z.object({
  turnId: z.string().min(1),
  threadId: z.string().min(1),
  createdAt: z.string().datetime(),
  role: z.enum(["user", "assistant", "system"]),
  sourceCommand: z.enum(["assistant", "assistant-start", "assistant-shell", "assistant-ui"]),
  mode: z.string().min(1),
  clientId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  brandName: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  taskType: z.string().min(1).optional(),
  selectedWorkflowId: z.string().min(1).optional(),
  selectedSkillName: z.string().min(1).optional(),
  agentProfileId: z.string().min(1).optional(),
  modelProfileId: z.string().min(1).optional(),
  status: z.enum(["recorded", "error"]),
  content: z.string(),
  metadata: z.record(z.unknown()),
});

export type ConversationTurnRecord = z.infer<typeof ConversationTurnSchema>;
