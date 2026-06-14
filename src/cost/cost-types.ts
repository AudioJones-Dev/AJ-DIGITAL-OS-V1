/**
 * G2 — Cost metering + ceiling types.
 *
 * Per-run / per-tenant cumulative model-spend (USD) with soft-warn then
 * hard-stop. Per-case/per-stage TOKEN budgets remain owned by TokenBudgetPolicy
 * (src/intelligence-layer) — this is the complementary USD surface (the DN42
 * "runaway spend" failure mode).
 */

import { z } from "zod";

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export const CostEventSchema = z.object({
  eventId: z.string(),
  ts: z.string(),
  source: z.enum(["model", "tool"]),
  provider: z.string(),
  model: z.string(),
  runId: z.string().optional(),
  tenantId: z.string().optional(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  costUsd: z.number(),
});
export type CostEvent = z.infer<typeof CostEventSchema>;

export interface CostSummary {
  totalUsd: number;
  totalTokens: number;
  eventCount: number;
}

export interface CostCeilingBand {
  /** Hard ceiling in USD — at or above this, spend is blocked. */
  hard: number;
  /** Soft-warn threshold as a ratio of the hard ceiling (0-1). */
  softRatio: number;
}

export interface CostCeilingPolicy {
  perRunUsd: CostCeilingBand;
  perTenantUsd: CostCeilingBand;
}

export type CostDecision = "allow" | "warn" | "block";

export interface CostCeilingVerdict {
  allowed: boolean;
  decision: CostDecision;
  scope?: "run" | "tenant" | undefined;
  spentUsd: number;
  reasons: string[];
  warnings: string[];
}
