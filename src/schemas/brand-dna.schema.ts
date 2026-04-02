import { z } from "zod";

export const BrandDNASchema = z.object({
  brandName: z.string().min(1),
  voice: z.string().min(1),
  tone: z.string().min(1),
  audience: z.string().min(1),
  category: z.string().min(1),
  positioning: z.string().min(1),
  differentiators: z.array(z.string()).default([]),
  corePromise: z.string().min(1),
  philosophy: z.string().optional(),
  writingRules: z.array(z.string()).default([]),
  bannedPhrases: z.array(z.string()).default([]),
  preferredCTAs: z.array(z.string()).default([]),
});

export type BrandDNA = z.infer<typeof BrandDNASchema>;
