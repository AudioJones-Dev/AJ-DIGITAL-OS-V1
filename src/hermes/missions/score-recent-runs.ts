/**
 * Score Recent Runs — Hermes maintenance task.
 *
 * Fetches mission_runs with no output_quality_score,
 * resolves the linked deliverable outcome, computes a score,
 * and patches the run. Runs on a 1-hour interval.
 *
 * Safety:
 *   • Batch-limited (50 runs per cycle)
 *   • Skips runs with no linked deliverable
 *   • Never throws — all errors are logged and swallowed
 */

import {
  isConfigured,
  resolveConfig,
  supabaseGet,
  type SupabaseConfig,
} from "../../db/supabase-client.js";
import type { DbMissionRun } from "../../db/db-types.js";
import { computeQualityScore, updateMissionRunScore } from "../../services/scoring.js";
import { inferOutcomeFromDbStatus } from "../../services/deliverables.js";

const TAG = "[SCORE]";
const BATCH_LIMIT = 50;

/** Rows from deliverables we actually need. */
interface DeliverableRow {
  id: string;
  status: "pending" | "uploaded" | "published" | "failed";
  outcome?: string | null;
}

/**
 * Score all unscored mission runs in a single batch cycle.
 * Returns the number of runs successfully scored.
 */
export async function scoreRecentRuns(cfg?: SupabaseConfig): Promise<number> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping scoring cycle`);
    return 0;
  }

  // 1. Fetch unscored completed runs (batch-limited)
  const runsResult = await supabaseGet<DbMissionRun>(
    config,
    "mission_runs",
    `output_quality_score=is.null&status=eq.completed&order=created_at.desc&limit=${BATCH_LIMIT}`,
  );

  if (!runsResult.ok || !runsResult.data?.length) {
    if (!runsResult.ok) {
      console.warn(`${TAG} Failed to fetch unscored runs: ${runsResult.error}`);
    }
    return 0;
  }

  const runs = runsResult.data;
  console.log(`${TAG} Found ${runs.length} unscored run(s)`);

  let scored = 0;

  for (const run of runs) {
    try {
      // 2. Find linked deliverable(s) for this run
      const delResult = await supabaseGet<DeliverableRow>(
        config,
        "deliverables",
        `mission_run_id=eq.${encodeURIComponent(run.id)}&select=id,status,outcome&limit=1`,
      );

      if (!delResult.ok || !delResult.data?.length) {
        // No deliverable linked — skip silently
        continue;
      }

      const deliverable = delResult.data[0]!;
      // Prefer explicit outcome column; fall back to inferred from status
      const outcome = deliverable.outcome ?? inferOutcomeFromDbStatus(deliverable.status);

      // 3. Compute and persist score
      const score = computeQualityScore(outcome);
      const result = await updateMissionRunScore(run.run_ref, score, config);

      if (result.ok) {
        console.log(`${TAG} run scored — run_id=${run.id} score=${score}`);
        scored++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`${TAG} Error scoring run ${run.id}: ${msg}`);
    }
  }

  console.log(`${TAG} Cycle complete — ${scored}/${runs.length} scored`);
  return scored;
}
