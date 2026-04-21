import { z } from "zod";

export const ConversationThreadSchema = z.object({
  threadId: z.string().min(1),
  title: z.string().min(1),
  sourceCommand: z.enum(["assistant", "assistant-start", "assistant-shell", "assistant-ui"]),
  status: z.enum(["active", "archived"]),
  clientId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  brandName: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastTurnAt: z.string().datetime().optional(),
  turnCount: z.number().int().nonnegative(),
  latestSessionId: z.string().min(1).optional(),
  latestRunId: z.string().min(1).optional(),
  latestUserTask: z.string().min(1).optional(),
  shellSessionId: z.string().min(1).optional(),
  shellSessionLabel: z.string().min(1).optional(),
  metadata: z.record(z.unknown()),
});

export type ConversationThreadRecord = z.infer<typeof ConversationThreadSchema>;
