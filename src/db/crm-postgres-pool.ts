import { Pool } from "pg";

/**
 * Live Postgres connection pool for the CRM (go-live Phase A).
 *
 * The CRM Postgres store (`src/crm/postgres-crm-store.ts`) checks out a single
 * connection per operation and runs `begin` → transaction-local
 * `set_config('app.tenant_id', …, true)` → query → `commit` on it, so a plain
 * `pg.Pool` is the correct backing object: each `pool.connect()` yields one
 * dedicated `PoolClient` for the surrounding transaction.
 *
 * The connection string is supplied by `CRM_DATABASE_URL` (Doppler-managed,
 * never committed). This module never logs the value — it is read by name only.
 */

let pool: Pool | null = null;

export class CrmDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmDatabaseConfigError";
  }
}

function isLocalHost(connectionString: string): boolean {
  return /@(?:localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
}

/**
 * Resolves the TLS setting for the pool.
 *
 * Supabase (and most managed Postgres) require TLS, but local/CI Postgres
 * does not offer it. Default: TLS on for remote hosts, off for localhost.
 * Override with `CRM_DATABASE_SSL=require|disable`.
 */
function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  const override = process.env["CRM_DATABASE_SSL"]?.trim().toLowerCase();
  if (override === "disable") return false;
  if (override === "require") return { rejectUnauthorized: false };
  return isLocalHost(connectionString) ? false : { rejectUnauthorized: false };
}

/**
 * Returns the lazily-created CRM Postgres pool.
 *
 * Throws `CrmDatabaseConfigError` (with no secret material) when
 * `CRM_DATABASE_URL` is not configured, so a missing secret fails loudly at
 * the point of use rather than silently falling back to a local store.
 */
export function getCrmPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env["CRM_DATABASE_URL"]?.trim();
  if (!connectionString) {
    throw new CrmDatabaseConfigError(
      "CRM_DATABASE_URL is not set. Provide the Supabase Postgres connection string " +
        "(Doppler-managed) before running live CRM operations.",
    );
  }

  pool = new Pool({
    connectionString,
    ssl: resolveSsl(connectionString),
    // Keep the live footprint small; CRM ops are short transactions.
    max: Number(process.env["CRM_DATABASE_POOL_MAX"] ?? "5"),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return pool;
}

/** Closes the pool (for clean CLI/script/server shutdown). Safe to call when unset. */
export async function closeCrmPool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
