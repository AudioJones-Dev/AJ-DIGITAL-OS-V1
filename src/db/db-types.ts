/**
 * Database Types — shared TypeScript interfaces for Supabase + Neon.
 *
 * Supabase (control layer): clients, missions, mission_runs
 * Neon (data layer): runs, steps, observations, failures, patterns
 */

// ═══════════════════════════════════════════════════════════════════
// Supabase — Control Layer
// ═══════════════════════════════════════════════════════════════════

export type ClientTier = "standard" | "professional" | "enterprise";
export type ClientStatus = "active" | "paused" | "archived";

export interface DbClient {
  id: string;
  slug: string;
  display_name: string;
  contact_email: string | null;
  tier: ClientTier;
  status: ClientStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MissionDbStatus = "active" | "paused" | "retired";
export type TriggerType = "manual" | "cron" | "webhook" | "hermes";

export interface DbMission {
  id: string;
  client_id: string | null;
  mission_type: string;
  objective: string;
  priority: string;
  input_payload: Record<string, unknown>;
  schedule: Record<string, unknown> | null;
  status: MissionDbStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type RunDbStatus = "pending" | "running" | "completed" | "failed";

export interface DbMissionRun {
  id: string;
  mission_id: string;
  run_ref: string;
  status: RunDbStatus;
  requested_by: string | null;
  trigger_type: TriggerType;
  ok: boolean | null;
  summary: string | null;
  artifacts: string[];
  failure_ref: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export type DeliverableStatus = "pending" | "uploaded" | "published" | "failed";

export interface DbDeliverable {
  id: string;
  mission_run_id: string | null;
  client_id: string | null;
  filename: string;
  content_type: string;
  size_bytes: number | null;
  r2_key: string;
  public_url: string | null;
  status: DeliverableStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AssetStatus = "pending" | "uploaded" | "published" | "failed";

export interface DbAsset {
  id: string;
  deliverable_id: string | null;
  client_id: string | null;
  filename: string;
  r2_key: string;
  public_url: string | null;
  content_type: string;
  size_bytes: number | null;
  status: AssetStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════
// Neon — Data Layer
// ═══════════════════════════════════════════════════════════════════

export interface DbRun {
  id: number;
  run_ref: string;
  mission_type: string;
  objective: string;
  input_payload: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  ok: boolean | null;
  summary: string | null;
  error: string | null;
  roles_used: string[];
  escalation_count: number;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface DbStep {
  id: number;
  run_id: number;
  step_index: number;
  role: string;
  pipeline_id: string;
  ok: boolean;
  input_snapshot: unknown;
  output_snapshot: unknown;
  error: string | null;
  duration_ms: number;
  retries: number;
  warnings: string[];
  created_at: string;
}

export interface DbObservation {
  id: number;
  run_id: number | null;
  source: string;
  healthy: boolean;
  summary: string;
  checks: unknown[];
  snapshot_label: string | null;
  created_at: string;
}

export interface DbFailure {
  id: number;
  run_id: number | null;
  step_id: number | null;
  role: string;
  error: string;
  input_snapshot: unknown;
  stack_trace: string | null;
  escalated: boolean;
  resolved: boolean;
  resolution: string | null;
  created_at: string;
}

export type PatternType = "decision" | "recovery" | "optimization" | "anti_pattern";

export interface DbPattern {
  id: number;
  run_id: number | null;
  pattern_type: PatternType;
  description: string;
  context: Record<string, unknown>;
  confidence: number;
  occurrences: number;
  last_seen_at: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════
// Query Abstractions
// ═══════════════════════════════════════════════════════════════════

/** Generic query result from either DB. */
export interface QueryResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  count: number | null;
}

/** Insert input types (omit auto-generated fields). */
export type InsertClient = Omit<DbClient, "id" | "created_at" | "updated_at">;
export type InsertMission = Omit<DbMission, "id" | "created_at" | "updated_at">;
export type InsertMissionRun = Omit<DbMissionRun, "id" | "created_at">;
export type InsertDeliverable = Omit<DbDeliverable, "id" | "created_at">;
export type InsertAsset = Omit<DbAsset, "id" | "created_at">;
export type InsertRun = Omit<DbRun, "id" | "started_at" | "completed_at">;
export type InsertStep = Omit<DbStep, "id" | "created_at">;
export type InsertObservation = Omit<DbObservation, "id" | "created_at">;
export type InsertFailure = Omit<DbFailure, "id" | "created_at">;
export type InsertPattern = Omit<DbPattern, "id" | "created_at">;
