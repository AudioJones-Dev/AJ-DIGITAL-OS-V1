/**
 * Hermes Types — scheduling, monitoring, and notification types.
 *
 * Hermes is the orchestration layer. It does NOT execute mission logic,
 * store memory, or duplicate Supabase state. It only schedules, triggers,
 * watches, and notifies.
 */

import type { MissionTypeName, MissionPriority } from "../missions/mission-entry-types.js";

// ── Schedule Definition ────────────────────────────────────────────

export interface ScheduleDefinition {
  /** Unique identifier for this scheduled mission. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** When to trigger: cron expression or interval string. */
  cron: string;
  /** Whether this schedule is active. */
  enabled: boolean;
  /** Mission envelope template. */
  mission: {
    mission_type: MissionTypeName;
    objective: string;
    input: Record<string, unknown>;
    priority?: MissionPriority;
    client_id?: string;
  };
}

// ── Failure Alert ──────────────────────────────────────────────────

export interface FailureAlert {
  run_id: string;
  run_ref: string;
  mission_id: string;
  status: "failed";
  summary: string | null;
  failure_ref: string | null;
  detected_at: string;
}

// ── Notification ───────────────────────────────────────────────────

export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationChannel = "console" | "log" | "webhook";

export interface HermesNotification {
  severity: NotificationSeverity;
  channel: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ── Scheduler State ────────────────────────────────────────────────

export interface SchedulerHandle {
  scheduleId: string;
  intervalId: ReturnType<typeof setInterval>;
  nextRunAt: Date;
}

export interface HermesStatus {
  running: boolean;
  activeSchedules: number;
  watcherActive: boolean;
  lastCheck: string | null;
  failuresSinceStart: number;
}
