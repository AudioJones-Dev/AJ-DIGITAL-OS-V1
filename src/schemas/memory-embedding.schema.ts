import { z } from "zod";

export const SemanticMemoryEmbeddingSchema = z.object({
  chunkId: z.string().min(1),
  model: z.literal("local-hash-v1"),
  dimensions: z.number().int().positive(),
  values: z.array(z.number()),
  norm: z.number().nonnegative(),
  createdAt: z.string().datetime(),
});

export type SemanticMemoryEmbeddingRecord = z.infer<typeof SemanticMemoryEmbeddingSchema>;
