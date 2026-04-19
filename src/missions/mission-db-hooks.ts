/**
 * Mission DB Hooks — wires Supabase + Neon + R2 into mission execution.
 *
 * Separation of concerns:
 *   Supabase  → mission_runs status (control layer)
 *   Neon      → full execution data (data layer)
 *   R2        → artifact storage
 *   No duplication across systems.
 *
 * This module wraps `executeMissionFromEnvelope` to add production
 * persistence. The original function still handles file-based
 * shared memory for local/offline mode.
 */

import type { MissionEnvelope, MissionResultEnvelope } from "./mission-entry-types.js";
import { executeMissionFromEnvelope, resetMissionSeq } from "./mission-entry.js";
import type { MissionEntryOptions } from "./mission-entry.js";
import * as supabase from "../db/supabase-client.js";
import type { SupabaseConfig } from "../db/supabase-client.js";
import * as executionLogger from "../db/execution-logger.js";
import type { ExecutionLoggerConfig } from "../db/execution-logger.js";
import * as r2 from "../storage/r2-client.js";
import type { R2Config } from "../storage/r2-client.js";
import type { MissionResult } from "../agent-roles/mission-types.js";
import { runMission } from "../agent-roles/mission-controller.js";
import { validateMissionEnvelope } from "./mission-entry-types.js";

// ── Configuration ──────────────────────────────────────────────────

export interface ProductionMissionConfig {
  /** Supabase control layer config. */
  supabase?: Partial<SupabaseConfig> | undefined;
  /** Neon execution data layer config. */
  neon?: ExecutionLoggerConfig | undefined;
  /** R2 artifact storage config. */
  r2?: Partial<R2Config> | undefined;
  /** Mission entry options (handler injection, dry run). */
  entry?: MissionEntryOptions | undefined;
  /** If true, skip all external service writes. */
  dryRun?: boolean | undefined;
}

// ── Production Mission Executor ────────────────────────────────────

/**
 * Execute a mission with full production persistence.
 *
 * Flow:
 * 1. Validate envelope
 * 2. Create Supabase mission_run (status=running)
 * 3. Execute via core pipeline
 * 4. Log execution data to Neon (steps, observations, failures)
 * 5. Upload artifacts to R2
 * 6. Update Supabase mission_run (status=completed|failed)
 * 7. Return result envelope
 */
export async function executeProductionMission(
  envelope: MissionEnvelope,
  config?: ProductionMissionConfig,
  configSnapshot?: Record<string, unknown> | null,
): Promise<MissionResultEnvelope> {
  const dryRun = config?.dryRun === true;

  // 1. Execute via core pipeline (handles validation, mapping, local persistence)
  const entryOptions: MissionEntryOptions = config?.entry ?? {};
  const resultEnvelope = await executeMissionFromEnvelope(envelope, entryOptions);
  const runRef = resultEnvelope.mission_id;

  if (dryRun) return resultEnvelope;

  // 2. Create Supabase mission_run record (control layer — non-blocking)
  const supabaseWrite = supabase.createMissionRun({
    mission_id: "",  // Link to mission if available
    run_ref: runRef,
    status: "running",
    requested_by: envelope.requested_by ?? null,
    trigger_type: envelope.schedule_context?.trigger_type === "cron" ? "cron" : "manual",
    ok: null,
    summary: null,
    artifacts: [],
    failure_ref: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    duration_ms: null,
  }, config?.supabase).catch((err: unknown) => {
    console.error(`[MISSION-DB-HOOKS] Supabase create failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  // 3. Upload artifacts to R2 (non-blocking)
  const r2Keys: string[] = [];
  const r2Writes = resultEnvelope.artifacts.map(async (artifact, idx) => {
    const key = r2.missionArtifactKey(runRef, `artifact_${idx}_${artifact.split("/").pop() ?? "output"}`);
    const result = await r2.putObject(key, JSON.stringify({ artifact, mission_id: runRef }), "application/json", config?.r2);
    if (result.ok && result.data) r2Keys.push(result.data);
  });

  // 4. Store full result envelope in R2
  const resultKey = r2.missionArtifactKey(runRef, "result.json");
  const r2ResultWrite = r2.putObject(
    resultKey,
    JSON.stringify(resultEnvelope, null, 2),
    "application/json",
    config?.r2,
  ).then((result) => {
    if (result.ok && result.data) r2Keys.push(result.data);
  }).catch(() => { /* R2 failure is non-fatal */ });

  // Wait for all background writes
  await Promise.allSettled([supabaseWrite, ...r2Writes, r2ResultWrite]);

  // 5. Update Supabase run status (control layer)
  await supabase.updateMissionRunStatus(runRef, {
    status: resultEnvelope.ok ? "completed" : "failed",
    ok: resultEnvelope.ok,
    summary: resultEnvelope.summary,
    artifacts: r2Keys,
    failure_ref: resultEnvelope.failure_ref ?? undefined,
    completed_at: new Date().toISOString(),
    duration_ms: resultEnvelope.metrics.durationMs,
    mission_config_at_execution: configSnapshot ?? undefined,
  }, config?.supabase).catch((err: unknown) => {
    console.error(`[MISSION-DB-HOOKS] Supabase update failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  return resultEnvelope;
}

// Re-export for convenience
export { resetMissionSeq };
