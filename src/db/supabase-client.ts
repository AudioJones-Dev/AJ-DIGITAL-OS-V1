/**
 * Supabase Client — Control Layer
 *
 * Fetch-based PostgREST client. No SDK dependency.
 * Manages: clients, missions, mission_runs (metadata only).
 *
 * Requires env:
 *   SUPABASE_URL      — e.g. https://xxxxx.supabase.co
 *   SUPABASE_ANON_KEY — public anon key (or service role key for server-side)
 */

import type {
  DbClient,
  DbMission,
  DbMissionRun,
  InsertClient,
  InsertMission,
  InsertMissionRun,
  QueryResult,
  RunDbStatus,
} from "./db-types.js";

// ── Configuration ──────────────────────────────────────────────────

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function resolveConfig(override?: Partial<SupabaseConfig>): SupabaseConfig {
  return {
    url: override?.url ?? process.env.SUPABASE_URL?.trim() ?? "",
    anonKey: override?.anonKey ?? process.env.SUPABASE_ANON_KEY?.trim() ?? "",
  };
}

export function isConfigured(cfg: SupabaseConfig): boolean {
  return cfg.url.length > 0 && cfg.anonKey.length > 0;
}

// ── Generic REST Helpers ───────────────────────────────────────────

export async function supabaseGet<T>(
  cfg: SupabaseConfig,
  table: string,
  query: string,
): Promise<QueryResult<T[]>> {
  const url = `${cfg.url}/rest/v1/${table}?${query}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, data: null, error: `Supabase GET ${res.status}: ${body.slice(0, 300)}`, count: null };
    }
    const data = (await res.json()) as T[];
    return { ok: true, data, error: null, count: data.length };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err), count: null };
  }
}

export async function supabaseInsert<T>(
  cfg: SupabaseConfig,
  table: string,
  row: Record<string, unknown>,
): Promise<QueryResult<T>> {
  const url = `${cfg.url}/rest/v1/${table}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, data: null, error: `Supabase INSERT ${res.status}: ${body.slice(0, 300)}`, count: null };
    }
    const arr = (await res.json()) as T[];
    return { ok: true, data: arr[0] ?? null, error: null, count: 1 };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err), count: null };
  }
}

export async function supabasePatch<T>(
  cfg: SupabaseConfig,
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<QueryResult<T>> {
  const url = `${cfg.url}/rest/v1/${table}?${query}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, data: null, error: `Supabase PATCH ${res.status}: ${body.slice(0, 300)}`, count: null };
    }
    const arr = (await res.json()) as T[];
    return { ok: true, data: arr[0] ?? null, error: null, count: arr.length };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err), count: null };
  }
}

// ── Client Operations ──────────────────────────────────────────────

export async function getClient(
  slug: string,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbClient>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  const result = await supabaseGet<DbClient>(cfg, "clients", `slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return { ok: result.ok, data: result.data?.[0] ?? null, error: result.error, count: result.count };
}

export async function listClients(
  status?: string,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbClient[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  const query = status ? `status=eq.${encodeURIComponent(status)}&order=created_at.desc` : "order=created_at.desc";
  return supabaseGet<DbClient>(cfg, "clients", query);
}

export async function createClient(
  client: InsertClient,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbClient>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  return supabaseInsert<DbClient>(cfg, "clients", client as unknown as Record<string, unknown>);
}

// ── Mission Operations ─────────────────────────────────────────────

export async function getMission(
  id: string,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMission>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  const result = await supabaseGet<DbMission>(cfg, "missions", `id=eq.${encodeURIComponent(id)}&limit=1`);
  return { ok: result.ok, data: result.data?.[0] ?? null, error: result.error, count: result.count };
}

export async function createMission(
  mission: InsertMission,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMission>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  return supabaseInsert<DbMission>(cfg, "missions", mission as unknown as Record<string, unknown>);
}

// ── Mission Run Operations ─────────────────────────────────────────

export async function createMissionRun(
  run: InsertMissionRun,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMissionRun>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  return supabaseInsert<DbMissionRun>(cfg, "mission_runs", run as unknown as Record<string, unknown>);
}

export async function updateMissionRunStatus(
  runRef: string,
  update: {
    status: RunDbStatus;
    ok?: boolean | undefined;
    summary?: string | undefined;
    artifacts?: string[] | undefined;
    failure_ref?: string | undefined;
    completed_at?: string | undefined;
    duration_ms?: number | undefined;
  },
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMissionRun>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  const patch: Record<string, unknown> = { status: update.status };
  if (update.ok !== undefined) patch.ok = update.ok;
  if (update.summary !== undefined) patch.summary = update.summary;
  if (update.artifacts !== undefined) patch.artifacts = update.artifacts;
  if (update.failure_ref !== undefined) patch.failure_ref = update.failure_ref;
  if (update.completed_at !== undefined) patch.completed_at = update.completed_at;
  if (update.duration_ms !== undefined) patch.duration_ms = update.duration_ms;
  return supabasePatch<DbMissionRun>(cfg, "mission_runs", `run_ref=eq.${encodeURIComponent(runRef)}`, patch);
}

export async function getMissionRunsByMission(
  missionId: string,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMissionRun[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  return supabaseGet<DbMissionRun>(cfg, "mission_runs", `mission_id=eq.${encodeURIComponent(missionId)}&order=created_at.desc`);
}

export async function getRecentFailedRuns(
  limit = 20,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMissionRun[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  return supabaseGet<DbMissionRun>(cfg, "mission_runs", `status=eq.failed&order=created_at.desc&limit=${limit}`);
}

export async function getMissionById(
  missionId: string,
  config?: Partial<SupabaseConfig>,
): Promise<QueryResult<DbMission>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Supabase not configured", count: null };
  return supabaseGet<DbMission>(cfg, "missions", `id=eq.${encodeURIComponent(missionId)}&limit=1`).then(
    (r) => ({ ...r, data: r.data?.[0] ?? null }),
  ) as Promise<QueryResult<DbMission>>;
}
