/**
 * Neon-backed Run Control Store.
 *
 * Replaces runtime/control-runs.json with a Postgres `control_runs` table
 * when NEON_DATABASE_URL is configured. Falls back to the file-backed
 * implementation in src/control-plane/run-registry/run-control-store.ts
 * when Neon is not available, so local development and tests keep working
 * without a live database.
 */

import { executeNeonSql, isNeonConfigured } from "./neon-client.js";
import {
  createControlRun as fileCreateControlRun,
  getControlRun as fileGetControlRun,
  listControlRuns as fileListControlRuns,
  updateControlState as fileUpdateControlState,
} from "../control-plane/run-registry/run-control-store.js";
import type {
  ControlRunRecord,
  RunControlState,
} from "../control-plane/run-registry/run-control-types.js";

const TAG = "[neon-run-store]";
let fallbackWarned = false;

function warnFallback(): void {
  if (fallbackWarned) return;
  fallbackWarned = true;
  console.log(`${TAG} Neon not configured, using file store`);
}

interface ControlRunRow {
  run_id: string;
  agent_id: string;
  control_state: string;
  previous_state: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  cancelled_by: string | null;
  metadata: Record<string, unknown> | null;
}

function rowToRecord(row: ControlRunRow): ControlRunRecord {
  const record: ControlRunRecord = {
    runId: row.run_id,
    agentId: row.agent_id,
    controlState: row.control_state as RunControlState,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date(row.updated_at).toISOString(),
  };
  if (row.previous_state !== null) record.previousState = row.previous_state as RunControlState;
  if (row.approved_by !== null) record.approvedBy = row.approved_by;
  if (row.cancelled_by !== null) record.cancelledBy = row.cancelled_by;
  if (row.metadata !== null) record.metadata = row.metadata;
  return record;
}

export async function neonSaveControlRun(record: ControlRunRecord): Promise<void> {
  if (!isNeonConfigured()) {
    warnFallback();
    const existing = fileGetControlRun(record.runId);
    if (!existing) {
      fileCreateControlRun(record.runId, record.agentId);
    }
    if (existing && existing.controlState !== record.controlState) {
      fileUpdateControlState(record.runId, record.controlState, record.metadata);
    } else if (!existing && record.controlState !== "queued") {
      fileUpdateControlState(record.runId, record.controlState, record.metadata);
    }
    return;
  }

  const result = await executeNeonSql<ControlRunRow>(
    `INSERT INTO control_runs (run_id, agent_id, control_state, previous_state, created_at, updated_at, approved_by, cancelled_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (run_id) DO UPDATE SET
       agent_id = EXCLUDED.agent_id,
       control_state = EXCLUDED.control_state,
       previous_state = EXCLUDED.previous_state,
       updated_at = EXCLUDED.updated_at,
       approved_by = EXCLUDED.approved_by,
       cancelled_by = EXCLUDED.cancelled_by,
       metadata = EXCLUDED.metadata`,
    [
      record.runId,
      record.agentId,
      record.controlState,
      record.previousState ?? null,
      record.createdAt,
      record.updatedAt,
      record.approvedBy ?? null,
      record.cancelledBy ?? null,
      record.metadata ? JSON.stringify(record.metadata) : null,
    ],
  );
  if (!result.ok) {
    console.warn(`${TAG} save failed (${result.error}); leaving record unsaved`);
  }
}

export async function neonGetControlRun(runId: string): Promise<ControlRunRecord | null> {
  if (!isNeonConfigured()) {
    warnFallback();
    return fileGetControlRun(runId) ?? null;
  }

  const result = await executeNeonSql<ControlRunRow>(
    `SELECT run_id, agent_id, control_state, previous_state, created_at, updated_at, approved_by, cancelled_by, metadata
     FROM control_runs WHERE run_id = $1`,
    [runId],
  );
  if (!result.ok || !result.data || result.data.length === 0) return null;
  return rowToRecord(result.data[0]!);
}

export interface NeonControlRunFilter {
  agentId?: string;
  state?: RunControlState;
  limit?: number;
}

export async function neonListControlRuns(
  filter?: NeonControlRunFilter,
): Promise<ControlRunRecord[]> {
  if (!isNeonConfigured()) {
    warnFallback();
    return fileListControlRuns(filter);
  }

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter?.agentId !== undefined) {
    params.push(filter.agentId);
    clauses.push(`agent_id = $${params.length}`);
  }
  if (filter?.state !== undefined) {
    params.push(filter.state);
    clauses.push(`control_state = $${params.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  let sql = `SELECT run_id, agent_id, control_state, previous_state, created_at, updated_at, approved_by, cancelled_by, metadata
             FROM control_runs ${where} ORDER BY created_at DESC`;
  if (filter?.limit !== undefined) {
    params.push(filter.limit);
    sql += ` LIMIT $${params.length}`;
  }

  const result = await executeNeonSql<ControlRunRow>(sql, params);
  if (!result.ok || !result.data) return [];
  return result.data.map(rowToRecord);
}

export async function neonUpdateControlState(
  runId: string,
  newState: RunControlState,
  meta?: Record<string, unknown>,
): Promise<ControlRunRecord> {
  if (!isNeonConfigured()) {
    warnFallback();
    return fileUpdateControlState(runId, newState, meta);
  }

  const existing = await neonGetControlRun(runId);
  if (!existing) throw new Error(`Run not found: ${runId}`);

  const now = new Date().toISOString();
  const mergedMeta = meta !== undefined ? { ...existing.metadata, ...meta } : existing.metadata;
  const approvedBy = meta?.["approvedBy"] !== undefined ? String(meta["approvedBy"]) : existing.approvedBy ?? null;
  const cancelledBy = meta?.["cancelledBy"] !== undefined ? String(meta["cancelledBy"]) : existing.cancelledBy ?? null;

  const result = await executeNeonSql<ControlRunRow>(
    `UPDATE control_runs
     SET control_state = $1, previous_state = $2, updated_at = $3,
         approved_by = $4, cancelled_by = $5, metadata = $6
     WHERE run_id = $7
     RETURNING run_id, agent_id, control_state, previous_state, created_at, updated_at, approved_by, cancelled_by, metadata`,
    [
      newState,
      existing.controlState,
      now,
      approvedBy,
      cancelledBy,
      mergedMeta ? JSON.stringify(mergedMeta) : null,
      runId,
    ],
  );

  if (!result.ok || !result.data || result.data.length === 0) {
    throw new Error(`Failed to update control state: ${result.error ?? "no row returned"}`);
  }
  return rowToRecord(result.data[0]!);
}
