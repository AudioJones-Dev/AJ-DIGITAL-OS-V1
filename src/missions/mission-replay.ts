/**
 * Mission Replay — load & format any completed mission run
 * from Neon for inspection, debugging, or replay.
 *
 * Data source: Neon (execution data layer only).
 * Optionally fetches result envelope from R2.
 */

import type { FullRunData } from "../db/neon-client.js";
import { getFullRunData, listRuns } from "../db/neon-client.js";
import type { NeonConfig } from "../db/neon-client.js";
import { getObject } from "../storage/r2-client.js";
import type { R2Config } from "../storage/r2-client.js";
import { missionArtifactKey } from "../storage/r2-client.js";
import type { MissionResultEnvelope } from "./mission-entry-types.js";

// ── Types ──────────────────────────────────────────────────────────

export interface ReplayReport {
  /** Unique run reference. */
  runRef: string;
  /** Whether the full data was loaded successfully. */
  ok: boolean;
  /** Error message if loading failed. */
  error: string | null;
  /** Formatted human-readable summary. */
  summary: string;
  /** The raw execution data from Neon. */
  data: FullRunData | null;
  /** The result envelope from R2 (if available). */
  resultEnvelope: MissionResultEnvelope | null;
}

export interface ReplayConfig {
  neon?: Partial<NeonConfig> | undefined;
  r2?: Partial<R2Config> | undefined;
  /** If true, also fetch result envelope from R2. */
  includeR2?: boolean | undefined;
}

// ── Core ───────────────────────────────────────────────────────────

/**
 * Load a full mission run replay from Neon by run_ref.
 * Optionally fetches the result envelope stored in R2.
 */
export async function loadReplay(
  runRef: string,
  config?: ReplayConfig,
): Promise<ReplayReport> {
  // 1. Load execution data from Neon
  const fullRun = await getFullRunData(runRef, config?.neon);

  if (!fullRun.ok || !fullRun.data) {
    return {
      runRef,
      ok: false,
      error: fullRun.error ?? "Run not found in Neon",
      summary: `Could not load run ${runRef}: ${fullRun.error ?? "not found"}`,
      data: null,
      resultEnvelope: null,
    };
  }

  // 2. Optionally load result envelope from R2
  let resultEnvelope: MissionResultEnvelope | null = null;
  if (config?.includeR2 === true) {
    const key = missionArtifactKey(runRef, "result.json");
    const r2Result = await getObject(key, config?.r2);
    if (r2Result.ok && r2Result.data) {
      try {
        resultEnvelope = JSON.parse(r2Result.data) as MissionResultEnvelope;
      } catch {
        // Ignore JSON parse errors — result envelope is supplementary
      }
    }
  }

  // 3. Build human-readable summary
  const summary = formatReplaySummary(fullRun.data, resultEnvelope);

  return {
    runRef,
    ok: true,
    error: null,
    summary,
    data: fullRun.data,
    resultEnvelope,
  };
}

// ── Formatting ─────────────────────────────────────────────────────

function formatReplaySummary(
  data: FullRunData,
  resultEnvelope: MissionResultEnvelope | null,
): string {
  const { run, steps, observations, failures } = data;
  const lines: string[] = [];

  lines.push(`=== Mission Replay: ${run.run_ref} ===`);
  lines.push(`Type: ${run.mission_type}`);
  lines.push(`Objective: ${run.objective}`);
  lines.push(`Status: ${run.status} | OK: ${run.ok}`);
  lines.push(`Duration: ${run.duration_ms ?? "—"}ms`);
  lines.push(`Roles: ${(run.roles_used ?? []).join(", ") || "none"}`);
  lines.push(`Escalations: ${run.escalation_count}`);
  lines.push("");

  // Steps
  lines.push(`--- Steps (${steps.length}) ---`);
  for (const step of steps) {
    const status = step.ok ? "✓" : "✗";
    lines.push(`  [${step.step_index}] ${status} ${step.role} (${step.duration_ms ?? "?"}ms)${step.pipeline_id ? ` pipeline=${step.pipeline_id}` : ""}`);
    if (step.error) lines.push(`       Error: ${step.error}`);
    if (step.warnings && step.warnings.length > 0) {
      lines.push(`       Warnings: ${step.warnings.join("; ")}`);
    }
  }
  lines.push("");

  // Observations
  if (observations.length > 0) {
    lines.push(`--- Observations (${observations.length}) ---`);
    for (const obs of observations) {
      const health = obs.healthy ? "healthy" : "unhealthy";
      lines.push(`  [${obs.source}] ${health}: ${obs.summary}`);
    }
    lines.push("");
  }

  // Failures
  if (failures.length > 0) {
    lines.push(`--- Failures (${failures.length}) ---`);
    for (const f of failures) {
      lines.push(`  Role: ${f.role} | Escalated: ${f.escalated} | Resolved: ${f.resolved}`);
      lines.push(`  Error: ${f.error}`);
      if (f.resolution) lines.push(`  Resolution: ${f.resolution}`);
      lines.push("");
    }
  }

  // Result envelope (if loaded from R2)
  if (resultEnvelope) {
    lines.push(`--- Result Envelope ---`);
    lines.push(`  OK: ${resultEnvelope.ok}`);
    lines.push(`  Summary: ${resultEnvelope.summary}`);
    lines.push(`  Artifacts: ${resultEnvelope.artifacts.join(", ") || "none"}`);
    lines.push(`  Alerts: ${resultEnvelope.alerts.join(", ") || "none"}`);
  }

  // Run error
  if (run.error) {
    lines.push(`--- Run Error ---`);
    lines.push(`  ${run.error}`);
  }

  return lines.join("\n");
}

/**
 * List recent runs from Neon (most recent first).
 * Lightweight query — does not load steps/observations/failures.
 */
export async function listRecentRuns(
  limit: number = 20,
  config?: Partial<NeonConfig>,
): Promise<{ ok: boolean; runs: Array<Pick<FullRunData["run"], "run_ref" | "mission_type" | "status" | "ok" | "duration_ms" | "started_at">>; error: string | null }> {
  const result = await listRuns(limit, config);
  if (!result.ok || !result.data) {
    return { ok: false, runs: [], error: result.error ?? "Failed to list runs" };
  }
  return {
    ok: true,
    runs: result.data.map((r) => ({
      run_ref: r.run_ref,
      mission_type: r.mission_type,
      status: r.status,
      ok: r.ok,
      duration_ms: r.duration_ms,
      started_at: r.started_at,
    })),
    error: null,
  };
}
