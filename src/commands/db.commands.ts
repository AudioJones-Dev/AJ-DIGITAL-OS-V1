/**
 * Operating Schema — Database CLI commands.
 *
 * - db-migrate: applies sql/neon-os-schema.sql to the configured Neon database
 * - db-status:  shows connection status and table counts
 * - db-health:  pings Neon and returns latency
 */

import { checkNeonConnection, executeNeonSql, isNeonConfigured } from "../db/neon-client.js";
import { runMigrations, type SqlExecutor } from "../db/migrator.js";

interface BaseInput {
  json?: boolean;
}

interface BaseResult {
  ok: boolean;
  error?: string;
}

function emitJson(input: BaseInput, payload: unknown): void {
  if (input.json) console.log(JSON.stringify(payload, null, 2));
}

const TRACKED_TABLES = ["control_runs", "approvals", "dag_runs"] as const;
type TrackedTable = (typeof TRACKED_TABLES)[number];

// ── db-migrate ──────────────────────────────────────────────────────────

export interface DbMigrateCommandInput extends BaseInput {}
export interface DbMigrateCommandResult extends BaseResult {
  applied: number;
  skipped: number;
  files?: Array<{ name: string; status: string; error?: string }>;
}

/** Neon-backed executor for the migration engine. */
const neonExecutor: SqlExecutor = async (sql, params = []) => {
  const res = await executeNeonSql<Record<string, unknown>>(sql, params);
  return {
    ok: res.ok,
    rows: res.data ?? [],
    ...(res.error ? { error: res.error } : {}),
  };
};

export class DbMigrateCommand {
  async run(input: DbMigrateCommandInput): Promise<DbMigrateCommandResult> {
    if (!isNeonConfigured()) {
      const result: DbMigrateCommandResult = {
        ok: false,
        applied: 0,
        skipped: 0,
        error: "NEON_DATABASE_URL is not set",
      };
      if (input.json) emitJson(input, result);
      else console.error(`db-migrate: NEON_DATABASE_URL is not set`);
      return result;
    }

    const outcome = await runMigrations(neonExecutor);
    const result: DbMigrateCommandResult = {
      ok: outcome.ok,
      applied: outcome.applied,
      skipped: outcome.skipped,
      files: outcome.files.map((f) => ({
        name: f.name,
        status: f.status,
        ...(f.error ? { error: f.error } : {}),
      })),
      ...(outcome.error ? { error: outcome.error } : {}),
    };

    if (input.json) {
      emitJson(input, result);
    } else if (outcome.ok) {
      console.log(`db-migrate: ${outcome.applied} applied, ${outcome.skipped} skipped`);
      for (const f of outcome.files) console.log(`  ${f.status.padEnd(8)} ${f.name}`);
    } else {
      console.error(`db-migrate: FAILED — ${outcome.error}`);
      for (const f of outcome.files) {
        const suffix = f.error ? ` — ${f.error}` : "";
        console.error(`  ${f.status.padEnd(8)} ${f.name}${suffix}`);
      }
    }
    return result;
  }
}

// ── db-status ───────────────────────────────────────────────────────────

export interface DbStatusCommandInput extends BaseInput {}
export interface DbStatusCommandResult extends BaseResult {
  connected: boolean;
  tables?: Record<string, number>;
  latencyMs?: number;
}

export async function getDbStatus(): Promise<{
  connected: boolean;
  tables?: Record<string, number>;
  latencyMs?: number;
  error?: string;
}> {
  if (!isNeonConfigured()) {
    return { connected: false, error: "NEON_DATABASE_URL is not set" };
  }

  const conn = await checkNeonConnection();
  if (!conn.ok) {
    const out: { connected: boolean; latencyMs: number; error: string } = {
      connected: false,
      latencyMs: conn.latencyMs,
      error: conn.error ?? "connection failed",
    };
    return out;
  }

  const tables: Record<string, number> = {};
  for (const table of TRACKED_TABLES) {
    const result = await executeNeonSql<{ count: string | number }>(
      `SELECT COUNT(*)::int AS count FROM ${table}`,
      [],
    );
    if (result.ok && result.data && result.data.length > 0) {
      const raw = result.data[0]!.count;
      tables[table] = typeof raw === "number" ? raw : parseInt(raw, 10);
    } else {
      tables[table] = -1;
    }
  }

  return { connected: true, tables, latencyMs: conn.latencyMs };
}

export class DbStatusCommand {
  async run(input: DbStatusCommandInput): Promise<DbStatusCommandResult> {
    const status = await getDbStatus();
    const result: DbStatusCommandResult = {
      ok: status.connected,
      connected: status.connected,
      ...(status.tables ? { tables: status.tables } : {}),
      ...(status.latencyMs !== undefined ? { latencyMs: status.latencyMs } : {}),
      ...(status.error ? { error: status.error } : {}),
    };

    if (input.json) {
      emitJson(input, result);
    } else if (status.connected) {
      console.log(`db-status: connected (${status.latencyMs}ms)`);
      for (const [table, count] of Object.entries(status.tables ?? {})) {
        const display = count === -1 ? "?" : String(count);
        console.log(`  ${table.padEnd(16)} ${display}`);
      }
    } else {
      console.log(`db-status: not connected — ${status.error ?? "unknown"}`);
    }

    return result;
  }
}

// ── db-health ───────────────────────────────────────────────────────────

export interface DbHealthCommandInput extends BaseInput {}
export interface DbHealthCommandResult extends BaseResult {
  connected: boolean;
  latencyMs: number;
}

export class DbHealthCommand {
  async run(input: DbHealthCommandInput): Promise<DbHealthCommandResult> {
    if (!isNeonConfigured()) {
      const result: DbHealthCommandResult = {
        ok: false,
        connected: false,
        latencyMs: 0,
        error: "NEON_DATABASE_URL is not set",
      };
      if (input.json) emitJson(input, result);
      else console.log(`db-health: NEON_DATABASE_URL is not set`);
      return result;
    }

    const conn = await checkNeonConnection();
    const result: DbHealthCommandResult = {
      ok: conn.ok,
      connected: conn.ok,
      latencyMs: conn.latencyMs,
      ...(conn.error ? { error: conn.error } : {}),
    };

    if (input.json) {
      emitJson(input, result);
    } else if (conn.ok) {
      console.log(`db-health: ok (${conn.latencyMs}ms)`);
    } else {
      console.log(`db-health: failed — ${conn.error}`);
    }
    return result;
  }
}
