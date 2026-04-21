/**
 * Hermes Schedule Config — defines recurring missions.
 *
 * Hermes reads these definitions to know what to trigger and when.
 * Cron expressions are human-readable labels here (parsed by the scheduler).
 * Actual cron parsing uses simple interval mapping — not a full cron engine.
 */

import type { ScheduleDefinition } from "./hermes-types.js";

// ── Default Schedule Definitions ───────────────────────────────────

export const DEFAULT_SCHEDULES: ScheduleDefinition[] = [
  {
    id: "aeo-audit-weekly",
    name: "AEO Audit — Weekly",
    cron: "every monday 09:00",
    enabled: true,
    mission: {
      mission_type: "build_and_review",
      objective: "Run weekly AEO audit across all active clients",
      input: { audit_type: "aeo", scope: "all_active_clients" },
      priority: "high",
    },
  },
  {
    id: "system-health-6h",
    name: "System Health Check — Every 6 Hours",
    cron: "every 6h",
    enabled: true,
    mission: {
      mission_type: "monitor_only",
      objective: "System health check — verify all services are operational",
      input: { check_targets: ["supabase", "neon", "r2"] },
      priority: "normal",
    },
  },
  {
    id: "failed-run-repair-daily",
    name: "Failed Run Auto-Repair — Daily",
    cron: "every day 06:00",
    enabled: false,
    mission: {
      mission_type: "repair_failed_workflow",
      objective: "Attempt to repair any failed runs from the last 24h",
      input: { lookback_hours: 24, max_retries: 2 },
      priority: "normal",
    },
  },
  {
    id: "client-extract-daily",
    name: "Client Data Extract — Daily",
    cron: "every day 02:00",
    enabled: false,
    mission: {
      mission_type: "extract_normalize_store",
      objective: "Extract and normalize client data from all active sources",
      input: { scope: "all_active_clients", normalize: true },
      priority: "low",
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Parse a simple cron expression into an interval in milliseconds.
 * Supports: "every Xh", "every Xm", "every day HH:MM", "every monday HH:MM"
 * Returns null if the expression isn't a simple interval.
 */
export function parseCronToIntervalMs(cron: string): number | null {
  // "every Xh"
  const hourMatch = cron.match(/^every\s+(\d+)h$/i);
  if (hourMatch?.[1]) return parseInt(hourMatch[1], 10) * 60 * 60 * 1000;

  // "every Xm"
  const minMatch = cron.match(/^every\s+(\d+)m$/i);
  if (minMatch?.[1]) return parseInt(minMatch[1], 10) * 60 * 1000;

  // "every day HH:MM" → 24h interval
  const dailyMatch = cron.match(/^every\s+day\s+\d{2}:\d{2}$/i);
  if (dailyMatch) return 24 * 60 * 60 * 1000;

  // "every monday HH:MM" → 7d interval
  const weeklyMatch = cron.match(/^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+\d{2}:\d{2}$/i);
  if (weeklyMatch) return 7 * 24 * 60 * 60 * 1000;

  return null;
}

/**
 * Get only enabled schedules.
 */
export function getEnabledSchedules(
  schedules: ScheduleDefinition[] = DEFAULT_SCHEDULES,
): ScheduleDefinition[] {
  return schedules.filter((s) => s.enabled);
}
