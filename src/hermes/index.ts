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
import { restoreClientSchedules } from "./hermes-client-schedules.js";
import { scoreRecentRuns } from "./missions/score-recent-runs.js";
import { computeIntelligence } from "./missions/compute-intelligence.js";
import { extractPatterns } from "./missions/extract-patterns.js";
import { generatePerformanceReports } from "./missions/generate-performance-report.js";
import { generateCaseStudies } from "./missions/generate-case-study.js";
import { expandDistributionAssets } from "./missions/expand-distribution-assets.js";
import { publishScheduledAssets } from "./missions/publish-scheduled-assets.js";

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

const SCORE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const INTELLIGENCE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PATTERNS_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REPORT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CASE_STUDY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISTRIBUTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PUBLISH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let scoreIntervalId: ReturnType<typeof setInterval> | null = null;
let intelligenceIntervalId: ReturnType<typeof setInterval> | null = null;
let patternsIntervalId: ReturnType<typeof setInterval> | null = null;
let reportIntervalId: ReturnType<typeof setInterval> | null = null;
let caseStudyIntervalId: ReturnType<typeof setInterval> | null = null;
let distributionIntervalId: ReturnType<typeof setInterval> | null = null;
let publishIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the full Hermes orchestration layer (scheduler + watcher + status API).
 * Restores persisted client schedules from the database before starting.
 */
export async function startHermes(config?: HermesConfig): Promise<void> {
  // Restore persisted client schedules before starting the scheduler
  await restoreClientSchedules();

  const schedules = config?.schedules ?? DEFAULT_SCHEDULES;
  startScheduler(schedules, config?.missionConfig);
  startFailureWatcher(config?.watcher);
  if (config?.statusApi !== false) {
    startHermesApi();
  }

  // Score unscored mission runs every hour
  scoreIntervalId = setInterval(() => void scoreRecentRuns(), SCORE_INTERVAL_MS);
  console.log("[HERMES] Score-recent-runs registered \u2014 every 1h");

  // Compute execution intelligence every 24 hours
  intelligenceIntervalId = setInterval(() => void computeIntelligence(), INTELLIGENCE_INTERVAL_MS);
  console.log("[HERMES] Compute-intelligence registered \u2014 every 24h");

  // Extract success patterns daily
  patternsIntervalId = setInterval(() => void extractPatterns(), PATTERNS_INTERVAL_MS);
  console.log("[HERMES] Extract-patterns registered \u2014 every 24h");
  // Generate performance reports monthly
  reportIntervalId = setInterval(() => void generatePerformanceReports(), REPORT_INTERVAL_MS);
  console.log("[HERMES] Performance-reports registered — every 30d");

  // Check case study milestones daily
  caseStudyIntervalId = setInterval(() => void generateCaseStudies(), CASE_STUDY_INTERVAL_MS);
  console.log("[HERMES] Case-study-checks registered — every 24h");

  // Expand proof deliverables into distribution assets daily
  distributionIntervalId = setInterval(() => void expandDistributionAssets(), DISTRIBUTION_INTERVAL_MS);
  console.log("[HERMES] Distribution-expansion registered — every 24h");

  // Publish scheduled distribution assets every 15 minutes
  publishIntervalId = setInterval(() => void publishScheduledAssets(), PUBLISH_INTERVAL_MS);
  console.log("[HERMES] Publish-scheduled registered — every 15m");

  console.log("[HERMES] Hermes is online.");
}

/**
 * Stop the full Hermes orchestration layer.
 */
export function stopHermes(): void {
  stopScheduler();
  stopFailureWatcher();
  stopHermesApi();
  if (scoreIntervalId) {
    clearInterval(scoreIntervalId);
    scoreIntervalId = null;
  }
  if (intelligenceIntervalId) {
    clearInterval(intelligenceIntervalId);
    intelligenceIntervalId = null;
  }
  if (patternsIntervalId) {
    clearInterval(patternsIntervalId);
    patternsIntervalId = null;
  }
  if (reportIntervalId) {
    clearInterval(reportIntervalId);
    reportIntervalId = null;
  }
  if (caseStudyIntervalId) {
    clearInterval(caseStudyIntervalId);
    caseStudyIntervalId = null;
  }
  if (distributionIntervalId) {
    clearInterval(distributionIntervalId);
    distributionIntervalId = null;
  }
  if (publishIntervalId) {
    clearInterval(publishIntervalId);
    publishIntervalId = null;
  }
  console.log("[HERMES] Hermes is offline.");
}
