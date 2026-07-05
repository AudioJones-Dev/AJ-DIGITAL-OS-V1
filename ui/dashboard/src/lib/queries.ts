import { supabase } from "./supabase";
import type {
  ApprovalDecision,
  ApprovalDecisionResult,
  ApprovalRequest,
  Asset,
  Client,
  ClientAgent,
  DashboardSummary,
  Deliverable,
  Mission,
  MissionRun,
  MissionWithClient,
  ReplayData,
  RepairEvent,
  RunWithMission,
  Subscription,
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

// ── Replay (Neon data via Hermes API) ──────────────────────────────

const HERMES_API = import.meta.env.VITE_HERMES_API_URL ?? "http://127.0.0.1:7420";

// Bearer token for the Hermes status API (protected routes). Baked into the
// bundle at build time — acceptable only because this dashboard is an
// operator-only surface (local / Cloudflare Access), never a public deploy.
const HERMES_TOKEN: string = import.meta.env.VITE_HERMES_STATUS_API_KEY ?? "";

function hermesHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...(HERMES_TOKEN ? { Authorization: `Bearer ${HERMES_TOKEN}` } : {}),
    ...(extra ?? {}),
  };
}

export async function fetchReplayData(runRef: string): Promise<ReplayData | null> {
  const res = await fetch(`${HERMES_API}/replay/${encodeURIComponent(runRef)}`, {
    headers: hermesHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const body = await res.json() as { ok: boolean; data?: ReplayData };
  return body.ok && body.data ? body.data : null;
}

// ── Repair Events (Neon via Hermes API) ────────────────────────────

export async function fetchRepairEvents(): Promise<RepairEvent[]> {
  const res = await fetch(`${HERMES_API}/repairs`, {
    headers: hermesHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const body = await res.json() as { ok: boolean; data?: RepairEvent[] };
  return body.ok && body.data ? body.data : [];
}

// ── Approvals (approval-service via Hermes API) ────────────────────
// Backend contract (to be exposed on hermes-status-api, port 7420):
//   GET  /approvals                    -> { ok, data?: ApprovalRequest[] }
//   POST /approvals/:id/decision       -> { ok, data?: ApprovalRequest, error? }
//     body: { decision: "approve"|"deny", actorId, channel: "dashboard" }
//
// NOTE: unlike fetchRepairEvents, this THROWS on failure rather than
// returning []. An empty list must mean "nothing pending" — never
// "the approvals service is unreachable". Failing closed keeps the
// error state distinct from the empty state on this trust surface.

export async function fetchApprovals(): Promise<ApprovalRequest[]> {
  const res = await fetch(`${HERMES_API}/approvals`, {
    headers: hermesHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Approvals service unavailable (HTTP ${res.status})`);
  const body = (await res.json()) as { ok: boolean; data?: ApprovalRequest[]; error?: string };
  if (!body.ok) throw new Error(body.error ?? "Approvals service returned an error");
  return body.data ?? [];
}

export async function decideApproval(input: {
  approvalId: string;
  decision: ApprovalDecision;
  actorId: string;
}): Promise<ApprovalDecisionResult> {
  let res: Response;
  try {
    res = await fetch(`${HERMES_API}/approvals/${encodeURIComponent(input.approvalId)}/decision`, {
      method: "POST",
      headers: hermesHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ decision: input.decision, actorId: input.actorId, channel: "dashboard" }),
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    return { ok: false, approval: null, error: err instanceof Error ? err.message : "Network error" };
  }
  if (!res.ok) return { ok: false, approval: null, error: `HTTP ${res.status}` };
  const body = (await res.json()) as { ok: boolean; data?: ApprovalRequest; error?: string };
  return { ok: body.ok, approval: body.data ?? null, error: body.error ?? null };
}

// ── Subscriptions ──────────────────────────────────────────────────

export async function fetchSubscriptionByClientId(clientId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

// ── Client Agents ──────────────────────────────────────────────────

export async function fetchClientAgents(clientId: string): Promise<ClientAgent[]> {
  const { data, error } = await supabase
    .from("client_agents")
    .select("*")
    .eq("client_id", clientId)
    .order("role");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Onboarding: Create Checkout ────────────────────────────────────

export async function createCheckoutSession(input: {
  email: string;
  tier: string;
  clientId?: string;
}): Promise<{ ok: boolean; url: string | null; error: string | null }> {
  const res = await fetch(`${HERMES_API}/api/stripe/create-checkout-session`, {
    method: "POST",
    headers: hermesHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      email: input.email,
      tier: input.tier,
      clientId: input.clientId,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return { ok: false, url: null, error: `HTTP ${res.status}` };
  const body = await res.json() as { ok: boolean; url?: string; error?: string };
  return { ok: body.ok, url: body.url ?? null, error: body.error ?? null };
}
