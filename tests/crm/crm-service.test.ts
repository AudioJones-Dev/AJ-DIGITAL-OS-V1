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
  CrmService,
  PersistentCrmAuditLog,
  PersistentCrmStore,
  assertCrmTenantContext,
  createTwoTenantCrmSeedData,
  evaluateCrmApproval,
  type CrmTenantContext,
  type CrmTenantMembership,
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
