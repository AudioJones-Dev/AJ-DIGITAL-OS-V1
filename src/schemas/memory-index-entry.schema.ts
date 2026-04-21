import { z } from "zod";

export const SemanticMemoryIndexEntrySchema = z.object({
  memoryId: z.string().min(1),
  chunkId: z.string().min(1),
  kind: z.enum(["conversation_memory", "deliverable_memory", "knowledge_ingestion_memory"]),
  sourceType: z.enum(["conversation_turn", "deliverable", "ingested_text", "ingested_transcript", "ingested_url"]),
  label: z.string().min(1),
  chunkPath: z.string().min(1),
  embeddingPath: z.string().min(1),
  textPreview: z.string(),
  tokenCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  clientId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  brandName: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  turnId: z.string().min(1).optional(),
  deliverableId: z.string().min(1).optional(),
  sourceUri: z.string().min(1).optional(),
  metadata: z.record(z.unknown()),
});

export type SemanticMemoryIndexEntry = z.infer<typeof SemanticMemoryIndexEntrySchema>;
