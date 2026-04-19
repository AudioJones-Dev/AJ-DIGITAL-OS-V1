/**
 * Generate Performance Report — Hermes maintenance task.
 *
 * For each active client, builds a metrics-backed performance report
 * from mission_runs, execution_intelligence, and deliverables.
 * Stores the report as a deliverable in Supabase.
 *
 * Safety:
 *   • Never throws — all errors logged and swallowed
 *   • Skips clients with no completed runs
 *   • Report content is structured JSON — no PII beyond client slug
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

const TAG = "[REPORT]";
const MIN_RUNS = 1;

// ── Row shapes ─────────────────────────────────────────────────────

interface RunRow {
  id: string;
  mission_id: string;
  output_quality_score: number | null;
  duration_ms: number | null;
  trigger_type: string;
  status: string;
  created_at: string;
}

interface MissionRow {
  id: string;
  mission_type: string;
}

interface IntelRow {
  signal_type: string;
  value: number;
  improvement_pct: number | null;
  created_at: string;
}

// ── Report Shape ───────────────────────────────────────────────────

export interface PerformanceReport {
  client_id: string;
  client_slug: string;
  period: { from: string; to: string };
  total_runs: number;
  completed_runs: number;
  avg_quality: number | null;
  improvement_pct: number | null;
  top_mission_types: { mission_type: string; count: number; avg_quality: number | null }[];
  total_deliverables: number;
  generated_at: string;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Run one report-generation cycle for all active clients.
 * Returns the number of reports generated.
 */
export async function generatePerformanceReports(cfg?: SupabaseConfig): Promise<number> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping report generation`);
    return 0;
  }

  try {
    const clientsResult = await listClients("active", config);
    if (!clientsResult.ok || !clientsResult.data?.length) {
      console.log(`${TAG} No active clients — skipping`);
      return 0;
    }

    let generated = 0;

    for (const client of clientsResult.data) {
      try {
        const report = await buildReport(client, config);
        if (!report) continue;

        // Store as deliverable
        const stored = await supabaseInsert(config, "deliverables", {
          client_id: client.id,
          filename: `performance-report-${client.slug}-${report.period.to.slice(0, 7)}.json`,
          content_type: "application/json",
          r2_key: `reports/${client.id}/performance-${report.generated_at}.json`,
          status: "uploaded",
          metadata: {
            report_type: "performance",
            period_from: report.period.from,
            period_to: report.period.to,
            total_runs: report.total_runs,
            avg_quality: report.avg_quality,
            report_payload: report,
          },
        });

        if (stored.ok) {
          generated++;
          console.log(
            `${TAG} generated — client=${client.slug}` +
              ` | runs=${report.total_runs}` +
              ` | avg_quality=${report.avg_quality ?? "n/a"}` +
              ` | improvement=${report.improvement_pct ?? "n/a"}%`,
          );
        }
      } catch (err) {
        console.warn(
          `${TAG} failed for client=${client.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    console.log(`${TAG} cycle complete — ${generated} reports generated`);
    return generated;
  } catch (err) {
    console.warn(`${TAG} cycle error: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

// ── Report Builder ─────────────────────────────────────────────────

async function buildReport(client: DbClient, cfg: SupabaseConfig): Promise<PerformanceReport | null> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodFrom = thirtyDaysAgo.toISOString();
  const periodTo = now.toISOString();

  // 1. Fetch missions for this client
  const missionsResult = await supabaseGet<MissionRow>(
    cfg,
    "missions",
    `client_id=eq.${encodeURIComponent(client.id)}&select=id,mission_type`,
  );

  if (!missionsResult.ok || !missionsResult.data?.length) return null;

  const missionMap = new Map<string, string>();
  for (const m of missionsResult.data) {
    missionMap.set(m.id, m.mission_type);
  }

  const missionIds = [...missionMap.keys()];
  const inList = missionIds.map((id) => encodeURIComponent(id)).join(",");

  // 2. Fetch runs in the last 30 days
  const runsResult = await supabaseGet<RunRow>(
    cfg,
    "mission_runs",
    `mission_id=in.(${inList})` +
      `&created_at=gte.${encodeURIComponent(periodFrom)}` +
      `&select=id,mission_id,output_quality_score,duration_ms,trigger_type,status,created_at` +
      `&order=created_at.desc` +
      `&limit=500`,
  );

  if (!runsResult.ok || !runsResult.data?.length) return null;

  const runs = runsResult.data;
  const completedRuns = runs.filter((r) => r.status === "completed");

  if (completedRuns.length < MIN_RUNS) return null;

  // 3. Compute avg quality
  const scores = completedRuns
    .map((r) => r.output_quality_score)
    .filter((s): s is number => s != null);
  const avgQuality = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  // 4. Group by mission_type
  const typeGroups = new Map<string, { count: number; scores: number[] }>();
  for (const run of completedRuns) {
    const mType = missionMap.get(run.mission_id) ?? "unknown";
    const group = typeGroups.get(mType) ?? { count: 0, scores: [] };
    group.count++;
    if (run.output_quality_score != null) group.scores.push(run.output_quality_score);
    typeGroups.set(mType, group);
  }

  const topMissionTypes = [...typeGroups.entries()]
    .map(([mission_type, g]) => ({
      mission_type,
      count: g.count,
      avg_quality: g.scores.length > 0
        ? Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Latest improvement_pct from execution_intelligence
  let improvementPct: number | null = null;
  const intelResult = await supabaseGet<IntelRow>(
    cfg,
    "execution_intelligence",
    `client_id=eq.${encodeURIComponent(client.id)}&select=signal_type,value,improvement_pct,created_at&order=created_at.desc&limit=1`,
  );
  if (intelResult.ok && intelResult.data?.[0]?.improvement_pct != null) {
    improvementPct = intelResult.data[0].improvement_pct;
  }

  // 6. Count deliverables for this client
  let totalDeliverables = 0;
  const delivResult = await supabaseGet<{ id: string }>(
    cfg,
    "deliverables",
    `client_id=eq.${encodeURIComponent(client.id)}&select=id&limit=0`,
  );
  if (delivResult.ok && delivResult.data) {
    totalDeliverables = delivResult.data.length;
  }

  return {
    client_id: client.id,
    client_slug: client.slug,
    period: { from: periodFrom, to: periodTo },
    total_runs: runs.length,
    completed_runs: completedRuns.length,
    avg_quality: avgQuality,
    improvement_pct: improvementPct,
    top_mission_types: topMissionTypes,
    total_deliverables: totalDeliverables,
    generated_at: now.toISOString(),
  };
}
