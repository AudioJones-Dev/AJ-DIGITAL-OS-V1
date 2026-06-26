import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

import {
  CrmTenantContextBindingError,
  bindCrmTenantContext,
  withTenantContext,
  type CrmTenantDbClient,
} from "../../src/db/crm-tenant-context.js";
import type { CrmTenantContext } from "../../src/crm/crm-types.js";

const ADMIN_DATABASE_URL = process.env.CRM_TEST_DATABASE_URL?.trim();
const runIfDatabase = ADMIN_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "aj-client-alpha";
const TENANT_B = "aj-sandbox-demo";
const SHARED_CONTACT_ID = "contact-shared-001";
const SHARED_LEAD_ID = "lead-shared-001";
const SHARED_OPPORTUNITY_ID = "opportunity-shared-001";

interface CountRow {
  count: string;
}

interface TenantRow {
  tenant_id: string;
}

interface ContactRow extends TenantRow {
  contact_id: string;
  first_name: string | null;
}

interface LeadRow extends TenantRow {
  lead_id: string;
  status: string;
}

interface OpportunityRow extends TenantRow {
  opportunity_id: string;
  value: string | null;
}

interface DbQueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

class PgTenantClient implements CrmTenantDbClient {
  constructor(private readonly client: Client) {}

  async query<T = unknown>(text: string, values?: readonly unknown[]): Promise<DbQueryResult<T>> {
    const result = await this.client.query(text, values ? [...values] : undefined);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  }
}

interface IsolatedDatabase {
  adminUrl: string;
  appUrl: string;
  databaseName: string;
  roleName: string;
  cleanup(): Promise<void>;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function databaseUrl(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function createIsolatedDatabase(adminUrl: string): Promise<IsolatedDatabase> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const databaseName = `crm_rls_${suffix}`;
  const roleName = `crm_rls_app_${suffix}`;
  const rolePassword = `crm-rls-${suffix}-${randomUUID()}`;

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();

  try {
    await admin.query(`create database ${quoteIdentifier(databaseName)}`);
    await admin.query(
      `create role ${quoteIdentifier(roleName)} login password ${quoteLiteral(rolePassword)} nosuperuser nocreatedb nocreaterole`,
    );

    const testDbAdminUrl = databaseUrl(adminUrl, databaseName);
    const setup = new Client({ connectionString: testDbAdminUrl });
    await setup.connect();
    const migrationSql = readFileSync(
      resolve("supabase", "migrations", "20260626150000_crm_multitenant_rls.sql"),
      "utf8",
    );
    const seedSql = readFileSync(resolve("supabase", "seed.sql"), "utf8");

    try {
      await setup.query(migrationSql);
      await setup.query(seedSql);
      await setup.query(`grant connect on database ${quoteIdentifier(databaseName)} to ${quoteIdentifier(roleName)}`);
      await setup.query(`grant usage on schema public to ${quoteIdentifier(roleName)}`);
      await setup.query(`grant select, insert, update on all tables in schema public to ${quoteIdentifier(roleName)}`);
      await setup.query(`grant usage, select on all sequences in schema public to ${quoteIdentifier(roleName)}`);
      await setup.query(`grant execute on all functions in schema public to ${quoteIdentifier(roleName)}`);
    } finally {
      await setup.end();
    }

    const appUrl = new URL(testDbAdminUrl);
    appUrl.username = roleName;
    appUrl.password = rolePassword;

    return {
      adminUrl: testDbAdminUrl,
      appUrl: appUrl.toString(),
      databaseName,
      roleName,
      async cleanup(): Promise<void> {
        await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1", [databaseName]);
        await admin.query(`drop database if exists ${quoteIdentifier(databaseName)} with (force)`);
        await admin.query(`drop role if exists ${quoteIdentifier(roleName)}`);
        await admin.end();
      },
    };
  } catch (error) {
    await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1", [databaseName]);
    await admin.query(`drop database if exists ${quoteIdentifier(databaseName)} with (force)`);
    await admin.query(`drop role if exists ${quoteIdentifier(roleName)}`);
    await admin.end();
    throw error;
  }
}

function tenantContext(tenantId: string, actorType: CrmTenantContext["actorType"] = "tenant_user"): CrmTenantContext {
  return {
    tenantId,
    actorType,
    actorId: `${actorType}-${tenantId}`,
    riskLevel: "L0",
    role: actorType === "agent" ? "tenant_agent" : "tenant_admin",
    permissions: actorType === "agent" ? ["agent:tenant"] : ["crm:read", "crm:write"],
  };
}

function countFrom(result: DbQueryResult<CountRow>): number {
  return Number(result.rows[0]?.count ?? 0);
}

async function visibleTenants(client: CrmTenantDbClient, tableName: string): Promise<string[]> {
  const result = await client.query<TenantRow>(
    `select distinct tenant_id from public.${tableName} order by tenant_id`,
  );
  return result.rows.map((row) => row.tenant_id);
}

runIfDatabase("CRM live RLS isolation", () => {
  let isolated: IsolatedDatabase;
  let appClient: Client;
  let tenantDb: PgTenantClient;

  beforeAll(async () => {
    isolated = await createIsolatedDatabase(ADMIN_DATABASE_URL as string);
    appClient = new Client({ connectionString: isolated.appUrl });
    await appClient.connect();
    tenantDb = new PgTenantClient(appClient);
  }, 60_000);

  afterAll(async () => {
    await appClient?.end();
    await isolated?.cleanup();
  }, 30_000);

  it("fails closed before binding an empty tenant context", async () => {
    await expect(
      bindCrmTenantContext(tenantDb, { ...tenantContext(TENANT_A), tenantId: "" }),
    ).rejects.toBeInstanceOf(CrmTenantContextBindingError);
  });

  it("denies tenant-scoped reads when no tenant context is bound", async () => {
    const contacts = await tenantDb.query<CountRow>("select count(*)::text as count from public.crm_contacts");
    const leads = await tenantDb.query<CountRow>("select count(*)::text as count from public.crm_leads");
    const opportunities = await tenantDb.query<CountRow>("select count(*)::text as count from public.crm_opportunities");

    expect(countFrom(contacts)).toBe(0);
    expect(countFrom(leads)).toBe(0);
    expect(countFrom(opportunities)).toBe(0);
  });

  it("shows each tenant only its own CRM rows", async () => {
    await withTenantContext(tenantDb, tenantContext(TENANT_A), async (db) => {
      expect(await visibleTenants(db, "crm_contacts")).toEqual([TENANT_A]);
      expect(await visibleTenants(db, "crm_leads")).toEqual([TENANT_A]);
      expect(await visibleTenants(db, "crm_opportunities")).toEqual([TENANT_A]);
    });

    await withTenantContext(tenantDb, tenantContext(TENANT_B), async (db) => {
      expect(await visibleTenants(db, "crm_contacts")).toEqual([TENANT_B]);
      expect(await visibleTenants(db, "crm_leads")).toEqual([TENANT_B]);
      expect(await visibleTenants(db, "crm_opportunities")).toEqual([TENANT_B]);
    });
  });

  it("keeps duplicate object IDs isolated per tenant", async () => {
    await withTenantContext(tenantDb, tenantContext(TENANT_A), async (db) => {
      const contacts = await db.query<ContactRow>(
        "select tenant_id, contact_id, first_name from public.crm_contacts where contact_id = $1",
        [SHARED_CONTACT_ID],
      );
      const leads = await db.query<LeadRow>(
        "select tenant_id, lead_id, status from public.crm_leads where lead_id = $1",
        [SHARED_LEAD_ID],
      );
      const opportunities = await db.query<OpportunityRow>(
        "select tenant_id, opportunity_id, value from public.crm_opportunities where opportunity_id = $1",
        [SHARED_OPPORTUNITY_ID],
      );

      expect(contacts.rows).toMatchObject([{ tenant_id: TENANT_A, first_name: "Alex" }]);
      expect(leads.rows).toMatchObject([{ tenant_id: TENANT_A, status: "qualified" }]);
      expect(opportunities.rows).toMatchObject([{ tenant_id: TENANT_A, value: "5000" }]);
    });

    await withTenantContext(tenantDb, tenantContext(TENANT_B), async (db) => {
      const contacts = await db.query<ContactRow>(
        "select tenant_id, contact_id, first_name from public.crm_contacts where contact_id = $1",
        [SHARED_CONTACT_ID],
      );
      const leads = await db.query<LeadRow>(
        "select tenant_id, lead_id, status from public.crm_leads where lead_id = $1",
        [SHARED_LEAD_ID],
      );
      const opportunities = await db.query<OpportunityRow>(
        "select tenant_id, opportunity_id, value from public.crm_opportunities where opportunity_id = $1",
        [SHARED_OPPORTUNITY_ID],
      );

      expect(contacts.rows).toMatchObject([{ tenant_id: TENANT_B, first_name: "Sam" }]);
      expect(leads.rows).toMatchObject([{ tenant_id: TENANT_B, status: "working" }]);
      expect(opportunities.rows).toMatchObject([{ tenant_id: TENANT_B, value: "1200" }]);
    });
  });

  it("denies cross-tenant updates even when shared object IDs match", async () => {
    await withTenantContext(tenantDb, tenantContext(TENANT_A), async (db) => {
      const contactUpdate = await db.query(
        "update public.crm_contacts set first_name = 'Blocked' where tenant_id = $1 and contact_id = $2",
        [TENANT_B, SHARED_CONTACT_ID],
      );
      const leadUpdate = await db.query(
        "update public.crm_leads set status = 'converted' where tenant_id = $1 and lead_id = $2",
        [TENANT_B, SHARED_LEAD_ID],
      );
      const opportunityUpdate = await db.query(
        "update public.crm_opportunities set value = 9999 where tenant_id = $1 and opportunity_id = $2",
        [TENANT_B, SHARED_OPPORTUNITY_ID],
      );

      expect(contactUpdate.rowCount).toBe(0);
      expect(leadUpdate.rowCount).toBe(0);
      expect(opportunityUpdate.rowCount).toBe(0);
    });

    await withTenantContext(tenantDb, tenantContext(TENANT_B), async (db) => {
      const contact = await db.query<ContactRow>(
        "select tenant_id, contact_id, first_name from public.crm_contacts where contact_id = $1",
        [SHARED_CONTACT_ID],
      );
      const lead = await db.query<LeadRow>(
        "select tenant_id, lead_id, status from public.crm_leads where lead_id = $1",
        [SHARED_LEAD_ID],
      );
      const opportunity = await db.query<OpportunityRow>(
        "select tenant_id, opportunity_id, value from public.crm_opportunities where opportunity_id = $1",
        [SHARED_OPPORTUNITY_ID],
      );

      expect(contact.rows).toMatchObject([{ tenant_id: TENANT_B, first_name: "Sam" }]);
      expect(lead.rows).toMatchObject([{ tenant_id: TENANT_B, status: "working" }]);
      expect(opportunity.rows).toMatchObject([{ tenant_id: TENANT_B, value: "1200" }]);
    });
  });

  it("denies an agent scoped to tenant A from reading or writing tenant B", async () => {
    await withTenantContext(tenantDb, tenantContext(TENANT_A, "agent"), async (db) => {
      const read = await db.query<CountRow>(
        "select count(*)::text as count from public.crm_contacts where tenant_id = $1",
        [TENANT_B],
      );
      const write = await db.query(
        "update public.crm_contacts set first_name = 'AgentBlocked' where tenant_id = $1 and contact_id = $2",
        [TENANT_B, SHARED_CONTACT_ID],
      );

      expect(countFrom(read)).toBe(0);
      expect(write.rowCount).toBe(0);
    });
  });

  it("denies tenant A inserts that try to write tenant B rows", async () => {
    await expect(
      withTenantContext(tenantDb, tenantContext(TENANT_A), async (db) => {
        await db.query(
          `insert into public.crm_contacts (tenant_id, contact_id, lifecycle_stage)
           values ($1, $2, 'new')`,
          [TENANT_B, `blocked-${randomUUID()}`],
        );
      }),
    ).rejects.toThrow(/row-level security|violates/i);
  });
});
