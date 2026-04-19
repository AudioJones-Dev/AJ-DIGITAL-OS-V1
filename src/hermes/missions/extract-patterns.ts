/**
 * Extract Patterns — Hermes maintenance task.
 *
 * Finds high-quality completed runs (score >= 80), groups them by
 * mission_type, computes success metrics, and inserts platform-level
 * optimisation patterns into the Neon `patterns` table.
 *
 * Safety:
 *   • Skips groups with < 5 samples
 *   • Never throws — all errors logged and swallowed
 *   • Extraction only — no mutation applied
 *   • Patterns are platform-level (no direct client link yet)
 */

import {
  isConfigured as isSupabaseConfigured,
  resolveConfig as resolveSupabaseConfig,
  supabaseGet,
  type SupabaseConfig,
} from "../../db/supabase-client.js";
import { insertPattern } from "../../db/neon-client.js";
import type { InsertPattern, PatternType } from "../../db/db-types.js";

const TAG = "[PATTERN]";
const QUALITY_THRESHOLD = 80;
const MIN_GROUP_SIZE = 5;
const BATCH_LIMIT = 200;

// ── Row shapes ─────────────────────────────────────────────────────

interface RunRow {
  id: string;
  mission_id: string;
  output_quality_score: number;
  trigger_type: string;
  duration_ms: number | null;
}

interface MissionRow {
  id: string;
  mission_type: string;
  client_id: string | null;
}

interface ClientRow {
  id: string;
  tier: string;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Run one pattern-extraction cycle.
 * Returns the number of patterns inserted.
 */
export async function extractPatterns(cfg?: SupabaseConfig): Promise<number> {
  const sbCfg = cfg ?? resolveSupabaseConfig();

  if (!isSupabaseConfigured(sbCfg)) {
    console.log(`${TAG} Supabase not configured — skipping extraction cycle`);
    return 0;
  }

  // 1. Fetch high-quality completed runs
  const runsResult = await supabaseGet<RunRow>(
    sbCfg,
    "mission_runs",
    `output_quality_score=gte.${QUALITY_THRESHOLD}` +
      `&status=eq.completed` +
      `&select=id,mission_id,output_quality_score,trigger_type,duration_ms` +
      `&order=created_at.desc` +
      `&limit=${BATCH_LIMIT}`,
  );

  if (!runsResult.ok || !runsResult.data?.length) {
    if (!runsResult.ok) {
      console.warn(`${TAG} Failed to fetch high-quality runs: ${runsResult.error}`);
    }
    return 0;
  }

  const runs = runsResult.data;

  // 2. Resolve mission_id → mission_type (and client_id for tier lookup)
  const missionIds = [...new Set(runs.map((r) => r.mission_id))];
  const inList = missionIds.map((id) => encodeURIComponent(id)).join(",");
  const missionsResult = await supabaseGet<MissionRow>(
    sbCfg,
    "missions",
    `id=in.(${inList})&select=id,mission_type,client_id`,
  );

  if (!missionsResult.ok || !missionsResult.data?.length) {
    return 0;
  }

  const missionMap = new Map<string, MissionRow>();
  for (const m of missionsResult.data) {
    missionMap.set(m.id, m);
  }

  // 3. Resolve client tiers (best-effort)
  const clientIds = [...new Set(
    missionsResult.data.map((m) => m.client_id).filter((c): c is string => c != null),
  )];

  const tierMap = new Map<string, string>();
  if (clientIds.length > 0) {
    const clientInList = clientIds.map((id) => encodeURIComponent(id)).join(",");
    const clientsResult = await supabaseGet<ClientRow>(
      sbCfg,
      "clients",
      `id=in.(${clientInList})&select=id,tier`,
    );
    if (clientsResult.ok && clientsResult.data) {
      for (const c of clientsResult.data) {
        tierMap.set(c.id, c.tier);
      }
    }
  }

  // 4. Group runs by mission_type
  const groups = new Map<string, GroupStats>();

  for (const run of runs) {
    const mission = missionMap.get(run.mission_id);
    if (!mission) continue;

    const key = mission.mission_type;
    let group = groups.get(key);
    if (!group) {
      group = {
        missionType: key,
        scores: [],
        durations: [],
        tiers: new Set(),
        triggerTypes: new Set(),
      };
      groups.set(key, group);
    }

    group.scores.push(run.output_quality_score);
    if (run.duration_ms != null) group.durations.push(run.duration_ms);
    if (run.trigger_type) group.triggerTypes.add(run.trigger_type);

    const clientId = mission.client_id;
    if (clientId) {
      const tier = tierMap.get(clientId);
      if (tier) group.tiers.add(tier);
    }
  }

  // 5. For each group with sufficient data, insert a pattern
  let inserted = 0;

  for (const [, group] of groups) {
    if (group.scores.length < MIN_GROUP_SIZE) continue;

    try {
      const ok = await insertGroupPattern(group);
      if (ok) inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`${TAG} Error inserting pattern for ${group.missionType}: ${msg}`);
    }
  }

  console.log(`${TAG} Cycle complete — ${inserted} pattern(s) inserted`);
  return inserted;
}

// ── Internals ──────────────────────────────────────────────────────

interface GroupStats {
  missionType: string;
  scores: number[];
  durations: number[];
  tiers: Set<string>;
  triggerTypes: Set<string>;
}

async function insertGroupPattern(group: GroupStats): Promise<boolean> {
  const avgScore = average(group.scores);
  const avgDuration = group.durations.length > 0 ? Math.round(average(group.durations)) : null;
  const confidence = Math.min(Math.round((group.scores.length / 50) * 100), 100) / 100;
  const tiers = [...group.tiers];
  const triggers = [...group.triggerTypes];

  const description =
    `High-quality execution pattern for "${group.missionType}" — ` +
    `avg score ${round(avgScore)}, ${group.scores.length} samples` +
    (tiers.length > 0 ? `, tiers: ${tiers.join(", ")}` : "");

  const context: Record<string, unknown> = {
    applies_to_mission_type: group.missionType,
    applies_to_tier: tiers.length > 0 ? tiers : null,
    avg_quality_score: round(avgScore),
    avg_duration_ms: avgDuration,
    trigger_types: triggers,
    sample_size: group.scores.length,
    action_taken: {
      type: "observation",
      note: "Platform-level success pattern — no mutation applied yet",
    },
  };

  const pattern: InsertPattern = {
    run_id: null,
    pattern_type: "optimization" as PatternType,
    description,
    context,
    confidence,
    occurrences: group.scores.length,
    last_seen_at: new Date().toISOString(),
  };

  const result = await insertPattern(pattern);

  if (result.ok) {
    console.log(
      `${TAG} extracted — mission_type=${group.missionType} ` +
      `confidence=${confidence} occurrences=${group.scores.length}`,
    );
    return true;
  }

  console.warn(`${TAG} Insert failed for ${group.missionType}: ${result.error}`);
  return false;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
