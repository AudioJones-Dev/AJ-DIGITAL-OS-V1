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

export async function bindCrmTenantContext(
  client: CrmTenantDbClient,
  context: CrmTenantContext,
  options: BindCrmTenantContextOptions = {},
): Promise<void> {
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

export async function withTenantContext<T>(
  client: CrmTenantDbClient,
  context: CrmTenantContext,
  fn: (client: CrmTenantDbClient) => Promise<T>,
  options: BindCrmTenantContextOptions = {},
): Promise<T> {
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
