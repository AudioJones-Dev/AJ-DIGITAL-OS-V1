import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PersistentApprovalStore } from "../../../src/security/approvals/persistent-approval-store.js";
import { PersistentTenantRegistry } from "../../../src/security/tenancy/persistent-tenant-registry.js";
import { PersistentAuditStore } from "../../../src/security/audit/persistent-audit-store.js";
import type { ApprovalRequest } from "../../../src/security/approvals/approval-types.js";
import type { TenantContext } from "../../../src/security/tenancy/tenant-types.js";

const TMP_DIR = path.resolve("tests", "security", "persistence", ".tmp");

function tmpFile(name: string): string {
  return path.join(TMP_DIR, name);
}

function makeApproval(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    approvalId: "approval-1",
    requestedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    requestedByAgentId: "test-agent",
    permissionLevel: 2,
    actionCategory: "DEPLOYMENT",
    risk: "high",
    reason: "Deploy to prod",
    target: "/deploy",
    command: null,
    clientId: "client-a",
    environment: "staging",
    status: "pending",
    approvedBy: null,
    approvalChannel: null,
    auditId: "audit-1",
    ...overrides,
  };
}

function makeTenant(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenantId: "tenant-1",
    tenantType: "client",
    workspaceRoot: "/workspace/client-1",
    dataClassification: "internal",
    allowedAgents: ["agent-a"],
    allowedTools: ["tool-a"],
    allowedEnvironments: ["local", "staging"],
    retentionPolicy: "30d",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe("PersistentApprovalStore", () => {
  it("persists approvals across store instances", async () => {
    const file = tmpFile("approvals.json");
    const store1 = new PersistentApprovalStore(file);
    const approval = makeApproval();

    await store1.save(approval);

    const store2 = new PersistentApprovalStore(file);
    const loaded = await store2.getById("approval-1");

    expect(loaded).not.toBeNull();
    expect(loaded?.approvalId).toBe("approval-1");
    expect(loaded?.status).toBe("pending");
  });

  it("persists status update across store instances", async () => {
    const file = tmpFile("approvals-update.json");
    const store1 = new PersistentApprovalStore(file);
    await store1.save(makeApproval());
    await store1.updateStatus("approval-1", "approved");

    const store2 = new PersistentApprovalStore(file);
    const loaded = await store2.getById("approval-1");
    expect(loaded?.status).toBe("approved");
  });

  it("handles corrupt file safely", async () => {
    const file = tmpFile("approvals-corrupt.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(file, "not-valid-json", "utf-8");

    const store = new PersistentApprovalStore(file);
    const result = await store.list();
    expect(result).toEqual([]);
  });

  it("listPending returns only pending approvals", async () => {
    const file = tmpFile("approvals-pending.json");
    const store = new PersistentApprovalStore(file);
    await store.save(makeApproval({ approvalId: "a1", status: "pending" }));
    await store.save(makeApproval({ approvalId: "a2", status: "approved" }));

    const pending = await store.listByStatus("pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.approvalId).toBe("a1");
  });
});

describe("PersistentTenantRegistry", () => {
  it("persists tenants across registry instances", async () => {
    const file = tmpFile("tenants.json");
    const reg1 = new PersistentTenantRegistry(file);
    await reg1.createTenant(makeTenant());

    const reg2 = new PersistentTenantRegistry(file);
    const loaded = await reg2.getTenant("tenant-1");

    expect(loaded).not.toBeNull();
    expect(loaded?.tenantId).toBe("tenant-1");
  });

  it("persists tenant updates across instances", async () => {
    const file = tmpFile("tenants-update.json");
    const reg1 = new PersistentTenantRegistry(file);
    await reg1.createTenant(makeTenant());
    await reg1.updateTenant("tenant-1", { dataClassification: "confidential" });

    const reg2 = new PersistentTenantRegistry(file);
    const loaded = await reg2.getTenant("tenant-1");
    expect(loaded?.dataClassification).toBe("confidential");
  });

  it("handles corrupt file safely", async () => {
    const file = tmpFile("tenants-corrupt.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(file, "{broken", "utf-8");

    const reg = new PersistentTenantRegistry(file);
    const list = await reg.listTenants();
    expect(list).toEqual([]);
  });

  it("listTenants returns all persisted tenants", async () => {
    const file = tmpFile("tenants-list.json");
    const reg = new PersistentTenantRegistry(file);
    await reg.createTenant(makeTenant({ tenantId: "t1" }));
    await reg.createTenant(makeTenant({ tenantId: "t2" }));

    const reg2 = new PersistentTenantRegistry(file);
    const list = await reg2.listTenants();
    expect(list).toHaveLength(2);
  });
});

describe("PersistentAuditStore", () => {
  it("appends audit records to JSONL file", async () => {
    const file = tmpFile("audit.jsonl");
    const store = new PersistentAuditStore(file);

    await store.append({
      auditId: "a1",
      timestamp: new Date().toISOString(),
      agentId: "agent-x",
      tenantId: "tenant-1",
      permissionLevel: 2,
      category: "DEPLOYMENT",
      decision: "allow",
      risk: "medium",
      reason: "Allowed by policy",
    });

    await store.append({
      auditId: "a2",
      timestamp: new Date().toISOString(),
      agentId: "agent-y",
      tenantId: null,
      permissionLevel: 1,
      category: "GIT_PUSH",
      decision: "block",
      risk: "high",
      reason: "Blocked by policy",
    });

    const all = await store.readAll();
    expect(all).toHaveLength(2);
    expect(all[0]?.auditId).toBe("a1");
    expect(all[1]?.auditId).toBe("a2");
  });

  it("filters audit records", async () => {
    const file = tmpFile("audit-filter.jsonl");
    const store = new PersistentAuditStore(file);

    await store.append({
      auditId: "b1",
      timestamp: new Date().toISOString(),
      agentId: "agent-x",
      permissionLevel: 2,
      category: "DEPLOYMENT",
      decision: "allow",
      risk: "low",
      reason: "Pass",
    });

    await store.append({
      auditId: "b2",
      timestamp: new Date().toISOString(),
      agentId: "agent-z",
      permissionLevel: 3,
      category: "GIT_PUSH",
      decision: "block",
      risk: "high",
      reason: "Blocked",
    });

    const blocked = await store.readAll((r) => r.decision === "block");
    expect(blocked).toHaveLength(1);
    expect(blocked[0]?.auditId).toBe("b2");
  });

  it("survives missing file gracefully", async () => {
    const file = tmpFile("audit-missing.jsonl");
    const store = new PersistentAuditStore(file);
    const result = await store.readAll();
    expect(result).toEqual([]);
  });
});
