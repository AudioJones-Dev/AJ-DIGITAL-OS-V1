import { z } from "zod";

export const AssistantSessionRouteSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  reason: z.string().min(1).optional(),
});

export const AssistantSessionSchema = z.object({
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
  sourceCommand: z.enum(["assistant", "assistant-start", "assistant-shell", "assistant-ui"]),
  launched: z.boolean(),
  mode: z.string().min(1),
  execution: z.string().min(1).optional(),
  task: z.string(),
  clientId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  brandName: z.string().min(1).optional(),
  brandManifestPath: z.string().min(1).optional(),
  conversationThreadId: z.string().min(1).optional(),
  shellSessionId: z.string().min(1).optional(),
  shellSessionLabel: z.string().min(1).optional(),
  turnIndex: z.number().int().positive().optional(),
  selectedSkillName: z.string().min(1).optional(),
  selectedWorkflowId: z.string().min(1).optional(),
  modelProfileId: z.string().min(1).optional(),
  modelProfileName: z.string().min(1).optional(),
  agentProfileId: z.string().min(1).optional(),
  agentProfileName: z.string().min(1).optional(),
  route: AssistantSessionRouteSchema.optional(),
  ok: z.boolean(),
  status: z.enum(["succeeded", "failed", "blocked"]),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  runId: z.string().min(1).optional(),
});
