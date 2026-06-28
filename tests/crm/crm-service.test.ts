import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const emitEventMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/attribution/attribution-tracker.js", () => ({
  emitEvent: emitEventMock,
}));

import {
  CrmApprovalRequiredError,
  CrmPermissionDeniedError,
  CrmService,
  CrmServiceFactoryError,
  PersistentCrmAuditLog,
  PersistentCrmStore,
  PostgresCrmStore,
  assertCrmTenantContext,
  createCrmService,
  createPostgresCrmService,
  createTwoTenantCrmSeedData,
  defaultCrmService,
  defaultCrmStore,
  evaluateCrmApproval,
  type CrmContact,
  type CrmLead,
  type CrmOpportunity,
  type CrmStore,
  type CrmTenantContext,
  type CrmTenantMembership,
  type PostgresCrmPool,
} from "../../src/crm/index.js";

let tmpDir = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "aj-crm-service-test-"));
  emitEventMock.mockResolvedValue({
    eventId: "attr-1",
    eventType: "entity_normalized",
    runId: "run-1",
    agentId: "crm-module",
    channel: "unknown",
    timestamp: "2026-06-15T00:00:00.000Z",
  });
});

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
  vi.clearAllMocks();
});

function tmpFile(name: string): string {
  return path.join(tmpDir, name);
}

function tenantContext(
  tenantId: string,
  actorId: string,
  memberships: CrmTenantMembership[],
  approvalStatus?: CrmTenantContext["approvalStatus"],
): CrmTenantContext {
  return assertCrmTenantContext({
    selectedTenantId: tenantId,
    actorType: "tenant_user",
    actorId,
    memberships,
    riskLevel: "L2",
    ...(approvalStatus !== undefined ? { approvalStatus } : {}),
  });
}

function makeService(): {
  service: CrmService;
  auditLog: PersistentCrmAuditLog;
} {
  const auditLog = new PersistentCrmAuditLog(tmpFile("crm-audit.jsonl"));
  return {
    service: new CrmService({
      store: new PersistentCrmStore(tmpFile("crm-store.json")),
      auditLog,
    }),
    auditLog,
  };
}

class FakeCrmStore implements CrmStore {
  readonly calls: string[] = [];

  constructor(
    private readonly contact: CrmContact,
    private readonly lead: CrmLead,
    private readonly opportunity: CrmOpportunity,
  ) {}

  async createContact(_context: CrmTenantContext, contact: CrmContact): Promise<CrmContact> {
    this.calls.push("createContact");
    return contact;
  }

  async getContact(_context: CrmTenantContext, _contactId: string): Promise<CrmContact | null> {
    this.calls.push("getContact");
    return this.contact;
  }

  async listContacts(_context: CrmTenantContext): Promise<CrmContact[]> {
    this.calls.push("listContacts");
    return [this.contact];
  }

  async updateContact(
    context: CrmTenantContext,
    contactId: string,
    patch: Partial<CrmContact> & Pick<CrmContact, "tenantId">,
  ): Promise<CrmContact> {
    this.calls.push("updateContact");
    return {
      ...this.contact,
      ...patch,
      tenantId: context.tenantId,
      contactId,
    };
  }

  async createLead(_context: CrmTenantContext, lead: CrmLead): Promise<CrmLead> {
    this.calls.push("createLead");
    return lead;
  }

  async getLead(_context: CrmTenantContext, _leadId: string): Promise<CrmLead | null> {
    this.calls.push("getLead");
    return this.lead;
  }

  async listLeads(_context: CrmTenantContext): Promise<CrmLead[]> {
    this.calls.push("listLeads");
    return [this.lead];
  }

  async updateLead(
    context: CrmTenantContext,
    leadId: string,
    patch: Partial<CrmLead> & Pick<CrmLead, "tenantId">,
  ): Promise<CrmLead> {
    this.calls.push("updateLead");
    return {
      ...this.lead,
      ...patch,
      tenantId: context.tenantId,
      leadId,
    };
  }

  async createOpportunity(_context: CrmTenantContext, opportunity: CrmOpportunity): Promise<CrmOpportunity> {
    this.calls.push("createOpportunity");
    return opportunity;
  }

  async getOpportunity(_context: CrmTenantContext, _opportunityId: string): Promise<CrmOpportunity | null> {
    this.calls.push("getOpportunity");
    return this.opportunity;
  }

  async listOpportunities(_context: CrmTenantContext): Promise<CrmOpportunity[]> {
    this.calls.push("listOpportunities");
    return [this.opportunity];
  }

  async updateOpportunity(
    context: CrmTenantContext,
    opportunityId: string,
    patch: Partial<CrmOpportunity> & Pick<CrmOpportunity, "tenantId">,
  ): Promise<CrmOpportunity> {
    this.calls.push("updateOpportunity");
    return {
      ...this.opportunity,
      ...patch,
      tenantId: context.tenantId,
      opportunityId,
    };
  }
}

describe("CRM approval policy", () => {
  it("requires approval for opportunity updates", () => {
    const decision = evaluateCrmApproval("update_opportunity", "pending");
    expect(decision.approvalRequired).toBe(true);
    expect(decision.approved).toBe(false);

    const approved = evaluateCrmApproval("update_opportunity", "approved");
    expect(approved.approved).toBe(true);
  });

  it("does not require approval for CRM record creation", () => {
    expect(evaluateCrmApproval("create_contact", undefined).approved).toBe(true);
    expect(evaluateCrmApproval("create_lead", "not_required").approved).toBe(true);
  });
});

describe("CrmService", () => {
  it("keeps the default service on the file-backed store", () => {
    expect((defaultCrmService as unknown as { store: unknown }).store).toBe(defaultCrmStore);
  });

  it("creates a default service with the file-backed store", () => {
    const service = createCrmService();

    expect((service as unknown as { store: unknown }).store).toBe(defaultCrmStore);
  });

  it("creates a service with an explicitly injected store", () => {
    const seed = createTwoTenantCrmSeedData();
    const store = new FakeCrmStore(seed.contacts[0], seed.leads[0], seed.opportunities[0]);
    const service = createCrmService({ store });

    expect((service as unknown as { store: unknown }).store).toBe(store);
  });

  it("creates a service with an explicit Postgres CRM store", () => {
    const pool: PostgresCrmPool = {
      connect: vi.fn(),
    };

    const service = createPostgresCrmService(pool);
    const store = (service as unknown as { store: unknown }).store;

    expect(store).toBeInstanceOf(PostgresCrmStore);
  });

  it("rejects ambiguous service factory store inputs", () => {
    const seed = createTwoTenantCrmSeedData();
    const store = new FakeCrmStore(seed.contacts[0], seed.leads[0], seed.opportunities[0]);
    const postgresPool: PostgresCrmPool = {
      connect: vi.fn(),
    };

    expect(() => createCrmService({ store, postgresPool })).toThrow(CrmServiceFactoryError);
  });

  it("delegates CRM writes through an injected store contract", async () => {
    const seed = createTwoTenantCrmSeedData();
    const tenantA = tenantContext(
      seed.tenants[0].tenantId,
      seed.tenants[0].ownerUserId,
      seed.memberships,
      "approved",
    );
    const store = new FakeCrmStore(seed.contacts[0], seed.leads[0], seed.opportunities[0]);
    const service = new CrmService({
      store,
      auditLog: new PersistentCrmAuditLog(tmpFile("crm-contract-audit.jsonl")),
    });

    await service.createContact(tenantA, seed.contacts[0]);
    await service.updateContact(tenantA, seed.contacts[0].contactId, {
      tenantId: tenantA.tenantId,
      lifecycleStage: "qualified",
    });
    await service.createLead(tenantA, seed.leads[0]);
    await service.updateLead(tenantA, seed.leads[0].leadId, {
      tenantId: tenantA.tenantId,
      status: "working",
    });
    await service.createOpportunity(tenantA, seed.opportunities[0]);
    await service.updateOpportunity(tenantA, seed.opportunities[0].opportunityId, {
      tenantId: tenantA.tenantId,
      status: "won",
    });

    expect(store.calls).toEqual([
      "createContact",
      "updateContact",
      "createLead",
      "updateLead",
      "createOpportunity",
      "updateOpportunity",
    ]);
  });

  it("creates a contact through tenant guard, audit, and attribution", async () => {
    const seed = createTwoTenantCrmSeedData();
    const { service, auditLog } = makeService();
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);

    await service.createContact(tenantA, seed.contacts[0]);

    const audit = await auditLog.read({ tenantId: "tenant-alpha" });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.eventType).toBe("crm_contact_created");
    expect(audit[0]?.objectId).toBe("contact-shared");
    expect(emitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "entity_normalized",
        runId: "contact-shared",
        clientId: "tenant-alpha",
      }),
    );
  });

  it("creates leads without leaking same IDs across tenants", async () => {
    const seed = createTwoTenantCrmSeedData();
    const { service, auditLog } = makeService();
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);
    const tenantB = tenantContext(seed.tenants[1].tenantId, seed.tenants[1].ownerUserId, seed.memberships);

    const alpha = await service.createLead(tenantA, seed.leads[0]);
    const bravo = await service.createLead(tenantB, seed.leads[1]);

    expect(alpha.tenantId).toBe("tenant-alpha");
    expect(bravo.tenantId).toBe("tenant-bravo");
    expect(alpha.leadId).toBe(bravo.leadId);
    expect(await auditLog.read({ tenantId: "tenant-alpha" })).toHaveLength(1);
    expect(await auditLog.read({ tenantId: "tenant-bravo" })).toHaveLength(1);
  });

  it("blocks write actions when the actor has only read permission", async () => {
    const seed = createTwoTenantCrmSeedData();
    const { service, auditLog } = makeService();
    const readOnlyTenantA = tenantContext(
      seed.tenants[0].tenantId,
      "readonly-alpha",
      [
        {
          tenantId: seed.tenants[0].tenantId,
          userId: "readonly-alpha",
          role: "tenant_user",
          status: "active",
          permissions: ["crm:read"],
          createdAt: "2026-06-15T00:00:00.000Z",
          updatedAt: "2026-06-15T00:00:00.000Z",
        },
      ],
    );

    await expect(
      service.createContact(readOnlyTenantA, {
        ...seed.contacts[0],
        tenantId: seed.tenants[0].tenantId,
      }),
    ).rejects.toBeInstanceOf(CrmPermissionDeniedError);

    const audit = await auditLog.read({ tenantId: "tenant-alpha" });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.eventType).toBe("crm_action_blocked");
  });

  it("blocks approval-gated opportunity updates without approved status", async () => {
    const seed = createTwoTenantCrmSeedData();
    const { service, auditLog } = makeService();
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);

    await service.createOpportunity(tenantA, seed.opportunities[0]);

    await expect(
      service.updateOpportunity(tenantA, "opportunity-shared", {
        tenantId: "tenant-alpha",
        stageId: "stage-won",
      }),
    ).rejects.toBeInstanceOf(CrmApprovalRequiredError);

    const audit = await auditLog.read({ tenantId: "tenant-alpha" });
    expect(audit.map((event) => event.eventType)).toContain("crm_approval_required");
  });

  it("allows approved opportunity updates and records update attribution", async () => {
    const seed = createTwoTenantCrmSeedData();
    const { service, auditLog } = makeService();
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);
    const approvedTenantA = tenantContext(
      seed.tenants[0].tenantId,
      seed.tenants[0].ownerUserId,
      seed.memberships,
      "approved",
    );

    await service.createOpportunity(tenantA, seed.opportunities[0]);
    const updated = await service.updateOpportunity(approvedTenantA, "opportunity-shared", {
      tenantId: "tenant-alpha",
      stageId: "stage-won",
      status: "won",
    });

    expect(updated.status).toBe("won");
    const audit = await auditLog.read({ eventType: "crm_opportunity_updated" });
    expect(audit).toHaveLength(1);
    expect(emitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "entity_updated",
        runId: "opportunity-shared",
        clientId: "tenant-alpha",
      }),
    );
  });

  it("does not fail CRM writes when attribution rejects", async () => {
    emitEventMock.mockRejectedValueOnce(new Error("attribution down"));
    const seed = createTwoTenantCrmSeedData();
    const { service } = makeService();
    const tenantA = tenantContext(seed.tenants[0].tenantId, seed.tenants[0].ownerUserId, seed.memberships);

    await expect(service.createContact(tenantA, seed.contacts[0])).resolves.toBeDefined();
  });
});
