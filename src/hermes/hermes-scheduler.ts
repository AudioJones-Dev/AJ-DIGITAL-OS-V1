/**
 * Hermes Scheduler — interval-based mission scheduler.
 *
 * Reads schedule definitions and runs missions on their intervals.
 * Uses setInterval for simplicity — can be replaced with a proper
 * cron engine (node-cron, croner) when needed.
 *
 * Hermes does NOT store state. Schedule handles are in-memory only.
 * If the process restarts, schedules restart from now.
 */

import type { ScheduleDefinition, SchedulerHandle, HermesStatus } from "./hermes-types.js";
import type { ProductionMissionConfig } from "../missions/mission-db-hooks.js";
import { triggerFromSchedule } from "./hermes-bridge.js";
import { parseCronToIntervalMs, getEnabledSchedules, DEFAULT_SCHEDULES } from "./hermes-schedule-config.js";
import { notify } from "./hermes-notifications.js";

const TAG = "[HERMES-SCHEDULER]";

// ── State (in-memory, not persisted) ───────────────────────────────

let running = false;
const handles: Map<string, SchedulerHandle> = new Map();
let failureCount = 0;

// ── Start / Stop ───────────────────────────────────────────────────

/**
 * Start the Hermes scheduler with the given (or default) schedule definitions.
 * Only enabled schedules are activated.
 */
export function startScheduler(
  schedules: ScheduleDefinition[] = DEFAULT_SCHEDULES,
  config?: ProductionMissionConfig,
): void {
  if (running) {
    console.log(`${TAG} Already running — stop first before restarting.`);
    return;
  }

  running = true;
  const enabled = getEnabledSchedules(schedules);

  console.log(`${TAG} Starting with ${enabled.length} enabled schedule(s)…`);

  for (const schedule of enabled) {
    const intervalMs = parseCronToIntervalMs(schedule.cron);
    if (!intervalMs) {
      console.warn(`${TAG} Skipping "${schedule.name}" — unsupported cron: "${schedule.cron}"`);
      continue;
    }

    const handle: SchedulerHandle = {
      scheduleId: schedule.id,
      intervalId: setInterval(() => {
        void executeScheduledMission(schedule, config);
      }, intervalMs),
      nextRunAt: new Date(Date.now() + intervalMs),
    };

    handles.set(schedule.id, handle);

    const intervalLabel = intervalMs >= 86_400_000
      ? `${(intervalMs / 86_400_000).toFixed(0)}d`
      : intervalMs >= 3_600_000
        ? `${(intervalMs / 3_600_000).toFixed(0)}h`
        : `${(intervalMs / 60_000).toFixed(0)}m`;

    console.log(`${TAG}   ✓ ${schedule.name} → every ${intervalLabel}`);
  }

  notify({
    severity: "info",
    channel: "console",
    title: "Hermes Scheduler Started",
    message: `${enabled.length} schedule(s) active`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Stop the Hermes scheduler and clear all intervals.
 */
export function stopScheduler(): void {
  if (!running) return;

  for (const handle of handles.values()) {
    clearInterval(handle.intervalId);
  }
  handles.clear();
  running = false;
  failureCount = 0;

  console.log(`${TAG} Stopped.`);

  notify({
    severity: "info",
    channel: "console",
    title: "Hermes Scheduler Stopped",
    message: "All schedules cleared",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get the current Hermes scheduler status.
 */
export function getSchedulerStatus(): HermesStatus {
  return {
    running,
    activeSchedules: handles.size,
    watcherActive: false, // watcher is a separate module
    lastCheck: null,
    failuresSinceStart: failureCount,
  };
}

// ── Internal ───────────────────────────────────────────────────────

async function executeScheduledMission(
  schedule: ScheduleDefinition,
  config?: ProductionMissionConfig,
): Promise<void> {
  try {
    const result = await triggerFromSchedule(schedule, config);
    if (!result.ok) {
      failureCount++;
    }

    // Update next-run time
    const handle = handles.get(schedule.id);
    if (handle) {
      const intervalMs = parseCronToIntervalMs(schedule.cron);
      if (intervalMs) {
        handle.nextRunAt = new Date(Date.now() + intervalMs);
      }
    }
  } catch (err: unknown) {
    failureCount++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${TAG} Schedule "${schedule.name}" execution error: ${message}`);

    notify({
      severity: "critical",
      channel: "console",
      title: "Scheduled Mission Error",
      message: `Schedule "${schedule.name}" threw: ${message}`,
      metadata: { schedule_id: schedule.id },
      timestamp: new Date().toISOString(),
    });
  }
}
