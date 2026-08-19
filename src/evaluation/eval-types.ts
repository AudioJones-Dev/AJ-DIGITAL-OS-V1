/**
 * L15 Evaluate step — type definitions + schemas.
 *
 * A run "verdict" is a post-hoc judgement of whether a completed run produced
 * an acceptable result, scored against an optional golden case. It is a
 * read-only observation: it never gates execution (that authority stays with
 * executeWithEnforcement) — it is persisted and reported into the ledger.
 *
 * The evaluator is intentionally decoupled from BEL: it consumes the minimal
 * structural `RunEvalInput`, to which a `BelDagRunState` is directly assignable.
 */

import { z } from "zod";

export const EVAL_POLICY_VERSION = "1.0.0";

// ── Run input (structural subset of BelDagRunState) ───────────────────────────

export const RunEvalNodeSchema = z.object({
  nodeId: z.string(),
  status: z.string(),
});
export type RunEvalNode = z.infer<typeof RunEvalNodeSchema>;

export const RunEvalInputSchema = z.object({
  runId: z.string(),
  dagId: z.string().optional(),
  tenantId: z.string().optional(),
  status: z.enum([
    "pending",
    "running",
    "waiting_for_approval",
    "completed",
    "failed",
    "cancelled",
  ]),
  // Accepts both BEL environments ("development") and event environments.
  environment: z.enum(["local", "dev", "staging", "production", "development"]),
  nodes: z.array(RunEvalNodeSchema),
});
export type RunEvalInput = z.infer<typeof RunEvalInputSchema>;

// ── Verdict ───────────────────────────────────────────────────────────────────

export const EvalVerdictSchema = z.object({
  verdictId: z.string(),
  runId: z.string(),
  dagId: z.string().optional(),
  tenantId: z.string().optional(),
  engine: z.string(),
  outcome: z.enum(["pass", "partial", "fail"]),
  score: z.number().min(0).max(1),
  basis: z.enum(["golden_case", "heuristic", "run_only"]),
  goldenCaseId: z.string().optional(),
  runStatus: z.enum([
    "pending",
    "running",
    "waiting_for_approval",
    "completed",
    "failed",
    "cancelled",
  ]),
  // Best-effort MAP-compliance rate (0-100). Often absent (see eval-emit notes).
  mapComplianceRate: z.number().min(0).max(100).optional(),
  reasons: z.array(z.string()),
  policyVersion: z.string(),
  environment: z.enum(["local", "dev", "staging", "production"]),
  createdAt: z.string(),
});
export type EvalVerdict = z.infer<typeof EvalVerdictSchema>;
export type EvalOutcome = EvalVerdict["outcome"];
export type EvalBasis = EvalVerdict["basis"];
export type EvalEnvironment = EvalVerdict["environment"];

// ── Golden set ──────────────────────────────────────────────────────────────

export const GoldenExpectationSchema = z.object({
  runStatus: z.enum(["completed", "failed", "cancelled"]).optional(),
  requiredNodes: z.array(z.string()).optional(),
  minScore: z.number().min(0).max(1).optional(),
});
export type GoldenExpectation = z.infer<typeof GoldenExpectationSchema>;

export const GoldenCaseSchema = z.object({
  caseId: z.string(),
  engine: z.string(),
  description: z.string(),
  runState: RunEvalInputSchema,
  expected: GoldenExpectationSchema,
  tenantId: z.string().optional(),
});
export type GoldenCase = z.infer<typeof GoldenCaseSchema>;

export const GoldenSetSchema = z.array(GoldenCaseSchema);

// ── Stats + audit ─────────────────────────────────────────────────────────────

export interface EvalStats {
  engine: string;
  totalRuns: number;
  verdictedRuns: number;
  verdictCoverageRate: number;
  goldenCaseCount: number;
  goldenPassRate: number;
  byOutcome: { pass: number; partial: number; fail: number };
}

export interface EvalAuditEvent {
  eventId: string;
  verdictId?: string;
  runId?: string;
  event: string;
  timestamp: string;
  tenantId?: string;
  payload: Record<string, unknown>;
}
