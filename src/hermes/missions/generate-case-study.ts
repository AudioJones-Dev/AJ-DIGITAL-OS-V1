/**
 * Generate Case Study — Hermes maintenance task.
 *
 * Checks each active client against milestones:
 *   • 100+ completed runs
 *   • 90+ days since first run
 *   • improvement_pct > 15%
 *
 * When a milestone is crossed for the first time, generates a
 * structured case study draft backed by real metrics and stores
 * it as a deliverable.
 *
 * Safety:
 *   • Never throws — all errors logged and swallowed
 *   • De-duplicated: checks for existing case study deliverable per milestone
 *   • No PII in output — uses client slug and anonymized metrics
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
import { getPatterns } from "../../db/neon-client.js";

const TAG = "[CASE-STUDY]";

// ── Milestone Thresholds ───────────────────────────────────────────

const MILESTONE_RUNS = 100;
const MILESTONE_DAYS = 90;
const MILESTONE_IMPROVEMENT = 15; // percent

type MilestoneType = "runs_100" | "days_90" | "improvement_15";

// ── Row shapes ─────────────────────────────────────────────────────

interface RunRow {
  id: string;
  output_quality_score: number | null;
  duration_ms: number | null;
  status: string;
  created_at: string;
}

interface IntelRow {
  improvement_pct: number | null;
}

interface DeliverableRow {
  id: string;
  metadata: Record<string, unknown>;
}

// ── Case Study Shape ───────────────────────────────────────────────

export interface CaseStudy {
  client_slug: string;
  milestone: MilestoneType;
  headline: string;
  summary: string;
  metrics: {
    total_runs: number;
    completed_runs: number;
    avg_quality: number | null;
    improvement_pct: number | null;
    patterns_learned: number;
    days_active: number;
  };
  generated_at: string;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Run one case-study check cycle for all active clients.
 * Returns the number of case studies generated.
 */
export async function generateCaseStudies(cfg?: SupabaseConfig): Promise<number> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping case study generation`);
    return 0;
  }

  try {
    const clientsResult = await listClients("active", config);
    if (!clientsResult.ok || !clientsResult.data?.length) {
      console.log(`${TAG} No active clients — skipping`);
      return 0;
    }

    // Fetch global pattern count once
    let patternsLearned = 0;
    const patternsResult = await getPatterns();
    if (patternsResult.ok && patternsResult.data) {
      patternsLearned = patternsResult.data.length;
    }

    let generated = 0;

    for (const client of clientsResult.data) {
      try {
        const count = await checkAndGenerate(client, patternsLearned, config);
        generated += count;
      } catch (err) {
        console.warn(
          `${TAG} failed for client=${client.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    console.log(`${TAG} cycle complete — ${generated} case studies generated`);
    return generated;
  } catch (err) {
    console.warn(`${TAG} cycle error: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

// ── Per-Client Check ───────────────────────────────────────────────

async function checkAndGenerate(
  client: DbClient,
  patternsLearned: number,
  cfg: SupabaseConfig,
): Promise<number> {
  // 1. Fetch all missions for this client
  const missionsResult = await supabaseGet<{ id: string }>(
    cfg,
    "missions",
    `client_id=eq.${encodeURIComponent(client.id)}&select=id`,
  );

  if (!missionsResult.ok || !missionsResult.data?.length) return 0;

  const missionIds = missionsResult.data.map((m) => m.id);
  const inList = missionIds.map((id) => encodeURIComponent(id)).join(",");

  // 2. Fetch completed runs
  const runsResult = await supabaseGet<RunRow>(
    cfg,
    "mission_runs",
    `mission_id=in.(${inList})` +
      `&status=eq.completed` +
      `&select=id,output_quality_score,duration_ms,status,created_at` +
      `&order=created_at.asc` +
      `&limit=500`,
  );

  if (!runsResult.ok || !runsResult.data?.length) return 0;

  const runs = runsResult.data;
  const completedRuns = runs.length;

  // Compute metrics
  const scores = runs.map((r) => r.output_quality_score).filter((s): s is number => s != null);
  const avgQuality = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const firstRunDate = new Date(runs[0]!.created_at);
  const daysActive = Math.floor((Date.now() - firstRunDate.getTime()) / (24 * 60 * 60 * 1000));

  // Get improvement_pct
  let improvementPct: number | null = null;
  const intelResult = await supabaseGet<IntelRow>(
    cfg,
    "execution_intelligence",
    `client_id=eq.${encodeURIComponent(client.id)}&select=improvement_pct&order=created_at.desc&limit=1`,
  );
  if (intelResult.ok && intelResult.data?.[0]?.improvement_pct != null) {
    improvementPct = intelResult.data[0].improvement_pct;
  }

  // 3. Check each milestone
  const milestones: { type: MilestoneType; triggered: boolean }[] = [
    { type: "runs_100", triggered: completedRuns >= MILESTONE_RUNS },
    { type: "days_90", triggered: daysActive >= MILESTONE_DAYS },
    { type: "improvement_15", triggered: improvementPct != null && improvementPct >= MILESTONE_IMPROVEMENT },
  ];

  let generated = 0;

  for (const ms of milestones) {
    if (!ms.triggered) continue;

    // De-duplicate: check if a case study already exists for this milestone
    const existingResult = await supabaseGet<DeliverableRow>(
      cfg,
      "deliverables",
      `client_id=eq.${encodeURIComponent(client.id)}` +
        `&metadata->>report_type=eq.case_study` +
        `&metadata->>milestone=eq.${encodeURIComponent(ms.type)}` +
        `&select=id,metadata` +
        `&limit=1`,
    );

    if (existingResult.ok && existingResult.data && existingResult.data.length > 0) {
      continue; // Already generated
    }

    // Build case study
    const study = buildCaseStudy(client, ms.type, {
      total_runs: completedRuns,
      completed_runs: completedRuns,
      avg_quality: avgQuality,
      improvement_pct: improvementPct,
      patterns_learned: patternsLearned,
      days_active: daysActive,
    });

    // Store as deliverable
    const stored = await supabaseInsert(cfg, "deliverables", {
      client_id: client.id,
      filename: `case-study-${client.slug}-${ms.type}.json`,
      content_type: "application/json",
      r2_key: `case-studies/${client.id}/${ms.type}-${study.generated_at}.json`,
      status: "uploaded",
      metadata: {
        report_type: "case_study",
        milestone: ms.type,
        headline: study.headline,
        avg_quality: study.metrics.avg_quality,
        improvement_pct: study.metrics.improvement_pct,
        study_payload: study,
      },
    });

    if (stored.ok) {
      generated++;
      console.log(
        `${TAG} generated — client=${client.slug}` +
          ` | milestone=${ms.type}` +
          ` | runs=${completedRuns}` +
          ` | avg_quality=${avgQuality ?? "n/a"}`,
      );
    }
  }

  return generated;
}

// ── Case Study Builder ─────────────────────────────────────────────

function buildCaseStudy(
  client: DbClient,
  milestone: MilestoneType,
  metrics: CaseStudy["metrics"],
): CaseStudy {
  const headline = buildHeadline(client.slug, milestone, metrics);
  const summary = buildSummary(client.slug, milestone, metrics);

  return {
    client_slug: client.slug,
    milestone,
    headline,
    summary,
    metrics,
    generated_at: new Date().toISOString(),
  };
}

function buildHeadline(slug: string, milestone: MilestoneType, metrics: CaseStudy["metrics"]): string {
  switch (milestone) {
    case "runs_100":
      return `${slug} crosses ${metrics.total_runs} automated missions` +
        (metrics.avg_quality != null ? ` with ${metrics.avg_quality}% avg quality` : "");
    case "days_90":
      return `${slug} achieves ${metrics.days_active} days of continuous AI-driven operations`;
    case "improvement_15":
      return `${slug} improves execution quality by ${metrics.improvement_pct}% through adaptive automation`;
  }
}

function buildSummary(slug: string, milestone: MilestoneType, metrics: CaseStudy["metrics"]): string {
  const qualityNote = metrics.avg_quality != null
    ? `Average output quality score: ${metrics.avg_quality}/100. `
    : "";
  const improvementNote = metrics.improvement_pct != null
    ? `Quality improvement over baseline: ${metrics.improvement_pct}%. `
    : "";
  const patternsNote = metrics.patterns_learned > 0
    ? `The system has extracted ${metrics.patterns_learned} optimization patterns. `
    : "";

  switch (milestone) {
    case "runs_100":
      return `Over ${metrics.total_runs} completed missions, ${slug} has leveraged AJ Digital OS ` +
        `for fully automated execution. ${qualityNote}${improvementNote}${patternsNote}` +
        `This demonstrates consistent, production-grade automation at scale.`;
    case "days_90":
      return `${slug} has been running on AJ Digital OS for ${metrics.days_active} days ` +
        `with ${metrics.completed_runs} completed missions. ${qualityNote}${improvementNote}${patternsNote}` +
        `Sustained engagement proves long-term operational reliability.`;
    case "improvement_15":
      return `Through pattern extraction and adaptive mutation, ${slug} has achieved ` +
        `a ${metrics.improvement_pct}% improvement in execution quality. ${qualityNote}` +
        `${patternsNote}This quantifies the compounding value of AJ Digital OS's learning loop.`;
  }
}
