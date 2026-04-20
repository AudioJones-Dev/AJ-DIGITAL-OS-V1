import { z } from "zod";
import { BrandDNASchema } from "./brand-dna.schema.js";

export const ContextBundleSchema = z.object({
  runId: z.string().min(1),
  taskType: z.string().min(1),
  objective: z.string().min(1),
  clientId: z.string().min(1),
  brandDNA: BrandDNASchema,
  sourceMaterials: z.array(z.record(z.unknown())).default([]),
  constraints: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});

export type ContextBundle = z.infer<typeof ContextBundleSchema>;
