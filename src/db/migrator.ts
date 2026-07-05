/**
 * Ordered, tracked SQL migration runner.
 *
 * Replaces the previous "re-run neon-os-schema.sql every time and rely on
 * IF NOT EXISTS" approach with a real migration ledger:
 *
 *   - migrations run in an explicit, documented order (MIGRATION_MANIFEST)
 *   - each file's sha256 and applied-at timestamp are recorded in a
 *     schema_migrations table
 *   - already-applied files are skipped
 *   - if a previously-applied file's content hash has changed, the run fails
 *     loudly rather than silently diverging from what's deployed
 *
 * The SQL executor is injected (SqlExecutor) so the engine is unit-testable
 * with an in-memory fake and has no hard dependency on Neon. The Neon-backed
 * executor lives in db.commands.ts.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { splitSqlStatements } from "./sql-split.js";

/**
 * Explicit ordered manifest of Neon migration files (relative to sql/).
 *
 * Ordered, not globbed: `neon-os-schema.sql` self-declares "Run with db-migrate"
 * and must land first; the numbered series builds on it (004 explicitly targets
 * the Neon data layer). `supabase-schema.sql` is deliberately excluded — it is
 * the Supabase control-DB schema, applied through Supabase's own migration path,
 * not this Neon runner.
 */
export const MIGRATION_MANIFEST: readonly string[] = [
  "neon-os-schema.sql",
  "neon-schema.sql",
  "002-saas-onboarding.sql",
  "003-moat-signals.sql",
  "004-patterns-upgrade.sql",
  "005-distribution-routing.sql",
];

export interface SqlExecResult {
  ok: boolean;
  rows: Array<Record<string, unknown>>;
  error?: string;
}

/** Execute one SQL statement with optional positional params. */
export type SqlExecutor = (sql: string, params?: unknown[]) => Promise<SqlExecResult>;

export interface MigrationFileResult {
  name: string;
  status: "applied" | "skipped" | "failed";
  statementsRun?: number;
  error?: string;
}

export interface MigrateResult {
  ok: boolean;
  files: MigrationFileResult[];
  applied: number;
  skipped: number;
  error?: string;
}

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`.trim();

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface MigrateOptions {
  /** Directory holding the SQL files. Defaults to <cwd>/sql. */
  sqlDir?: string;
  /** Override the manifest (used by tests). */
  manifest?: readonly string[];
}

/**
 * Apply all pending migrations in manifest order. Idempotent: a second run with
 * unchanged files applies nothing and reports every file as "skipped".
 */
export async function runMigrations(
  exec: SqlExecutor,
  options: MigrateOptions = {},
): Promise<MigrateResult> {
  const sqlDir = options.sqlDir ?? join(process.cwd(), "sql");
  const manifest = options.manifest ?? MIGRATION_MANIFEST;
  const files: MigrationFileResult[] = [];

  // 1. Ensure the ledger exists.
  const ledger = await exec(LEDGER_DDL);
  if (!ledger.ok) {
    return {
      ok: false,
      files,
      applied: 0,
      skipped: 0,
      error: `Failed to create schema_migrations ledger: ${ledger.error ?? "unknown"}`,
    };
  }

  // 2. Load applied migrations (name -> hash).
  const appliedRes = await exec("SELECT name, hash FROM schema_migrations");
  if (!appliedRes.ok) {
    return {
      ok: false,
      files,
      applied: 0,
      skipped: 0,
      error: `Failed to read schema_migrations: ${appliedRes.error ?? "unknown"}`,
    };
  }
  const appliedHashes = new Map<string, string>();
  for (const row of appliedRes.rows) {
    appliedHashes.set(String(row.name), String(row.hash));
  }

  let applied = 0;
  let skipped = 0;

  for (const name of manifest) {
    const path = join(sqlDir, name);
    if (!existsSync(path)) {
      files.push({ name, status: "failed", error: `file not found: ${path}` });
      return {
        ok: false,
        files,
        applied,
        skipped,
        error: `Migration file missing: ${basename(path)}`,
      };
    }

    const contents = readFileSync(path, "utf8");
    const hash = sha256(contents);
    const priorHash = appliedHashes.get(name);

    if (priorHash !== undefined) {
      if (priorHash !== hash) {
        files.push({
          name,
          status: "failed",
          error: "content hash changed since it was applied — edit forbidden; add a new migration instead",
        });
        return {
          ok: false,
          files,
          applied,
          skipped,
          error: `Applied migration ${name} was modified after the fact`,
        };
      }
      files.push({ name, status: "skipped" });
      skipped += 1;
      continue;
    }

    // 3. Apply each statement in the file.
    const statements = splitSqlStatements(contents);
    let ran = 0;
    for (const statement of statements) {
      const result = await exec(statement);
      if (!result.ok) {
        files.push({ name, status: "failed", statementsRun: ran, ...(result.error ? { error: result.error } : {}) });
        return {
          ok: false,
          files,
          applied,
          skipped,
          error: `Migration ${name} failed at statement ${ran + 1}: ${result.error ?? "unknown"}`,
        };
      }
      ran += 1;
    }

    // 4. Record it in the ledger.
    const record = await exec(
      "INSERT INTO schema_migrations (name, hash) VALUES ($1, $2)",
      [name, hash],
    );
    if (!record.ok) {
      files.push({ name, status: "failed", statementsRun: ran, ...(record.error ? { error: record.error } : {}) });
      return {
        ok: false,
        files,
        applied,
        skipped,
        error: `Migration ${name} applied but ledger insert failed: ${record.error ?? "unknown"}`,
      };
    }

    files.push({ name, status: "applied", statementsRun: ran });
    applied += 1;
  }

  return { ok: true, files, applied, skipped };
}
