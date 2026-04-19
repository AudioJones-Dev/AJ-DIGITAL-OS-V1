/**
 * Compute Intelligence — Hermes maintenance task.
 *
 * For each active client, fetches mission_runs from the last 24h,
 * groups by mission_type, computes avg quality score, compares
 * against the previous 24h baseline, and inserts rows into
 * `execution_intelligence`.
 *
 * Safety:
 *   • Skips groups with < 3 samples
 *   • Never throws — all errors are logged and swallowed
 *   • Handles empty datasets gracefully
 */

import {
  isConfigured,
  listClients,
  resolveConfig,
  supabaseGet,
  supabaseInsert,
  type SupabaseConfig,
} from "../../db/supabase-client.js";
import type { DbClient } from "../../db/db-types.js";

const TAG = "[INTELLIGENCE]";
const MIN_SAMPLE_SIZE = 3;

// ── Row shapes ─────────────────────────────────────────────────────

/** Fields we need from mission_runs. */
interface RunRow {
  id: string;
  mission_id: string;
  output_quality_score: number | null;
}

/** Join mission to get mission_type. */
interface MissionRow {
  id: string;
  mission_type: string;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Run one intelligence computation cycle.
 * Returns total rows inserted into execution_intelligence.
 */
export async function computeIntelligence(cfg?: SupabaseConfig): Promise<number> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping intelligence cycle`);
    return 0;
  }

  // 1. Fetch active clients
  const clientsResult = await listClients("active", config);
  if (!clientsResult.ok || !clientsResult.data?.length) {
    if (!clientsResult.ok) {
      console.warn(`${TAG} Failed to fetch clients: ${clientsResult.error}`);
    }
    return 0;
  }

  const now = new Date();
  const windowEnd = now.toISOString();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const baselineEnd = windowStart;
  const baselineStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  let totalInserted = 0;

  for (const client of clientsResult.data) {
    try {
      const inserted = await processClient(config, client, windowStart, windowEnd, baselineStart, baselineEnd);
      totalInserted += inserted;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`${TAG} Error processing client ${client.slug}: ${msg}`);
    }
  }

  console.log(`${TAG} Cycle complete — ${totalInserted} row(s) inserted`);
  return totalInserted;
}

// ── Internals ──────────────────────────────────────────────────────

async function processClient(
  cfg: SupabaseConfig,
  client: DbClient,
  windowStart: string,
  windowEnd: string,
  baselineStart: string,
  baselineEnd: string,
): Promise<number> {
  // Fetch missions for this client to map mission_id → mission_type
  const missionsResult = await supabaseGet<MissionRow>(
    cfg,
    "missions",
    `client_id=eq.${encodeURIComponent(client.id)}&select=id,mission_type`,
  );

  if (!missionsResult.ok || !missionsResult.data?.length) {
    return 0;
  }

  const missionMap = new Map<string, string>();
  for (const m of missionsResult.data) {
    missionMap.set(m.id, m.mission_type);
  }

  const missionIds = missionsResult.data.map((m) => m.id);

  // Fetch current-window runs (scored only)
  const currentRuns = await fetchScoredRuns(cfg, missionIds, windowStart, windowEnd);
  if (!currentRuns.length) return 0;

  // Fetch baseline-window runs
  const baselineRuns = await fetchScoredRuns(cfg, missionIds, baselineStart, baselineEnd);

  // Group by mission_type
  const currentGroups = groupByMissionType(currentRuns, missionMap);
  const baselineGroups = groupByMissionType(baselineRuns, missionMap);

  let inserted = 0;

  for (const [missionType, scores] of currentGroups) {
    if (scores.length < MIN_SAMPLE_SIZE) continue;

    const avgScore = average(scores);
    const baselineScores = baselineGroups.get(missionType);
    const baselineAvg = baselineScores?.length ? average(baselineScores) : null;
    const improvementPct = baselineAvg != null && baselineAvg > 0
      ? round(((avgScore - baselineAvg) / baselineAvg) * 100)
      : null;

    const row: Record<string, unknown> = {
      client_id: client.id,
      mission_type: missionType,
      signal_type: "quality",
      signal_value: round(avgScore),
      baseline_value: baselineAvg != null ? round(baselineAvg) : null,
      improvement_pct: improvementPct,
      sample_size: scores.length,
      window_start: windowStart,
      window_end: windowEnd,
    };

    const result = await supabaseInsert(cfg, "execution_intelligence", row);
    if (result.ok) {
      inserted++;
      console.log(
        `${TAG} computed — client_id=${client.id} mission_type=${missionType} ` +
        `avg_quality_score=${round(avgScore)} improvement_pct=${improvementPct ?? "N/A"}`,
      );
    } else {
      console.warn(`${TAG} Insert failed for ${client.slug}/${missionType}: ${result.error}`);
    }
  }

  return inserted;
}

async function fetchScoredRuns(
  cfg: SupabaseConfig,
  missionIds: string[],
  after: string,
  before: string,
): Promise<RunRow[]> {
  // PostgREST "in" filter: mission_id=in.(id1,id2,...)
  const inList = missionIds.map((id) => encodeURIComponent(id)).join(",");
  const query =
    `mission_id=in.(${inList})` +
    `&output_quality_score=not.is.null` +
    `&status=eq.completed` +
    `&created_at=gte.${encodeURIComponent(after)}` +
    `&created_at=lt.${encodeURIComponent(before)}` +
    `&select=id,mission_id,output_quality_score` +
    `&limit=500`;

  const result = await supabaseGet<RunRow>(cfg, "mission_runs", query);
  return result.ok && result.data ? result.data : [];
}

function groupByMissionType(
  runs: RunRow[],
  missionMap: Map<string, string>,
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  for (const run of runs) {
    const mType = missionMap.get(run.mission_id);
    if (!mType || run.output_quality_score == null) continue;
    let arr = groups.get(mType);
    if (!arr) {
      arr = [];
      groups.set(mType, arr);
    }
    arr.push(run.output_quality_score);
  }
  return groups;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
