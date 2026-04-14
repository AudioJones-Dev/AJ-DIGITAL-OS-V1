// ── Supabase Database typegen (manual) ─────────────────────────────
// Matches sql/supabase-schema.sql + deliverables table.

export type ClientTier = "standard" | "professional" | "enterprise";
export type ClientStatus = "active" | "paused" | "archived";
export type MissionDbStatus = "active" | "paused" | "retired";
export type RunDbStatus = "pending" | "running" | "completed" | "failed";
export type TriggerType = "manual" | "cron" | "webhook" | "hermes";
export type DeliverableStatus = "pending" | "uploaded" | "published" | "failed";

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

// ── Supabase Database type map (for typed queries) ─────────────────

export interface Database {
  public: {
    Tables: {
      clients: { Row: Client; Insert: Omit<Client, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Client, "id" | "created_at">> };
      missions: { Row: Mission; Insert: Omit<Mission, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Mission, "id" | "created_at">> };
      mission_runs: { Row: MissionRun; Insert: Omit<MissionRun, "id" | "created_at">; Update: Partial<Omit<MissionRun, "id" | "created_at">> };
      deliverables: { Row: Deliverable; Insert: Omit<Deliverable, "id" | "created_at">; Update: Partial<Omit<Deliverable, "id" | "created_at">> };
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
