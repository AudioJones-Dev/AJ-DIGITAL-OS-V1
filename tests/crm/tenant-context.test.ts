import { describe, expect, it } from "vitest";

import {
  TenantScopedCollection,
  assertCrmTenantContext,
  resolveCrmTenantContext,
  validateCrmActionContext,
  type CrmContact,
  type CrmTenantContext,
  type CrmTenantMembership,
} from "../../src/crm/index.js";

const now = "2026-06-15T00:00:00.000Z";

function membership(
  tenantId: string,
  userId: string,
  role: CrmTenantMembership["role"] = "tenant_user",
): CrmTenantMembership {
  return {
    tenantId,
    userId,
    role,
    status: "active",
    permissions: role === "tenant_admin" ? ["crm:*"] : ["crm:read", "crm:update_assigned"],
    createdAt: now,
    updatedAt: now,
  };
}

function contact(tenantId: string, contactId: string, email: string): CrmContact {
  return {
    tenantId,
    contactId,
    email,
    lifecycleStage: "lead",
    createdAt: now,
    updatedAt: now,
  };
}

function expectAllowed(decision: ReturnType<typeof resolveCrmTenantContext>): CrmTenantContext {
  if (!decision.ok) throw new Error(decision.reason);
  return decision.context;
}

describe("CRM tenant context", () => {
  it("requires an explicit selected tenant", () => {
    const decision = resolveCrmTenantContext({
      actorType: "platform_user",
      actorId: "aj-admin",
      platformAccess: { canAccessAllTenants: true },
    });

    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe("tenant_context_required");
  });

  it("allows a platform owner to switch into an explicit tenant context", () => {
    const context = assertCrmTenantContext({
      selectedTenantId: "tenant-a",
      actorType: "platform_user",
      actorId: "aj-admin",
      platformAccess: { canAccessAllTenants: true, permissions: ["tenant:admin"] },
      riskLevel: "L2",
    });

    expect(context.tenantId).toBe("tenant-a");
    expect(context.role).toBe("platform_owner");
    expect(context.riskLevel).toBe("L2");
  });

  it("allows an active tenant admin membership", () => {
    const context = assertCrmTenantContext({
      selectedTenantId: "tenant-a",
      actorType: "tenant_user",
      actorId: "owner-a",
      memberships: [membership("tenant-a", "owner-a", "tenant_admin")],
    });

    expect(context.role).toBe("tenant_admin");
    expect(context.permissions).toContain("crm:*");
  });

  it("blocks tenant users from accessing another tenant", () => {
    const decision = resolveCrmTenantContext({
      selectedTenantId: "tenant-b",
      actorType: "tenant_user",
      actorId: "owner-a",
      memberships: [membership("tenant-a", "owner-a", "tenant_admin")],
    });

    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe("tenant_membership_required");
  });

  it("blocks tenant agents from crossing tenant boundaries", () => {
    const decision = resolveCrmTenantContext({
      selectedTenantId: "tenant-b",
      actorType: "agent",
      actorId: "ai-receptionist-a",
      agentTenantId: "tenant-a",
    });

    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe("agent_tenant_mismatch");
  });

  it("validates required CRM action context fields", () => {
    const invalid = validateCrmActionContext({
      actorType: "tenant_user",
      actorId: "user-a",
      riskLevel: "L1",
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain("tenantId is required.");

    const valid = validateCrmActionContext({
      tenantId: "tenant-a",
      actorType: "tenant_user",
      actorId: "user-a",
      riskLevel: "L1",
      approvalStatus: "not_required",
    });
    expect(valid.valid).toBe(true);
  });
});

describe("TenantScopedCollection", () => {
  it("stores and lists records only inside the active tenant", () => {
    const tenantA = expectAllowed(
      resolveCrmTenantContext({
        selectedTenantId: "tenant-a",
        actorType: "tenant_user",
        actorId: "owner-a",
        memberships: [membership("tenant-a", "owner-a", "tenant_admin")],
      }),
    );
    const tenantB = expectAllowed(
      resolveCrmTenantContext({
        selectedTenantId: "tenant-b",
        actorType: "tenant_user",
        actorId: "owner-b",
        memberships: [membership("tenant-b", "owner-b", "tenant_admin")],
      }),
    );

    const contacts = new TenantScopedCollection<CrmContact, "contactId">("contactId");
    contacts.create(tenantA, contact("tenant-a", "contact-1", "a@example.test"));
    contacts.create(tenantB, contact("tenant-b", "contact-1", "b@example.test"));

    expect(contacts.list(tenantA)).toHaveLength(1);
    expect(contacts.list(tenantB)).toHaveLength(1);
    expect(contacts.get(tenantA, "contact-1")?.email).toBe("a@example.test");
    expect(contacts.get(tenantB, "contact-1")?.email).toBe("b@example.test");
  });

  it("rejects records that do not match the active tenant", () => {
    const tenantA = expectAllowed(
      resolveCrmTenantContext({
        selectedTenantId: "tenant-a",
        actorType: "tenant_user",
        actorId: "owner-a",
        memberships: [membership("tenant-a", "owner-a", "tenant_admin")],
      }),
    );

    const contacts = new TenantScopedCollection<CrmContact, "contactId">("contactId");

    expect(() =>
      contacts.create(tenantA, contact("tenant-b", "contact-2", "b@example.test")),
    ).toThrow(/does not match active tenant/);
  });

  it("rejects cross-tenant updates", () => {
    const tenantA = expectAllowed(
      resolveCrmTenantContext({
        selectedTenantId: "tenant-a",
        actorType: "tenant_user",
        actorId: "owner-a",
        memberships: [membership("tenant-a", "owner-a", "tenant_admin")],
      }),
    );

    const contacts = new TenantScopedCollection<CrmContact, "contactId">("contactId");
    contacts.create(tenantA, contact("tenant-a", "contact-3", "a@example.test"));

    expect(() =>
      contacts.update(tenantA, "contact-3", {
        tenantId: "tenant-b",
        email: "changed@example.test",
      }),
    ).toThrow(/does not match active tenant/);
  });
});
