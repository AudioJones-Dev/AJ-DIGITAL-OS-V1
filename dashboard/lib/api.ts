import type {
  Run,
  Step,
  Observation,
  Failure,
  HermesStatus,
  BelCapabilities,
  FullRunData,
  ControlRunRecord,
  ControlAuditEvent,
  ControlActionPayload,
  ControlActionResult,
  AttributionEvent,
  OSConnector,
  NormalizedEntityType,
  NormalizedEntitySummary,
} from "./types";

const HERMES_API_URL = process.env.HERMES_API_URL ?? "http://localhost:3001";
// Public env var used by client components (must be NEXT_PUBLIC_*)
export const PUBLIC_HERMES_API_URL =
  process.env.NEXT_PUBLIC_HERMES_API_URL ?? process.env.HERMES_API_URL ?? "http://localhost:3001";
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL ?? "";

// ── Neon HTTP API ─────────────────────────────────────────────────

interface NeonQueryResponse {
  fields: Array<{ name: string }>;
  rows: unknown[];
  rowAsArray?: boolean;
}

async function neonQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!NEON_DATABASE_URL) throw new Error("NEON_DATABASE_URL is not set");

  const parsed = new URL(NEON_DATABASE_URL);
  const endpoint = `https://${parsed.hostname}/sql`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": NEON_DATABASE_URL,
    },
    body: JSON.stringify({ query: sql, params }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Neon ${res.status}: ${body.slice(0, 200)}`);
  }

  const result = (await res.json()) as NeonQueryResponse;

  if (result.rowAsArray) {
    const fields = result.fields.map((f) => f.name);
    return (result.rows as unknown[][]).map((row) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < fields.length; i++) {
        obj[fields[i]!] = row[i];
      }
      return obj as T;
    });
  }

  return result.rows as T[];
}

// ── Runs ──────────────────────────────────────────────────────────

export async function fetchRuns(limit = 100): Promise<Run[]> {
  return neonQuery<Run>(
    `SELECT id, run_ref, mission_type, objective, status, ok, summary, error,
            roles_used, escalation_count, duration_ms, started_at, completed_at
     FROM runs ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
}

export async function fetchRun(runRef: string): Promise<Run | null> {
  const rows = await neonQuery<Run>(
    `SELECT id, run_ref, mission_type, objective, status, ok, summary, error,
            roles_used, escalation_count, duration_ms, started_at, completed_at
     FROM runs WHERE run_ref = $1`,
    [runRef],
  );
  return rows[0] ?? null;
}

export async function fetchRunSteps(runId: number): Promise<Step[]> {
  return neonQuery<Step>(
    `SELECT id, run_id, step_index, role, pipeline_id, ok, error, duration_ms, retries, warnings, created_at
     FROM steps WHERE run_id = $1 ORDER BY step_index`,
    [runId],
  );
}

export async function fetchRunObservations(runId: number): Promise<Observation[]> {
  return neonQuery<Observation>(
    `SELECT id, run_id, source, healthy, summary, created_at
     FROM observations WHERE run_id = $1 ORDER BY created_at`,
    [runId],
  );
}

export async function fetchRunFailures(runId: number): Promise<Failure[]> {
  return neonQuery<Failure>(
    `SELECT id, run_id, step_id, role, error, escalated, resolved, created_at
     FROM failures WHERE run_id = $1 ORDER BY created_at`,
    [runId],
  );
}

export async function fetchFullRunData(runRef: string): Promise<FullRunData | null> {
  const run = await fetchRun(runRef);
  if (!run) return null;

  const [steps, observations, failures] = await Promise.all([
    fetchRunSteps(run.id),
    fetchRunObservations(run.id),
    fetchRunFailures(run.id),
  ]);

  return { run, steps, observations, failures };
}

// ── Hermes API ────────────────────────────────────────────────────

export async function fetchHermesStatus(): Promise<HermesStatus> {
  const res = await fetch(`${HERMES_API_URL}/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hermes /status returned ${res.status}`);
  return res.json() as Promise<HermesStatus>;
}

export async function fetchBelCapabilities(): Promise<BelCapabilities> {
  const res = await fetch(`${HERMES_API_URL}/bel/capabilities`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hermes /bel/capabilities returned ${res.status}`);
  return res.json() as Promise<BelCapabilities>;
}

export async function fetchOpportunities(): Promise<unknown[]> {
  const res = await fetch(`${HERMES_API_URL}/intelligence/opportunities`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hermes /intelligence/opportunities returned ${res.status}`);
  const data = await res.json() as { opportunities?: unknown[] } | unknown[];
  return Array.isArray(data) ? data : ((data as { opportunities?: unknown[] }).opportunities ?? []);
}

// ── Control Plane (server-side: uses HERMES_API_URL) ─────────────

export async function getControlRuns(): Promise<ControlRunRecord[]> {
  const res = await fetch(`${HERMES_API_URL}/control/runs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hermes /control/runs returned ${res.status}`);
  const json = (await res.json()) as { ok: boolean; data: ControlRunRecord[] };
  return json.data ?? [];
}

export async function getControlRun(runId: string): Promise<ControlRunRecord | null> {
  const res = await fetch(`${HERMES_API_URL}/control/runs/${encodeURIComponent(runId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Hermes /control/runs/${runId} returned ${res.status}`);
  const json = (await res.json()) as { ok: boolean; data: ControlRunRecord };
  return json.data ?? null;
}

export async function getControlRunAudit(runId: string, limit?: number): Promise<ControlAuditEvent[]> {
  const url = new URL(`${HERMES_API_URL}/control/runs/${encodeURIComponent(runId)}/audit`);
  if (limit !== undefined) url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Hermes /control/runs/${runId}/audit returned ${res.status}`);
  const json = (await res.json()) as { ok: boolean; events: ControlAuditEvent[] };
  return json.events ?? [];
}

/**
 * Server-side control action call. Client components should use
 * `clientControlRunAction` from `lib/control-client.ts` so the request
 * goes to the publicly reachable `NEXT_PUBLIC_HERMES_API_URL`.
 */
export async function controlRunAction(
  runId: string,
  payload: ControlActionPayload,
): Promise<ControlActionResult> {
  const res = await fetch(`${HERMES_API_URL}/control/runs/${encodeURIComponent(runId)}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as ControlActionResult;
  return json;
}

// ── Attribution ──────────────────────────────────────────────────

export async function getAttributionEventsByRun(runId: string): Promise<AttributionEvent[]> {
  const res = await fetch(
    `${HERMES_API_URL}/attribution/events/${encodeURIComponent(runId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Hermes /attribution/events/${runId} returned ${res.status}`);
  const json = (await res.json()) as { ok: boolean; events: AttributionEvent[] };
  return json.events ?? [];
}


// ── Core Health + Metrics ─────────────────────────────────────────

export async function getCoreHealth(): Promise<import("./types").CoreHealth | null> {
  try {
    const res = await fetch(\/core/health, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<import("./types").CoreHealth>;
  } catch { return null; }
}

export async function getMetrics(): Promise<import("./types").MetricsSnapshot | null> {
  try {
    const res = await fetch(\/core/metrics, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; metrics: import("./types").MetricsSnapshot };
    return json.metrics ?? null;
  } catch { return null; }
}

// ── System Events ─────────────────────────────────────────────────

export async function getSystemEvents(params?: {
  category?: string;
  runId?: string;
  tenantId?: string;
  limit?: number;
}): Promise<import("./types").SystemEvent[]> {
  try {
    const url = new URL(\/core/events);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.runId) url.searchParams.set("runId", params.runId);
    if (params?.tenantId) url.searchParams.set("tenantId", params.tenantId);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; events: import("./types").SystemEvent[] };
    return json.events ?? [];
  } catch { return []; }
}

// ── Cache ─────────────────────────────────────────────────────────

export async function getCacheEntries(
  namespace: import("./types").CacheNamespace,
  tenantId?: string,
): Promise<import("./types").CacheEntryMeta[]> {
  try {
    const url = new URL(\/cache/\);
    if (tenantId) url.searchParams.set("tenantId", tenantId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: import("./types").CacheEntryMeta[] };
    return json.data ?? [];
  } catch { return []; }
}

export async function getCacheAuditLog(params?: {
  namespace?: string;
  limit?: number;
}): Promise<import("./types").CacheAuditEvent[]> {
  try {
    const url = new URL(\/cache/audit);
    if (params?.namespace) url.searchParams.set("namespace", params.namespace);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; events: import("./types").CacheAuditEvent[] };
    return json.events ?? [];
  } catch { return []; }
}

// ── BEL v4 DAG ───────────────────────────────────────────────────

export async function getDagRuns(params?: {
  status?: string;
  tenantId?: string;
  limit?: number;
}): Promise<import("./types").BelDagRunState[]> {
  try {
    const url = new URL(\/dag/runs);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.tenantId) url.searchParams.set("tenantId", params.tenantId);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: import("./types").BelDagRunState[] };
    return json.data ?? [];
  } catch { return []; }
}

export async function getDagRun(runId: string): Promise<import("./types").BelDagRunState | null> {
  try {
    const res = await fetch(
      \/dag/runs/\,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; data: import("./types").BelDagRunState };
    return json.data ?? null;
  } catch { return null; }
}

export async function getDagAudit(runId: string, limit?: number): Promise<import("./types").BelDagAuditEvent[]> {
  try {
    const url = new URL(\/dag/runs/\/audit);
    if (limit) url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; events: import("./types").BelDagAuditEvent[] };
    return json.events ?? [];
  } catch { return []; }
}

// ── Retrieval ─────────────────────────────────────────────────────

export async function getRetrievalDocs(params?: {
  namespace?: string;
  tenantId?: string;
  limit?: number;
}): Promise<import("./types").RetrievalDocument[]> {
  try {
    const url = new URL(\/retrieval/documents);
    if (params?.namespace) url.searchParams.set("namespace", params.namespace);
    if (params?.tenantId) url.searchParams.set("tenantId", params.tenantId);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: import("./types").RetrievalDocument[] };
    return json.data ?? [];
  } catch { return []; }
}

export async function getRetrievalTraces(params?: {
  tenantId?: string;
  runId?: string;
  limit?: number;
}): Promise<import("./types").RetrievalTrace[]> {
  try {
    const url = new URL(\/retrieval/traces);
    if (params?.tenantId) url.searchParams.set("tenantId", params.tenantId);
    if (params?.runId) url.searchParams.set("runId", params.runId);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: import("./types").RetrievalTrace[] };
    return json.data ?? [];
  } catch { return []; }
}

// ── Decision Engine ───────────────────────────────────────────────

export async function getMapEvaluations(limit?: number): Promise<import("./types").MapEvaluation[]> {
  try {
    const url = new URL(\/decision/map/evaluations);
    if (limit) url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: import("./types").MapEvaluation[] };
    return json.data ?? [];
  } catch { return []; }
}

export async function getCeraCycles(limit?: number): Promise<import("./types").CeraCycle[]> {
  try {
    const url = new URL(\/decision/cera/cycles);
    if (limit) url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: import("./types").CeraCycle[] };
    return json.data ?? [];
  } catch { return []; }
}

// ── Connectors (L3) ───────────────────────────────────────────────

export async function getConnectors(): Promise<OSConnector[]> {
  try {
    const res = await fetch(`${HERMES_API_URL}/connectors`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { ok: boolean; data: OSConnector[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function enableConnectorApi(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(
      `${PUBLIC_HERMES_API_URL}/connectors/${encodeURIComponent(id)}/enable`,
      { method: "POST" },
    );
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function disableConnectorApi(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(
      `${PUBLIC_HERMES_API_URL}/connectors/${encodeURIComponent(id)}/disable`,
      { method: "POST" },
    );
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

// ── Normalized Entities (L5) ──────────────────────────────────────

export async function getEntityList(
  entityType: NormalizedEntityType,
  options?: { tenantId?: string; limit?: number },
): Promise<{ count: number; data: NormalizedEntitySummary[] }> {
  try {
    const url = new URL(`${HERMES_API_URL}/normalization/${encodeURIComponent(entityType)}`);
    if (options?.tenantId) url.searchParams.set("tenantId", options.tenantId);
    if (options?.limit) url.searchParams.set("limit", String(options.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { count: 0, data: [] };
    const json = (await res.json()) as {
      ok: boolean;
      count: number;
      data: NormalizedEntitySummary[];
    };
    return { count: json.count ?? 0, data: json.data ?? [] };
  } catch {
    return { count: 0, data: [] };
  }
}


// ── Governance policies ───────────────────────────────────────────

export async function getGovernanceBrandVoicePolicy(): Promise<unknown> {
  try {
    const res = await fetch(\/governance/brand-voice/policy, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; policy?: unknown; data?: unknown };
    return json.policy ?? json.data ?? json;
  } catch { return null; }
}

export async function getGovernanceLegalPolicy(): Promise<unknown> {
  try {
    const res = await fetch(\/governance/legal/policy, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; policy?: unknown; data?: unknown };
    return json.policy ?? json.data ?? json;
  } catch { return null; }
}

export async function getGovernanceSopPolicy(workflowType: string): Promise<unknown> {
  try {
    const res = await fetch(\/governance/sop/\, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<unknown>;
  } catch { return null; }
}

export async function getGovernanceOfferPolicy(): Promise<unknown> {
  try {
    const res = await fetch(\/governance/offer/policy, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; policy?: unknown; data?: unknown };
    return json.policy ?? json.data ?? json;
  } catch { return null; }
}
