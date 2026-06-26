import type { CrmTenantContext } from "../crm/crm-types.js";

export interface CrmTenantDbClient {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
}

export interface BindCrmTenantContextOptions {
  platformAdminMode?: boolean | undefined;
}

export class CrmTenantContextBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmTenantContextBindingError";
  }
}

function cleanRequired(value: string | null | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new CrmTenantContextBindingError(`CRM tenant DB context requires ${field}.`);
  }
  return trimmed;
}

function boolSetting(value: boolean | undefined): string {
  return value === true ? "true" : "false";
}

// node-postgres pools expose `query` (so they structurally satisfy
// CrmTenantDbClient) but dispatch each call on a different pooled connection.
// Because the tenant settings below are written with set_config(..., true)
// (transaction-local), binding on a pool would land them on one connection
// while the CRM queries run on another — silently defeating RLS isolation and
// leaving the BEGIN connection in an open transaction. A pg.Pool is identified
// by its connection counters, which a single pg.Client / PoolClient never has.
const POOL_LIKE_COUNTERS = ["totalCount", "idleCount", "waitingCount"] as const;

function assertSingleConnectionClient(client: CrmTenantDbClient): void {
  const candidate = client as unknown as Record<string, unknown>;
  const looksLikePool =
    typeof candidate.connect === "function" &&
    POOL_LIKE_COUNTERS.some((counter) => typeof candidate[counter] === "number");
  if (looksLikePool) {
    throw new CrmTenantContextBindingError(
      "CRM tenant DB context requires a single checked-out connection (pg.Client or a PoolClient from pool.connect()), not a connection pool. " +
        "Transaction-local tenant settings must run on the same connection as the CRM queries, so a pool would silently break tenant isolation.",
    );
  }
}

/**
 * Binds the CRM tenant/actor RLS settings on the given connection.
 *
 * The settings are written transaction-locally (set_config(..., true)), so
 * `client` MUST be a single checked-out connection (a pg.Client or a PoolClient
 * obtained via pool.connect()) used for the surrounding transaction and the CRM
 * queries alike. Passing a connection pool is rejected.
 */
export async function bindCrmTenantContext(
  client: CrmTenantDbClient,
  context: CrmTenantContext,
  options: BindCrmTenantContextOptions = {},
): Promise<void> {
  assertSingleConnectionClient(client);
  const tenantId = cleanRequired(context.tenantId, "tenantId");
  const actorId = cleanRequired(context.actorId, "actorId");
  const actorType = cleanRequired(context.actorType, "actorType");

  await client.query("select set_config($1, $2, true)", ["app.tenant_id", tenantId]);
  await client.query("select set_config($1, $2, true)", ["app.actor_id", actorId]);
  await client.query("select set_config($1, $2, true)", ["app.actor_type", actorType]);
  await client.query("select set_config($1, $2, true)", [
    "app.platform_admin_mode",
    boolSetting(options.platformAdminMode),
  ]);
}

/**
 * Runs `fn` inside a transaction with the CRM tenant/actor RLS context bound.
 *
 * `client` MUST be a single checked-out connection (pg.Client or a PoolClient
 * from pool.connect()): BEGIN, the transaction-local tenant settings, the
 * callback queries, and COMMIT must all run on the same connection. Passing a
 * connection pool is rejected before any statement is issued.
 */
export async function withTenantContext<T>(
  client: CrmTenantDbClient,
  context: CrmTenantContext,
  fn: (client: CrmTenantDbClient) => Promise<T>,
  options: BindCrmTenantContextOptions = {},
): Promise<T> {
  assertSingleConnectionClient(client);
  await client.query("begin");
  try {
    await bindCrmTenantContext(client, context, options);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
