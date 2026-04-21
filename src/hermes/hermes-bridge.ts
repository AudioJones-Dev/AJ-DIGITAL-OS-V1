/**
 * Hermes Bridge — thin orchestration layer between Hermes and AJ OS.
 *
 * Delegates all execution to the mission entry layer.
 * Hermes never executes logic directly — it only triggers.
 */

import type { MissionEnvelope, MissionResultEnvelope } from "../missions/mission-entry-types.js";
import { executeProductionMission } from "../missions/mission-db-hooks.js";
import type { ProductionMissionConfig } from "../missions/mission-db-hooks.js";
import type { ScheduleDefinition } from "./hermes-types.js";
import { notify } from "./hermes-notifications.js";
import { applyMutation } from "./missions/apply-mutation.js";
import type { MutationConfigSnapshot } from "./missions/apply-mutation.js";

const TAG = "[HERMES-BRIDGE]";

// ── Trigger from Envelope ──────────────────────────────────────────

/**
 * Trigger a mission from a raw envelope.
 * This is the primary entry point Hermes uses.
 */
export async function triggerMission(
  envelope: MissionEnvelope,
  config?: ProductionMissionConfig,
): Promise<MissionResultEnvelope> {
  const start = Date.now();
  console.log(`${TAG} Triggering mission: ${envelope.mission_type} — "${envelope.objective}"`);

  // ── Pattern-based mutation (safe — never blocks execution) ────
  const clientTier = (envelope.input.client_tier as string | undefined) ?? null;
  const mutation = await applyMutation(envelope, clientTier);
  const executionEnvelope = mutation.envelope;

  const result = await executeProductionMission(executionEnvelope, config, mutation.configSnapshot as unknown as Record<string, unknown>);

  const durationSec = ((Date.now() - start) / 1000).toFixed(1);

  if (result.ok) {
    notify({
      severity: "info",
      channel: "console",
      title: "Mission Completed",
      message: `${envelope.mission_type} completed in ${durationSec}s — ${result.summary}`,
      metadata: { mission_id: result.mission_id, duration_ms: result.metrics.durationMs },
      timestamp: new Date().toISOString(),
    });
  } else {
    notify({
      severity: "critical",
      channel: "console",
      title: "Mission Failed",
      message: `${envelope.mission_type} failed after ${durationSec}s — ${result.summary}`,
      metadata: { mission_id: result.mission_id, failure_ref: result.failure_ref },
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

// ── Trigger from Schedule Definition ───────────────────────────────

/**
 * Convert a schedule definition into an envelope and trigger it.
 */
export async function triggerFromSchedule(
  schedule: ScheduleDefinition,
  config?: ProductionMissionConfig,
): Promise<MissionResultEnvelope> {
  const envelope: MissionEnvelope = {
    mission_type: schedule.mission.mission_type,
    objective: schedule.mission.objective,
    input: schedule.mission.input,
    priority: schedule.mission.priority ?? "normal",
    requested_by: `hermes:schedule:${schedule.id}`,
    schedule_context: {
      trigger_type: "cron",
      trigger_time: new Date().toISOString(),
      recurrence: schedule.cron,
    },
  };

  console.log(`${TAG} Scheduled trigger: ${schedule.name} (${schedule.cron})`);
  return triggerMission(envelope, config);
}

// ── Retry Failed Run ───────────────────────────────────────────────

/**
 * Retry a failed mission by re-triggering with the same parameters.
 * Requires the original mission data to reconstruct the envelope.
 */
export async function retryMission(
  originalEnvelope: MissionEnvelope,
  failedRunRef: string,
  config?: ProductionMissionConfig,
): Promise<MissionResultEnvelope> {
  const retryEnvelope: MissionEnvelope = {
    ...originalEnvelope,
    requested_by: `hermes:retry:${failedRunRef}`,
    schedule_context: {
      trigger_type: "hermes",
      trigger_time: new Date().toISOString(),
    },
  };

  console.log(`${TAG} Retrying failed run: ${failedRunRef}`);

  notify({
    severity: "warning",
    channel: "console",
    title: "Mission Retry",
    message: `Retrying mission ${originalEnvelope.mission_type} (failed ref: ${failedRunRef})`,
    metadata: { failed_run_ref: failedRunRef },
    timestamp: new Date().toISOString(),
  });

  return triggerMission(retryEnvelope, config);
}
