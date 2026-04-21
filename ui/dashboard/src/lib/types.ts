// ── Supabase Database typegen (manual) ─────────────────────────────
// Matches sql/supabase-schema.sql + deliverables + assets tables.

export type ClientTier = "standard" | "professional" | "enterprise";
export type ClientStatus = "active" | "paused" | "archived";
export type MissionDbStatus = "active" | "paused" | "retired";
export type RunDbStatus = "pending" | "running" | "completed" | "failed";
export type TriggerType = "manual" | "cron" | "webhook" | "hermes";
export type DeliverableStatus = "pending" | "uploaded" | "published" | "failed";
export type AssetStatus = "pending" | "uploaded" | "published" | "failed";
export type SubscriptionStatus = "incomplete" | "active" | "past_due" | "canceled" | "unpaid" | "trialing";
export type AgentRoleName = "planner" | "executor" | "validator" | "monitor";

// ── Row types ──────────────────────────────────────────────────────

export interface Client {
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

export interface Mission {
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

export interface MissionRun {
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

export interface Deliverable {
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

export interface Asset {
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

export interface Subscription {
  id: string;
  client_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  plan_tier: ClientTier;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientAgent {
  id: string;
  client_id: string;
  role: AgentRoleName;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ── Supabase Database type map (for typed queries) ─────────────────

export interface Database {
  public: {
    Tables: {
      clients: { Row: Client; Insert: Omit<Client, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Client, "id" | "created_at">> };
      missions: { Row: Mission; Insert: Omit<Mission, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Mission, "id" | "created_at">> };
      mission_runs: { Row: MissionRun; Insert: Omit<MissionRun, "id" | "created_at">; Update: Partial<Omit<MissionRun, "id" | "created_at">> };
      deliverables: { Row: Deliverable; Insert: Omit<Deliverable, "id" | "created_at">; Update: Partial<Omit<Deliverable, "id" | "created_at">> };
      assets: { Row: Asset; Insert: Omit<Asset, "id" | "created_at">; Update: Partial<Omit<Asset, "id" | "created_at">> };
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Subscription, "id" | "created_at">> };
      client_agents: { Row: ClientAgent; Insert: Omit<ClientAgent, "id" | "created_at" | "updated_at">; Update: Partial<Omit<ClientAgent, "id" | "created_at">> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ── Joined types (for views that need cross-table data) ────────────

export interface MissionWithClient extends Mission {
  clients: Pick<Client, "slug" | "display_name"> | null;
}

export interface RunWithMission extends MissionRun {
  missions: Pick<Mission, "mission_type" | "objective" | "client_id"> | null;
}

// ── Summary types (for dashboard home) ─────────────────────────────

export interface DashboardSummary {
  activeClients: number;
  runningMissions: number;
  failedRuns: number;
  deliverablesThisWeek: number;
}

// ── Neon Replay Types (mirrors db-types.ts from backend) ───────────

export interface ReplayRun {
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

export interface ReplayStep {
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

export interface ReplayObservation {
  id: number;
  run_id: number | null;
  source: string;
  healthy: boolean;
  summary: string;
  checks: unknown[];
  snapshot_label: string | null;
  created_at: string;
}

export interface ReplayFailure {
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

export interface ReplayData {
  run: ReplayRun;
  steps: ReplayStep[];
  observations: ReplayObservation[];
  failures: ReplayFailure[];
}

// ── Repair Event Types ─────────────────────────────────────────────

export type FailureClassification = "transient" | "network" | "dependency" | "data_schema" | "auth_config" | "unknown";
export type RepairStrategy = "retry_immediate" | "retry_backoff" | "retry_targeted" | "alert_only" | "retry_then_escalate";
export type RepairResult = "pending" | "success" | "failed" | "escalated";

export interface RepairEvent {
  id: number;
  failure_id: number | null;
  run_id: number | null;
  run_ref: string;
  classification: FailureClassification;
  strategy: RepairStrategy;
  retry_count: number;
  max_retries: number;
  result: RepairResult;
  escalated: boolean;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}
