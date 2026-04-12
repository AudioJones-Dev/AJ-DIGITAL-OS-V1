import { z } from "zod";

export const ContextSourceMetadataSchema = z.object({
  sourceId: z.string().min(1),
  kind: z.enum([
    "current_task",
    "conversation_turn",
    "brand_context",
    "session_metadata",
    "deliverable_metadata",
    "semantic_memory",
  ]),
  label: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  threadId: z.string().min(1).optional(),
  turnId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  deliverableId: z.string().min(1).optional(),
  chunkId: z.string().min(1).optional(),
  characterCount: z.number().int().nonnegative(),
  included: z.boolean(),
  truncated: z.boolean(),
  metadata: z.record(z.unknown()),
});

export const StitchedContextBundleSchema = z.object({
  bundleId: z.string().min(1),
  createdAt: z.string().datetime(),
  threadId: z.string().min(1).optional(),
  maxRecentTurns: z.number().int().positive(),
  maxCharacters: z.number().int().positive(),
  totalCharacters: z.number().int().nonnegative(),
  truncated: z.boolean(),
  semanticQuery: z.string().min(1).optional(),
  semanticResultCount: z.number().int().nonnegative().optional(),
  semanticSelectedCount: z.number().int().nonnegative().optional(),
  sources: z.array(ContextSourceMetadataSchema),
  sourceMaterials: z.array(z.record(z.unknown())),
});

export type ContextSourceMetadata = z.infer<typeof ContextSourceMetadataSchema>;
export type StitchedContextBundle = z.infer<typeof StitchedContextBundleSchema>;
