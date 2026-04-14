/**
 * Hermes — Scheduling, Triggering & Monitoring Layer for AJ Digital OS.
 *
 * Hermes orchestrates but never executes:
 * - Scheduler:  interval-based mission triggers
 * - Bridge:     envelope → mission entry boundary
 * - Watcher:    failure detection + auto-retry
 * - Notifications: console + log + webhook (stub)
 *
 * Start Hermes:
 *   import { startHermes, stopHermes } from "./hermes/index.js";
 *   startHermes();           // starts scheduler + watcher
 *   stopHermes();            // tears down cleanly
 */

// ── Bridge ─────────────────────────────────────────────────────────
export {
  triggerMission,
  triggerFromSchedule,
  retryMission,
} from "./hermes-bridge.js";

// ── Scheduler ──────────────────────────────────────────────────────
export {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
} from "./hermes-scheduler.js";

// ── Failure Watcher ────────────────────────────────────────────────
export {
  startFailureWatcher,
  stopFailureWatcher,
  isWatcherRunning,
  getLastCheckAt,
} from "./hermes-failure-watcher.js";
export type { WatcherConfig } from "./hermes-failure-watcher.js";

// ── Notifications ──────────────────────────────────────────────────
export {
  notify,
  notifyAll,
  getRecentNotifications,
  clearNotifications,
} from "./hermes-notifications.js";

// ── Schedule Config ────────────────────────────────────────────────
export {
  DEFAULT_SCHEDULES,
  parseCronToIntervalMs,
  getEnabledSchedules,
} from "./hermes-schedule-config.js";

// ── Types ──────────────────────────────────────────────────────────
export type {
  ScheduleDefinition,
  FailureAlert,
  HermesNotification,
  NotificationSeverity,
  NotificationChannel,
  SchedulerHandle,
  HermesStatus,
} from "./hermes-types.js";

// ── Status API ─────────────────────────────────────────────────────
export {
  startHermesApi,
  stopHermesApi,
} from "./hermes-status-api.js";
export type { HermesRuntimeStatus } from "./hermes-status-api.js";

// ── Convenience: Start/Stop Everything ─────────────────────────────

import { startScheduler, stopScheduler } from "./hermes-scheduler.js";
import { startFailureWatcher, stopFailureWatcher } from "./hermes-failure-watcher.js";
import type { ScheduleDefinition } from "./hermes-types.js";
import type { ProductionMissionConfig } from "../missions/mission-db-hooks.js";
import type { WatcherConfig } from "./hermes-failure-watcher.js";
import { DEFAULT_SCHEDULES } from "./hermes-schedule-config.js";
import { startHermesApi, stopHermesApi } from "./hermes-status-api.js";

export interface HermesConfig {
  /** Schedule definitions (defaults to DEFAULT_SCHEDULES). */
  schedules?: ScheduleDefinition[];
  /** Production mission config. */
  missionConfig?: ProductionMissionConfig;
  /** Failure watcher config. */
  watcher?: WatcherConfig;
  /** Whether to start the status API (default: true). */
  statusApi?: boolean;
}

/**
 * Start the full Hermes orchestration layer (scheduler + watcher + status API).
 */
export function startHermes(config?: HermesConfig): void {
  const schedules = config?.schedules ?? DEFAULT_SCHEDULES;
  startScheduler(schedules, config?.missionConfig);
  startFailureWatcher(config?.watcher);
  if (config?.statusApi !== false) {
    startHermesApi();
  }
  console.log("[HERMES] Hermes is online.");
}

/**
 * Stop the full Hermes orchestration layer.
 */
export function stopHermes(): void {
  stopScheduler();
  stopFailureWatcher();
  stopHermesApi();
  console.log("[HERMES] Hermes is offline.");
}
