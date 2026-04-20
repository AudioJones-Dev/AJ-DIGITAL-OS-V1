import { z } from "zod";

export const BrandDNASchema = z.object({
  brandName: z.string().min(1),
  voice: z.string().min(1),
  tone: z.string().min(1),
  audience: z.string().min(1),
  audienceSegments: z
    .array(
      z.object({
        segment: z.string().min(1),
        pains: z.array(z.string()).default([]),
        outcomes: z.array(z.string()).default([]),
      })
    )
    .default([]),
  category: z.string().min(1),
  positioning: z.string().min(1),
  differentiators: z.array(z.string()).default([]),
  proofPoints: z.array(z.string()).default([]),
  messagePillars: z.array(z.string()).default([]),
  corePromise: z.string().min(1),
  philosophy: z.string().optional(),
  objectionHandling: z.array(z.string()).default([]),
  contentAngles: z.array(z.string()).default([]),
  writingRules: z.array(z.string()).default([]),
  bannedPhrases: z.array(z.string()).default([]),
  preferredCTAs: z.array(z.string()).default([]),
});

export type BrandDNA = z.infer<typeof BrandDNASchema>;
