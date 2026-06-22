import os from "node:os";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CrmStoreValidationError,
  PersistentCrmStore,
  assertCrmTenantContext,
  createTwoTenantCrmSeedData,
  validateCrmContact,
  type CrmTenantContext,
  type CrmTenantMembership,
} from "../../src/crm/index.js";

let tmpDir = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "aj-crm-store-test-"));
});

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
});

function tmpFile(name: string): string {
  return path.join(tmpDir, name);
}

function tenantContext(
  tenantId: string,
  actorId: string,
  memberships: CrmTenantMembership[],
): CrmTenantContext {
  return assertCrmTenantContext({
    selectedTenantId: tenantId,
    actorType: "tenant_user",
    actorId,
    memberships,
    riskLevel: "L2",
    approvalStatus: "not_required",
  });
}

async function seedStore(store: PersistentCrmStore): Promise<{
  tenantA: CrmTenantContext;
  tenantB: CrmTenantContext;
}> {
  const seed = createTwoTenantCrmSeedData();
  const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);
  const tenantB = tenantContext(seed.tenants[1].tenantId, seed.tenants[1].ownerUserId, seed.memberships);

  await store.createContact(tenantA, seed.contacts[0]);
  await store.createContact(tenantB, seed.contacts[1]);
  await store.createLead(tenantA, seed.leads[0]);
  await store.createLead(tenantB, seed.leads[1]);
  await store.createOpportunity(tenantA, seed.opportunities[0]);
  await store.createOpportunity(tenantB, seed.opportunities[1]);

  return { tenantA, tenantB };
}

describe("CRM schemas", () => {
  it("requires tenantId on tenant-scoped records", () => {
    const result = validateCrmContact({
      contactId: "contact-no-tenant",
      email: "missing@example.test",
      lifecycleStage: "lead",
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("tenantId"))).toBe(true);
  });
});

describe("PersistentCrmStore", () => {
  it("persists tenant-scoped contacts, leads, and opportunities across store instances", async () => {
    const file = tmpFile("crm-store.json");
    const store1 = new PersistentCrmStore(file);
    const { tenantA } = await seedStore(store1);

    const store2 = new PersistentCrmStore(file);
    const contact = await store2.getContact(tenantA, "contact-shared");
    const lead = await store2.getLead(tenantA, "lead-shared");
    const opportunity = await store2.getOpportunity(tenantA, "opportunity-shared");

    expect(contact?.email).toBe("avery.alpha@example.test");
    expect(lead?.score).toBe(72);
    expect(opportunity?.value).toBe(7500);
  });

  it("keeps duplicate object IDs isolated by tenant", async () => {
    const store = new PersistentCrmStore(tmpFile("crm-isolation.json"));
    const { tenantA, tenantB } = await seedStore(store);

    const alphaContact = await store.getContact(tenantA, "contact-shared");
    const bravoContact = await store.getContact(tenantB, "contact-shared");

    expect(alphaContact?.tenantId).toBe("tenant-alpha");
    expect(alphaContact?.email).toBe("avery.alpha@example.test");
    expect(bravoContact?.tenantId).toBe("tenant-bravo");
    expect(bravoContact?.email).toBe("blake.bravo@example.test");
  });

  it("lists only records inside the active tenant context", async () => {
    const store = new PersistentCrmStore(tmpFile("crm-list.json"));
    const { tenantA, tenantB } = await seedStore(store);

    expect(await store.listContacts(tenantA)).toHaveLength(1);
    expect(await store.listContacts(tenantB)).toHaveLength(1);
    expect((await store.listLeads(tenantA))[0]?.tenantId).toBe("tenant-alpha");
    expect((await store.listOpportunities(tenantB))[0]?.tenantId).toBe("tenant-bravo");
  });

  it("rejects writes when record tenant does not match context", async () => {
    const seed = createTwoTenantCrmSeedData();
    const store = new PersistentCrmStore(tmpFile("crm-reject-cross-tenant.json"));
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);

    await expect(store.createContact(tenantA, seed.contacts[1])).rejects.toThrow(
      /does not match active tenant/,
    );
  });

  it("rejects invalid records before persistence", async () => {
    const seed = createTwoTenantCrmSeedData();
    const store = new PersistentCrmStore(tmpFile("crm-invalid.json"));
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);

    await expect(
      store.createContact(tenantA, {
        ...seed.contacts[0],
        tenantId: "",
      }),
    ).rejects.toBeInstanceOf(CrmStoreValidationError);
  });

  it("updates only the active tenant record", async () => {
    const store = new PersistentCrmStore(tmpFile("crm-update.json"));
    const { tenantA, tenantB } = await seedStore(store);

    const updated = await store.updateContact(tenantA, "contact-shared", {
      tenantId: "tenant-alpha",
      lifecycleStage: "qualified",
    });

    const bravoContact = await store.getContact(tenantB, "contact-shared");
    expect(updated.lifecycleStage).toBe("qualified");
    expect(bravoContact?.lifecycleStage).toBe("lead");
  });

  it("survives corrupt store files by returning an empty store", async () => {
    const file = tmpFile("crm-corrupt.json");
    await writeFile(file, "{broken", "utf-8");

    const seed = createTwoTenantCrmSeedData();
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);
    const store = new PersistentCrmStore(file);

    expect(await store.listContacts(tenantA)).toEqual([]);
  });
});
