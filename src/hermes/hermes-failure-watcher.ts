/**
 * Hermes Failure Watcher — polls Supabase for failed mission runs.
 *
 * Detects new failures and dispatches notifications.
 * Optionally triggers automatic retries for recoverable failures.
 *
 * Hermes does NOT duplicate Supabase state — it reads and reacts.
 * The "seen" set is in-memory only; a restart re-checks recent failures.
 */

import { getRecentFailedRuns, getMissionById } from "../db/supabase-client.js";
import type { SupabaseConfig } from "../db/supabase-client.js";
import type { DbMissionRun } from "../db/db-types.js";
import type { FailureAlert } from "./hermes-types.js";
import type { MissionTypeName } from "../missions/mission-entry-types.js";
import { notify, notifyAll } from "./hermes-notifications.js";
import { retryMission } from "./hermes-bridge.js";
import { repairFailure, type RepairConfig } from "./hermes-repair-engine.js";
import type { ProductionMissionConfig } from "../missions/mission-db-hooks.js";

const TAG = "[HERMES-WATCHER]";

// ── State (in-memory) ──────────────────────────────────────────────

let watcherInterval: ReturnType<typeof setInterval> | null = null;
let lastCheckAt: string | null = null;
const seenFailures = new Set<string>();

// ── Configuration ──────────────────────────────────────────────────

export interface WatcherConfig {
  /** Poll interval in milliseconds. Default: 60_000 (1 minute). */
  pollIntervalMs?: number;
  /** Maximum failed runs to fetch per poll. Default: 20. */
  fetchLimit?: number;
  /** Whether to auto-retry failed runs (legacy simple retry). Default: false. */
  autoRetry?: boolean;
  /** Whether to run the full repair engine (classify → strategy → retry). Default: false. */
  autoRepair?: boolean;
  /** Maximum auto-retries per run. Default: 1. */
  maxAutoRetries?: number;
  /** Supabase config override. */
  supabase?: Partial<SupabaseConfig>;
  /** Production mission config (for retries). */
  missionConfig?: ProductionMissionConfig;
}

const DEFAULT_CONFIG: Required<Omit<WatcherConfig, "supabase" | "missionConfig">> = {
  pollIntervalMs: 60_000,
  fetchLimit: 20,
  autoRetry: false,
  autoRepair: false,
  maxAutoRetries: 1,
};

// ── Start / Stop ───────────────────────────────────────────────────

/**
 * Start the failure watcher. Polls Supabase for failed runs on interval.
 */
export function startFailureWatcher(config?: WatcherConfig): void {
  if (watcherInterval) {
    console.log(`${TAG} Already running — stop first.`);
    return;
  }

  const pollMs = config?.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs;
  console.log(`${TAG} Starting failure watcher (poll every ${(pollMs / 1000).toFixed(0)}s)…`);

  // Immediate first check
  void checkForFailures(config);

  watcherInterval = setInterval(() => {
    void checkForFailures(config);
  }, pollMs);

  notify({
    severity: "info",
    channel: "console",
    title: "Failure Watcher Started",
    message: `Polling every ${(pollMs / 1000).toFixed(0)}s`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Stop the failure watcher.
 */
export function stopFailureWatcher(): void {
  if (!watcherInterval) return;
  clearInterval(watcherInterval);
  watcherInterval = null;
  seenFailures.clear();
  lastCheckAt = null;
  console.log(`${TAG} Stopped.`);
}

/**
 * Check if the watcher is running.
 */
export function isWatcherRunning(): boolean {
  return watcherInterval !== null;
}

/**
 * Get the last check timestamp.
 */
export function getLastCheckAt(): string | null {
  return lastCheckAt;
}

// ── Core Poll Logic ────────────────────────────────────────────────

async function checkForFailures(config?: WatcherConfig): Promise<void> {
  const limit = config?.fetchLimit ?? DEFAULT_CONFIG.fetchLimit;
  lastCheckAt = new Date().toISOString();

  try {
    const result = await getRecentFailedRuns(limit, config?.supabase);

    if (!result.ok || !result.data) {
      console.warn(`${TAG} Failed to fetch runs: ${result.error ?? "unknown"}`);
      return;
    }

    const runs = result.data as DbMissionRun[];
    const newFailures: FailureAlert[] = [];

    for (const run of runs) {
      if (seenFailures.has(run.id)) continue;
      seenFailures.add(run.id);

      newFailures.push({
        run_id: run.id,
        run_ref: run.run_ref,
        mission_id: run.mission_id,
        status: "failed",
        summary: run.summary,
        failure_ref: run.failure_ref,
        detected_at: lastCheckAt,
      });
    }

    if (newFailures.length === 0) return;

    console.log(`${TAG} Detected ${newFailures.length} new failure(s)`);

    // Dispatch notifications for each new failure
    for (const alert of newFailures) {
      notifyAll(
        "critical",
        "Mission Run Failed",
        `Run ${alert.run_ref} failed: ${alert.summary ?? "no summary"}`,
        {
          run_id: alert.run_id,
          mission_id: alert.mission_id,
          failure_ref: alert.failure_ref,
        },
      );

      // Auto-repair (full classify → strategy → retry pipeline)
      if (config?.autoRepair) {
        const errorText = alert.summary ?? "unknown failure";
        await repairFailure(alert, errorText, {
          supabase: config.supabase ?? {},
          missionConfig: config.missionConfig ?? ({} as ProductionMissionConfig),
        });
      }
      // Legacy auto-retry (simple retry without classification)
      else if (config?.autoRetry) {
        await attemptAutoRetry(alert, config);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${TAG} Poll error: ${message}`);
  }
}

// ── Auto-Retry Logic ───────────────────────────────────────────────

async function attemptAutoRetry(
  alert: FailureAlert,
  config?: WatcherConfig,
): Promise<void> {
  try {
    // Look up the original mission to reconstruct the envelope
    const missionResult = await getMissionById(alert.mission_id, config?.supabase);
    if (!missionResult.ok || !missionResult.data) {
      console.warn(`${TAG} Cannot retry ${alert.run_ref} — mission ${alert.mission_id} not found`);
      return;
    }

    const mission = missionResult.data;
    const missionType = mission.mission_type as MissionTypeName;

    await retryMission(
      {
        mission_type: missionType,
        objective: mission.objective,
        input: mission.input_payload ?? {},
        priority: (mission.priority as "low" | "normal" | "high" | "critical") ?? "normal",
        requested_by: `hermes:auto-retry:${alert.run_ref}`,
      },
      alert.run_ref,
      config?.missionConfig,
    );

    notify({
      severity: "warning",
      channel: "console",
      title: "Auto-Retry Triggered",
      message: `Retrying ${alert.run_ref} (mission: ${mission.objective})`,
      metadata: { run_ref: alert.run_ref, mission_id: alert.mission_id },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${TAG} Auto-retry failed for ${alert.run_ref}: ${message}`);
  }
}
