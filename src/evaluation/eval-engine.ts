/**
 * L15 Evaluate step — pure run scorer.
 *
 * scoreRun() judges a completed run and returns an EvalVerdict. No I/O.
 * - With a golden case: scores the run against declared expectations
 *   (runStatus, requiredNodes, minScore) and reports a normalized score.
 * - Without one: a terminal-status heuristic (completed=pass, failed/cancelled=fail).
 */

import { randomUUID } from "node:crypto";

import { EVAL_POLICY_VERSION } from "./eval-types.js";
import type {
  EvalBasis,
  EvalEnvironment,
  EvalOutcome,
  EvalVerdict,
  GoldenCase,
  RunEvalInput,
} from "./eval-types.js";

function mapEnvironment(env: RunEvalInput["environment"]): EvalEnvironment {
  switch (env) {
    case "development":
    case "dev":
      return "dev";
    case "staging":
      return "staging";
    case "production":
      return "production";
    case "local":
      return "local";
    default: {
      // Exhaustiveness guard: adding a new environment union member becomes a
      // compile error here instead of silently mapping to "local".
      const _exhaustive: never = env;
      void _exhaustive;
      return "local";
    }
  }
}

export interface ScoreRunOptions {
  /** Engine label; defaults to the golden case's engine or "bel-dag-runtime". */
  engine?: string;
  /** When provided, scores the run against this golden case's expectations. */
  goldenCase?: GoldenCase;
  /** Optional best-effort MAP-compliance rate to attach (0-100). */
  mapComplianceRate?: number;
  /** Inject a verdict id (testing/determinism). */
  verdictId?: string;
  /** Inject the createdAt timestamp (testing/determinism). */
  now?: string;
}

export function scoreRun(run: RunEvalInput, options: ScoreRunOptions = {}): EvalVerdict {
  const engine = options.engine ?? options.goldenCase?.engine ?? "bel-dag-runtime";
  const reasons: string[] = [];

  let outcome: EvalOutcome;
  let score: number;
  let basis: EvalBasis;

  if (options.goldenCase) {
    basis = "golden_case";
    const exp = options.goldenCase.expected;
    const checks: boolean[] = [];

    if (exp.runStatus !== undefined) {
      const ok = run.status === exp.runStatus;
      checks.push(ok);
      reasons.push(
        ok
          ? `status matched expected '${exp.runStatus}'`
          : `status '${run.status}' != expected '${exp.runStatus}'`,
      );
    }

    if (exp.requiredNodes !== undefined && exp.requiredNodes.length > 0) {
      const completed = new Set(
        run.nodes.filter((n) => n.status === "completed").map((n) => n.nodeId),
      );
      const missing = exp.requiredNodes.filter((id) => !completed.has(id));
      const ok = missing.length === 0;
      checks.push(ok);
      reasons.push(
        ok
          ? `all ${exp.requiredNodes.length} required node(s) completed`
          : `missing required node(s): ${missing.join(", ")}`,
      );
    }

    if (checks.length === 0) {
      // No explicit expectations — fall back to terminal-status heuristic.
      const ok = run.status === "completed";
      checks.push(ok);
      reasons.push(`no explicit expectations; status '${run.status}'`);
    }

    const passed = checks.filter(Boolean).length;
    score = passed / checks.length;
    outcome = score >= 1 ? "pass" : score > 0 ? "partial" : "fail";

    // minScore is a hard floor: below it the verdict is a fail regardless of how
    // many sub-checks passed (a golden case can mandate a minimum quality bar).
    if (exp.minScore !== undefined && score < exp.minScore) {
      outcome = "fail";
      reasons.push(`score ${score.toFixed(2)} below minScore ${exp.minScore}`);
    }
  } else {
    basis = "run_only";
    switch (run.status) {
      case "completed":
        outcome = "pass";
        score = 1;
        reasons.push("run completed");
        break;
      case "failed":
        outcome = "fail";
        score = 0;
        reasons.push("run failed");
        break;
      case "cancelled":
        outcome = "fail";
        score = 0;
        reasons.push("run cancelled");
        break;
      default:
        outcome = "partial";
        score = 0.5;
        reasons.push(`run non-terminal: ${run.status}`);
        break;
    }
  }

  const verdict: EvalVerdict = {
    verdictId: options.verdictId ?? randomUUID(),
    runId: run.runId,
    ...(run.dagId !== undefined ? { dagId: run.dagId } : {}),
    ...(run.tenantId !== undefined ? { tenantId: run.tenantId } : {}),
    engine,
    outcome,
    score: Number(score.toFixed(4)),
    basis,
    ...(options.goldenCase !== undefined ? { goldenCaseId: options.goldenCase.caseId } : {}),
    runStatus: run.status,
    ...(options.mapComplianceRate !== undefined
      ? { mapComplianceRate: options.mapComplianceRate }
      : {}),
    reasons,
    policyVersion: EVAL_POLICY_VERSION,
    environment: mapEnvironment(run.environment),
    createdAt: options.now ?? new Date().toISOString(),
  };

  return verdict;
}
