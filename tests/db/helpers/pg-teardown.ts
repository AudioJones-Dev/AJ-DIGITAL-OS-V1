import type { Client, Pool } from "pg";

/**
 * Postgres/socket error codes that only ever mean "this connection went away
 * while we were shutting it down". They are expected during teardown and must
 * not fail an otherwise green suite. Anything outside this set is a real
 * defect and is deliberately left to surface.
 */
const SHUTDOWN_ERROR_CODES = new Set([
  "57P01", // admin_shutdown - terminated by pg_terminate_backend / drop ... with (force)
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now - server shutting down
  "ECONNRESET",
  "EPIPE",
]);

const SHUTDOWN_ERROR_PATTERN =
  /terminating connection|connection terminated|server closed the connection|database .* is being accessed/i;

export function isShutdownError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException & { code?: string }).code;
  if (typeof code === "string" && SHUTDOWN_ERROR_CODES.has(code)) {
    return true;
  }
  return SHUTDOWN_ERROR_PATTERN.test(error.message);
}

/**
 * `pg` Client and Pool emit 'error' for asynchronous server-side failures. An
 * 'error' event with no listener is rethrown by EventEmitter as an uncaught
 * exception, which Vitest reports as a failed run even when every test passed.
 *
 * This attaches a listener so a connection torn down during teardown cannot do
 * that. Non-shutdown errors are collected and returned by the reporter so the
 * caller can still assert on them.
 */
export function guardConnectionErrors(emitter: Client | Pool): () => Error[] {
  const unexpected: Error[] = [];
  emitter.on("error", (error: Error) => {
    if (!isShutdownError(error)) {
      unexpected.push(error);
    }
  });
  return () => [...unexpected];
}

/** Await `.end()`, absorbing only shutdown-class failures. */
export async function endQuietly(resource: Client | Pool | undefined): Promise<void> {
  if (!resource) {
    return;
  }
  try {
    await resource.end();
  } catch (error) {
    if (!isShutdownError(error)) {
      throw error;
    }
  }
}

interface BackendCountRow {
  count: string;
}

/**
 * Poll until Postgres reports no remaining backends on `databaseName`.
 *
 * `pool.end()` / `client.end()` resolve when the *client* socket closes; the
 * server-side backend can still be alive and listed in pg_stat_activity for a
 * short window afterwards. Dropping the database in that window is what
 * generates the 57P01 race. Waiting for the backends to actually exit closes
 * the window instead of racing it.
 *
 * Returns true if the database drained, false if it timed out (caller then
 * falls back to forcing).
 */
export async function waitForBackendsToExit(
  admin: Client,
  databaseName: string,
  timeoutMs = 5_000,
  pollIntervalMs = 50,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const result = await admin.query<BackendCountRow>(
      `select count(*)::text as count
         from pg_stat_activity
        where datname = $1
          and pid <> pg_backend_pid()`,
      [databaseName],
    );

    if (Number(result.rows[0]?.count ?? 0) === 0) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/**
 * Deterministically drop a per-test database and its role.
 *
 * Order matters: drain first, force-terminate only as a bounded fallback, then
 * drop. `drop database ... with (force)` terminates any straggler itself, so
 * the happy path never calls pg_terminate_backend at all.
 */
export async function dropIsolatedDatabase(
  admin: Client,
  databaseName: string,
  roleName: string,
  quoteIdentifier: (value: string) => string,
): Promise<void> {
  const drained = await waitForBackendsToExit(admin, databaseName);

  if (!drained) {
    await admin.query(
      `select pg_terminate_backend(pid)
         from pg_stat_activity
        where datname = $1
          and pid <> pg_backend_pid()`,
      [databaseName],
    );
  }

  await admin.query(`drop database if exists ${quoteIdentifier(databaseName)} with (force)`);
  await admin.query(`drop role if exists ${quoteIdentifier(roleName)}`);
}
