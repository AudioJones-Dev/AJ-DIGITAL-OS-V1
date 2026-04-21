/**
 * Quality Scoring Module
 *
 * Maps deliverable outcomes to numeric quality scores and persists
 * them to `mission_runs.output_quality_score` in Supabase.
 *
 * Score range: 0–100 (integer)
 * Never blocks execution — all DB writes are fail-open.
 */

import type { QueryResult } from "../db/db-types.js";
import {
  isConfigured,
  resolveConfig,
  supabasePatch,
  type SupabaseConfig,
} from "../db/supabase-client.js";

const TAG = "[SCORING]";

// ── Score Mapping ──────────────────────────────────────────────────

const OUTCOME_SCORES: Record<string, number> = {
  used: 100,
  modified: 70,
  rejected: 20,
  ignored: 0,
  unknown: 50,
};

const DEFAULT_SCORE = 50;

/**
 * Compute a quality score from a deliverable outcome string.
 * Returns DEFAULT_SCORE (50) for unrecognized or missing outcomes.
 */
export function computeQualityScore(outcome: string | undefined | null): number {
  if (!outcome) return DEFAULT_SCORE;
  return OUTCOME_SCORES[outcome] ?? DEFAULT_SCORE;
}

// ── Persist Score ──────────────────────────────────────────────────

export interface ScoreUpdateResult {
  ok: boolean;
  missionRunId: string;
  score: number;
  error: string | null;
}

/**
 * Patch `mission_runs.output_quality_score` in Supabase.
 * Matches by `run_ref` (the local run ID used throughout the system).
 * Fail-open: returns error result but never throws.
 */
export async function updateMissionRunScore(
  runRef: string,
  score: number,
  cfg?: SupabaseConfig,
): Promise<ScoreUpdateResult> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping score for run ${runRef}`);
    return { ok: false, missionRunId: runRef, score, error: "Supabase not configured" };
  }

  const result: QueryResult<unknown> = await supabasePatch(
    config,
    "mission_runs",
    `run_ref=eq.${encodeURIComponent(runRef)}`,
    { output_quality_score: score },
  );

  if (result.ok) {
    console.log(`${TAG} score assigned: run=${runRef} score=${score}`);
  } else {
    console.warn(`${TAG} score update failed: run=${runRef} score=${score} error=${result.error}`);
  }

  return {
    ok: result.ok,
    missionRunId: runRef,
    score,
    error: result.ok ? null : (result.error ?? "Unknown error"),
  };
}

/**
 * Compute score from outcome and persist to mission_runs in one call.
 * Convenience wrapper used by the deliverable outcome flow.
 */
export async function scoreFromOutcome(
  missionRunId: string,
  outcome: string,
  cfg?: SupabaseConfig,
): Promise<ScoreUpdateResult> {
  const score = computeQualityScore(outcome);
  return updateMissionRunScore(missionRunId, score, cfg);
}
