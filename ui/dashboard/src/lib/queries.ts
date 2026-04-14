import { supabase } from "./supabase";
import type {
  Client,
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
    .limit(100);
  if (error) throw new Error(error.message);
  return (data as RunWithMission[] | null) ?? [];
}

// ── Deliverables ───────────────────────────────────────────────────

export async function fetchDeliverables(): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
