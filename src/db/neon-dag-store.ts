/**
 * Neon-backed DAG Run Store.
 *
 * Replaces runtime/dag/dag-runs.json with a Postgres `dag_runs` table when
 * NEON_DATABASE_URL is configured. Falls back to the file-backed dag-store
 * implementation otherwise.
 */

import { executeNeonSql, isNeonConfigured } from "./neon-client.js";
import {
  saveDagRun as fileSaveDagRun,
  getDagRun as fileGetDagRun,
  listDagRuns as fileListDagRuns,
} from "../bel/dag/dag-store.js";
import type {
  BelDagEdge,
  BelDagEnvironment,
  BelDagNode,
  BelDagRunState,
  BelDagRunStatus,
} from "../bel/dag/dag-types.js";

const TAG = "[neon-dag-store]";
let fallbackWarned = false;

function warnFallback(): void {
  if (fallbackWarned) return;
  fallbackWarned = true;
  console.log(`${TAG} Neon not configured, using file store`);
}

interface DagRunRow {
  run_id: string;
  dag_id: string;
  tenant_id: string | null;
  name: string | null;
  status: string;
  environment: string | null;
  nodes: BelDagNode[] | string;
  edges: BelDagEdge[] | string;
  created_at: string;
  updated_at: string;
}

function parseJsonField<T>(value: T[] | string | null): T[] {
  if (value === null) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return value;
}

function rowToState(row: DagRunRow): BelDagRunState {
  const state: BelDagRunState = {
    runId: row.run_id,
    dagId: row.dag_id,
    nodes: parseJsonField<BelDagNode>(row.nodes),
    edges: parseJsonField<BelDagEdge>(row.edges),
    status: row.status as BelDagRunStatus,
    environment: (row.environment ?? "development") as BelDagEnvironment,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date(row.updated_at).toISOString(),
  };
  if (row.tenant_id !== null) state.tenantId = row.tenant_id;
  return state;
}

export async function neonSaveDagRun(state: BelDagRunState): Promise<void> {
  if (!isNeonConfigured()) {
    warnFallback();
    fileSaveDagRun(state);
    return;
  }

  const updatedAt = new Date().toISOString();
  const result = await executeNeonSql<DagRunRow>(
    `INSERT INTO dag_runs (run_id, dag_id, tenant_id, name, status, environment, nodes, edges, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
     ON CONFLICT (run_id) DO UPDATE SET
       dag_id = EXCLUDED.dag_id,
       tenant_id = EXCLUDED.tenant_id,
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       environment = EXCLUDED.environment,
       nodes = EXCLUDED.nodes,
       edges = EXCLUDED.edges,
       updated_at = EXCLUDED.updated_at`,
    [
      state.runId,
      state.dagId,
      state.tenantId ?? null,
      null,
      state.status,
      state.environment,
      JSON.stringify(state.nodes),
      JSON.stringify(state.edges),
      state.createdAt,
      updatedAt,
    ],
  );
  if (!result.ok) {
    console.warn(`${TAG} save failed (${result.error}); DAG run not persisted`);
  }
}

export async function neonGetDagRun(runId: string): Promise<BelDagRunState | null> {
  if (!isNeonConfigured()) {
    warnFallback();
    return fileGetDagRun(runId) ?? null;
  }

  const result = await executeNeonSql<DagRunRow>(
    `SELECT run_id, dag_id, tenant_id, name, status, environment, nodes, edges, created_at, updated_at
     FROM dag_runs WHERE run_id = $1`,
    [runId],
  );
  if (!result.ok || !result.data || result.data.length === 0) return null;
  return rowToState(result.data[0]!);
}

export interface NeonDagRunFilter {
  status?: BelDagRunStatus;
  tenantId?: string;
  limit?: number;
}

export async function neonListDagRuns(
  filter?: NeonDagRunFilter,
): Promise<BelDagRunState[]> {
  if (!isNeonConfigured()) {
    warnFallback();
    return fileListDagRuns(filter);
  }

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter?.status !== undefined) {
    params.push(filter.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filter?.tenantId !== undefined) {
    params.push(filter.tenantId);
    clauses.push(`tenant_id = $${params.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  let sql = `SELECT run_id, dag_id, tenant_id, name, status, environment, nodes, edges, created_at, updated_at
             FROM dag_runs ${where} ORDER BY created_at DESC`;
  if (filter?.limit !== undefined) {
    params.push(filter.limit);
    sql += ` LIMIT $${params.length}`;
  }

  const result = await executeNeonSql<DagRunRow>(sql, params);
  if (!result.ok || !result.data) return [];
  return result.data.map(rowToState);
}
