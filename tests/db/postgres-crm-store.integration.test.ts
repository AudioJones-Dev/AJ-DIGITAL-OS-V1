import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";

import {
  CrmDuplicateRecordError,
  CrmStoreValidationError,
  PostgresCrmStore,
  type CrmContact,
  type CrmLead,
  type CrmOpportunity,
  type CrmTenantContext,
} from "../../src/crm/index.js";

const ADMIN_DATABASE_URL = process.env.CRM_TEST_DATABASE_URL?.trim();
const runIfDatabase = ADMIN_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "aj-client-alpha";
const TENANT_B = "aj-sandbox-demo";
const NOW = "2026-06-26T00:00:00.000Z";

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
  const databaseName = `crm_store_${suffix}`;
  const roleName = `crm_store_app_${suffix}`;
  const rolePassword = `crm-store-${suffix}-${randomUUID()}`;

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

    try {
      await setup.query(
        readFileSync(resolve("supabase", "migrations", "20260626150000_crm_multitenant_rls.sql"), "utf8"),
      );
      await setup.query(readFileSync(resolve("supabase", "seed.sql"), "utf8"));
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

function tenantContext(tenantId: string): CrmTenantContext {
  return {
    tenantId,
    actorType: "tenant_user",
    actorId: `owner-${tenantId}`,
    riskLevel: "L0",
    role: "tenant_admin",
    permissions: ["crm:read", "crm:write"],
  };
}

function contact(tenantId: string, contactId = "p2c-contact-shared"): CrmContact {
  return {
    tenantId,
    contactId,
    firstName: tenantId === TENANT_A ? "Avery" : "Blake",
    email: `${contactId}-${tenantId}@example.test`,
    lifecycleStage: "lead",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function lead(tenantId: string, leadId = "p2c-lead-shared"): CrmLead {
  return {
    tenantId,
    leadId,
    status: tenantId === TENANT_A ? "new" : "working",
    source: "p2c-test",
    score: tenantId === TENANT_A ? 60 : 70,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function opportunity(tenantId: string, opportunityId = "p2c-opportunity-shared"): CrmOpportunity {
  return {
    tenantId,
    opportunityId,
    pipelineId: "pipeline-main",
    stageId: "stage-new",
    value: tenantId === TENANT_A ? 1500 : 2500,
    currency: "USD",
    status: "open",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

runIfDatabase("PostgresCrmStore live DB parity", () => {
  let isolated: IsolatedDatabase;
  let pool: Pool;
  let store: PostgresCrmStore;

  beforeAll(async () => {
    isolated = await createIsolatedDatabase(ADMIN_DATABASE_URL as string);
    pool = new Pool({ connectionString: isolated.appUrl, max: 2 });
    store = new PostgresCrmStore(pool);
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    await isolated?.cleanup();
  }, 30_000);

  it("creates, reads, lists, and updates contacts without cross-tenant leakage", async () => {
    const tenantA = tenantContext(TENANT_A);
    const tenantB = tenantContext(TENANT_B);

    await store.createContact(tenantA, contact(TENANT_A));
    await store.createContact(tenantB, contact(TENANT_B));

    expect((await store.getContact(tenantA, "p2c-contact-shared"))?.firstName).toBe("Avery");
    expect((await store.getContact(tenantB, "p2c-contact-shared"))?.firstName).toBe("Blake");
    expect(await store.listContacts(tenantA)).toEqual(
      expect.arrayContaining([expect.objectContaining({ tenantId: TENANT_A, contactId: "p2c-contact-shared" })]),
    );

    const updated = await store.updateContact(tenantA, "p2c-contact-shared", {
      tenantId: TENANT_A,
      lifecycleStage: "qualified",
    });

    expect(updated.lifecycleStage).toBe("qualified");
    expect((await store.getContact(tenantB, "p2c-contact-shared"))?.lifecycleStage).toBe("lead");
  });

  it("creates, reads, lists, and updates leads by active tenant", async () => {
    const tenantA = tenantContext(TENANT_A);
    const tenantB = tenantContext(TENANT_B);

    await store.createLead(tenantA, lead(TENANT_A));
    await store.createLead(tenantB, lead(TENANT_B));

    expect((await store.getLead(tenantA, "p2c-lead-shared"))?.score).toBe(60);
    expect((await store.getLead(tenantB, "p2c-lead-shared"))?.score).toBe(70);
    expect(await store.listLeads(tenantA)).toEqual(
      expect.arrayContaining([expect.objectContaining({ tenantId: TENANT_A, leadId: "p2c-lead-shared" })]),
    );

    const updated = await store.updateLead(tenantA, "p2c-lead-shared", {
      tenantId: TENANT_A,
      status: "qualified",
    });

    expect(updated.status).toBe("qualified");
    expect((await store.getLead(tenantB, "p2c-lead-shared"))?.status).toBe("working");
  });

  it("creates, reads, lists, and updates opportunities by active tenant", async () => {
    const tenantA = tenantContext(TENANT_A);
    const tenantB = tenantContext(TENANT_B);

    await store.createOpportunity(tenantA, opportunity(TENANT_A));
    await store.createOpportunity(tenantB, opportunity(TENANT_B));

    expect((await store.getOpportunity(tenantA, "p2c-opportunity-shared"))?.value).toBe(1500);
    expect((await store.getOpportunity(tenantB, "p2c-opportunity-shared"))?.value).toBe(2500);
    expect(await store.listOpportunities(tenantA)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tenantId: TENANT_A, opportunityId: "p2c-opportunity-shared" }),
      ]),
    );

    const updated = await store.updateOpportunity(tenantA, "p2c-opportunity-shared", {
      tenantId: TENANT_A,
      stageId: "stage-won",
      status: "won",
    });

    expect(updated.status).toBe("won");
    expect((await store.getOpportunity(tenantB, "p2c-opportunity-shared"))?.status).toBe("open");
  });

  it("preserves existing PersistentCrmStore guard behavior", async () => {
    const tenantA = tenantContext(TENANT_A);

    await store.createContact(tenantA, contact(TENANT_A, "p2c-duplicate"));
    await expect(store.createContact(tenantA, contact(TENANT_A, "p2c-duplicate"))).rejects.toBeInstanceOf(
      CrmDuplicateRecordError,
    );
    await expect(store.createContact(tenantA, contact("", "p2c-invalid"))).rejects.toBeInstanceOf(
      CrmStoreValidationError,
    );
    await expect(
      store.updateContact(tenantA, "p2c-duplicate", {
        tenantId: TENANT_A,
        contactId: "p2c-rewritten",
      }),
    ).rejects.toBeInstanceOf(CrmStoreValidationError);
    await expect(
      store.updateContact(tenantA, "p2c-missing", {
        tenantId: TENANT_A,
        lifecycleStage: "customer",
      }),
    ).rejects.toThrow(/CRM record not found/);
  });
});
