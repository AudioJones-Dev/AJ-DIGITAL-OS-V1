import { supabase } from "./supabase";
import type {
  Asset,
  Client,
  DashboardSummary,
  Deliverable,
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
