import type { Run, Step, Observation, Failure, HermesStatus, BelCapabilities, FullRunData } from "./types";

const HERMES_API_URL = process.env.HERMES_API_URL ?? "http://localhost:3001";
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
