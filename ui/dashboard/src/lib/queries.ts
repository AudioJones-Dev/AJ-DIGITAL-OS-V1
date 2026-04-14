import { supabase } from "./supabase";
import type {
  Asset,
  Client,
  DashboardSummary,
  Deliverable,
  Mission,
  MissionRun,
  MissionWithClient,
  RunWithMission,
} from "./types";

// ── Clients ────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("display_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Missions (with client join) ────────────────────────────────────

export async function fetchMissions(): Promise<MissionWithClient[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*, clients(slug, display_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as MissionWithClient[] | null) ?? [];
}

export async function fetchMissionById(id: string): Promise<MissionWithClient> {
  const { data, error } = await supabase
    .from("missions")
    .select("*, clients(slug, display_name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as MissionWithClient;
}

// ── Runs (with mission join) ───────────────────────────────────────

export async function fetchRuns(): Promise<RunWithMission[]> {
  const { data, error } = await supabase
    .from("mission_runs")
    .select("*, missions(mission_type, objective, client_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as RunWithMission[] | null) ?? [];
}

export async function fetchRunById(id: string): Promise<RunWithMission> {
  const { data, error } = await supabase
    .from("mission_runs")
    .select("*, missions(mission_type, objective, client_id)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as RunWithMission;
}

export async function fetchRunsByMissionId(missionId: string): Promise<MissionRun[]> {
  const { data, error } = await supabase
    .from("mission_runs")
    .select("*")
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Deliverables ───────────────────────────────────────────────────

export async function fetchDeliverables(): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDeliverablesByRunId(runId: string): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("mission_run_id", runId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDeliverablesByClientId(clientId: string): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Assets ─────────────────────────────────────────────────────────

export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAssetsByClientId(clientId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Dashboard Summary (aggregate counts) ───────────────────────────

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [clients, missions, runs, deliverables] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("mission_runs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("deliverables").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
  ]);

  return {
    activeClients: clients.count ?? 0,
    runningMissions: missions.count ?? 0,
    failedRuns: runs.count ?? 0,
    deliverablesThisWeek: deliverables.count ?? 0,
  };
}

// ── Mutations ──────────────────────────────────────────────────────

export async function createMission(input: {
  client_id: string | null;
  mission_type: string;
  objective: string;
  priority: string;
  input_payload: Record<string, unknown>;
}): Promise<Mission> {
  const { data, error } = await supabase
    .from("missions")
    .insert({
      client_id: input.client_id,
      mission_type: input.mission_type,
      objective: input.objective,
      priority: input.priority,
      input_payload: input.input_payload,
      status: "active",
      tags: [],
    } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Mission;
}

export async function createMissionRun(input: {
  mission_id: string;
  requested_by: string;
  trigger_type: "manual" | "cron" | "webhook" | "hermes";
}): Promise<MissionRun> {
  const runRef = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from("mission_runs")
    .insert({
      mission_id: input.mission_id,
      run_ref: runRef,
      status: "pending",
      requested_by: input.requested_by,
      trigger_type: input.trigger_type,
      ok: null,
      summary: null,
      artifacts: [],
      failure_ref: null,
      started_at: null,
      completed_at: null,
      duration_ms: null,
    } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as MissionRun;
}
