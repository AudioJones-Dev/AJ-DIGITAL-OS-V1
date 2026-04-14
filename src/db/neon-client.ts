/**
 * Neon Client — Execution Data Layer
 *
 * Fetch-based SQL client for Neon's serverless HTTP endpoint.
 * No native pg driver required — runs anywhere with fetch().
 *
 * Manages: runs, steps, observations, failures, patterns
 *
 * Requires env:
 *   NEON_DATABASE_URL — postgres://user:pass@host/dbname?sslmode=require
 *
 * Connection string is parsed to extract host + auth for HTTP queries.
 */

import type {
  DbRun,
  DbStep,
  DbObservation,
  DbFailure,
  DbPattern,
  InsertRun,
  InsertStep,
  InsertObservation,
  InsertFailure,
  InsertPattern,
  QueryResult,
} from "./db-types.js";

// ── Configuration ──────────────────────────────────────────────────

export interface NeonConfig {
  /** Full Neon connection string. */
  databaseUrl: string;
}

interface ParsedNeon {
  host: string;
  password: string;
}

function resolveConfig(override?: Partial<NeonConfig>): NeonConfig {
  return {
    databaseUrl: override?.databaseUrl ?? process.env.NEON_DATABASE_URL?.trim() ?? "",
  };
}

function isConfigured(cfg: NeonConfig): boolean {
  return cfg.databaseUrl.length > 0;
}

function parseConnectionString(url: string): ParsedNeon | null {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

// ── SQL Executor ───────────────────────────────────────────────────

export interface NeonQueryResponse {
  fields: Array<{ name: string }>;
  rows: unknown[][];
}

/**
 * Execute a parameterised SQL query against Neon's HTTP endpoint.
 *
 * Uses Neon's serverless SQL-over-HTTP API:
 *   POST https://{host}/sql
 *   Authorization: Bearer {password}
 */
async function neonQuery<T>(
  cfg: NeonConfig,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T[]>> {
  const parsed = parseConnectionString(cfg.databaseUrl);
  if (!parsed) {
    return { ok: false, data: null, error: "Invalid NEON_DATABASE_URL", count: null };
  }

  const endpoint = `https://${parsed.host}/sql`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Neon-Connection-String": cfg.databaseUrl,
      },
      body: JSON.stringify({ query: sql, params }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, data: null, error: `Neon ${res.status}: ${body.slice(0, 300)}`, count: null };
    }

    const result = (await res.json()) as NeonQueryResponse;
    const fields = result.fields.map((f) => f.name);

    // Convert row arrays to objects
    const rows = result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < fields.length; i++) {
        obj[fields[i]!] = row[i];
      }
      return obj as T;
    });

    return { ok: true, data: rows, error: null, count: rows.length };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err), count: null };
  }
}

/** Execute a single-row insert and return the inserted row. */
async function neonInsert<T>(
  cfg: NeonConfig,
  sql: string,
  params: unknown[],
): Promise<QueryResult<T>> {
  const result = await neonQuery<T>(cfg, sql, params);
  return {
    ok: result.ok,
    data: result.data?.[0] ?? null,
    error: result.error,
    count: result.count,
  };
}

// ── Run Operations ─────────────────────────────────────────────────

export async function createRun(
  run: InsertRun,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbRun>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonInsert<DbRun>(cfg,
    `INSERT INTO runs (run_ref, mission_type, objective, input_payload, status, ok, summary, error, roles_used, escalation_count, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      run.run_ref, run.mission_type, run.objective,
      JSON.stringify(run.input_payload), run.status,
      run.ok, run.summary, run.error,
      run.roles_used, run.escalation_count, run.duration_ms,
    ],
  );
}

export async function completeRun(
  runRef: string,
  update: { status: "completed" | "failed"; ok: boolean; summary: string | null; error: string | null; roles_used: string[]; escalation_count: number; duration_ms: number },
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbRun>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonInsert<DbRun>(cfg,
    `UPDATE runs SET status = $1, ok = $2, summary = $3, error = $4, roles_used = $5, escalation_count = $6, duration_ms = $7, completed_at = now()
     WHERE run_ref = $8 RETURNING *`,
    [update.status, update.ok, update.summary, update.error, update.roles_used, update.escalation_count, update.duration_ms, runRef],
  );
}

export async function getRun(
  runRef: string,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbRun>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  const result = await neonQuery<DbRun>(cfg, `SELECT * FROM runs WHERE run_ref = $1`, [runRef]);
  return { ok: result.ok, data: result.data?.[0] ?? null, error: result.error, count: result.count };
}

// ── Step Operations ────────────────────────────────────────────────

export async function insertStep(
  step: InsertStep,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbStep>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonInsert<DbStep>(cfg,
    `INSERT INTO steps (run_id, step_index, role, pipeline_id, ok, input_snapshot, output_snapshot, error, duration_ms, retries, warnings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      step.run_id, step.step_index, step.role, step.pipeline_id,
      step.ok, JSON.stringify(step.input_snapshot), JSON.stringify(step.output_snapshot),
      step.error, step.duration_ms, step.retries, step.warnings,
    ],
  );
}

export async function getStepsByRun(
  runId: number,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbStep[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonQuery<DbStep>(cfg, `SELECT * FROM steps WHERE run_id = $1 ORDER BY step_index`, [runId]);
}

// ── Observation Operations ─────────────────────────────────────────

export async function insertObservation(
  obs: InsertObservation,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbObservation>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonInsert<DbObservation>(cfg,
    `INSERT INTO observations (run_id, source, healthy, summary, checks, snapshot_label)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [obs.run_id, obs.source, obs.healthy, obs.summary, JSON.stringify(obs.checks), obs.snapshot_label],
  );
}

// ── Failure Operations ─────────────────────────────────────────────

export async function insertFailure(
  failure: InsertFailure,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbFailure>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonInsert<DbFailure>(cfg,
    `INSERT INTO failures (run_id, step_id, role, error, input_snapshot, stack_trace, escalated, resolved, resolution)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      failure.run_id, failure.step_id, failure.role, failure.error,
      JSON.stringify(failure.input_snapshot), failure.stack_trace,
      failure.escalated, failure.resolved, failure.resolution,
    ],
  );
}

export async function getFailuresByRun(
  runId: number,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbFailure[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonQuery<DbFailure>(cfg, `SELECT * FROM failures WHERE run_id = $1 ORDER BY created_at`, [runId]);
}

// ── Pattern Operations ─────────────────────────────────────────────

export async function insertPattern(
  pattern: InsertPattern,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbPattern>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonInsert<DbPattern>(cfg,
    `INSERT INTO patterns (run_id, pattern_type, description, context, confidence, occurrences, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      pattern.run_id, pattern.pattern_type, pattern.description,
      JSON.stringify(pattern.context), pattern.confidence,
      pattern.occurrences, pattern.last_seen_at,
    ],
  );
}

export async function getPatterns(
  type?: string,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbPattern[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  if (type) {
    return neonQuery<DbPattern>(cfg, `SELECT * FROM patterns WHERE pattern_type = $1 ORDER BY confidence DESC`, [type]);
  }
  return neonQuery<DbPattern>(cfg, `SELECT * FROM patterns ORDER BY confidence DESC`, []);
}

// ── Run Listing ────────────────────────────────────────────────────

export async function listRuns(
  limit: number = 20,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<DbRun[]>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  return neonQuery<DbRun>(cfg, `SELECT * FROM runs ORDER BY created_at DESC LIMIT $1`, [limit]);
}

// ── Full Run Replay Data ───────────────────────────────────────────

export interface FullRunData {
  run: DbRun;
  steps: DbStep[];
  observations: DbObservation[];
  failures: DbFailure[];
}

export async function getFullRunData(
  runRef: string,
  config?: Partial<NeonConfig>,
): Promise<QueryResult<FullRunData>> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { ok: false, data: null, error: "Neon not configured", count: null };

  const runResult = await getRun(runRef, config);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, data: null, error: runResult.error ?? "Run not found", count: null };
  }

  const run = runResult.data;
  const [steps, observations, failures] = await Promise.all([
    getStepsByRun(run.id, config),
    neonQuery<DbObservation>(cfg, `SELECT * FROM observations WHERE run_id = $1 ORDER BY created_at`, [run.id]),
    getFailuresByRun(run.id, config),
  ]);

  return {
    ok: true,
    data: {
      run,
      steps: steps.data ?? [],
      observations: observations.data ?? [],
      failures: failures.data ?? [],
    },
    error: null,
    count: null,
  };
}
