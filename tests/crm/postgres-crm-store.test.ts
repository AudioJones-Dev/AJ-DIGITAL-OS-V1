import { describe, expect, it } from "vitest";

import {
  CrmStoreValidationError,
  PostgresCrmStore,
  type CrmContact,
  type CrmTenantContext,
} from "../../src/crm/index.js";
import type { PostgresCrmClient, PostgresCrmPool } from "../../src/crm/postgres-crm-store.js";

class FakeClient implements PostgresCrmClient {
  readonly calls: string[] = [];
  released = false;

  async query<T = unknown>(text: string): Promise<{ rows: T[]; rowCount: number | null }> {
    this.calls.push(text);
    if (text.includes("from public.crm_contacts")) {
      return {
        rows: [
          {
            tenant_id: "tenant-alpha",
            contact_id: "contact-db",
            company_id: null,
            first_name: "Dana",
            last_name: null,
            email: "dana@example.test",
            phone: null,
            lifecycle_stage: "lead",
            owner_user_id: null,
            source: null,
            consent_status: null,
            created_at: "2026-06-15T00:00:00.000Z",
            updated_at: "2026-06-15T00:00:00.000Z",
          },
        ] as T[],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  }

  release(): void {
    this.released = true;
  }
}

class FakePool implements PostgresCrmPool {
  readonly client = new FakeClient();
  connectCount = 0;

  async connect(): Promise<PostgresCrmClient> {
    this.connectCount += 1;
    return this.client;
  }
}

function context(): CrmTenantContext {
  return {
    tenantId: "tenant-alpha",
    actorType: "tenant_user",
    actorId: "owner-alpha",
    riskLevel: "L0",
    role: "tenant_admin",
    permissions: ["crm:read", "crm:write"],
  };
}

function contact(overrides: Partial<CrmContact> = {}): CrmContact {
  return {
    tenantId: "tenant-alpha",
    contactId: "contact-db",
    lifecycleStage: "lead",
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("PostgresCrmStore", () => {
  it("rejects invalid contacts before checking out a DB client", async () => {
    const pool = new FakePool();
    const store = new PostgresCrmStore(pool);

    await expect(store.createContact(context(), contact({ tenantId: "" }))).rejects.toBeInstanceOf(
      CrmStoreValidationError,
    );

    expect(pool.connectCount).toBe(0);
  });

  it("rejects cross-tenant contacts before checking out a DB client", async () => {
    const pool = new FakePool();
    const store = new PostgresCrmStore(pool);

    await expect(store.createContact(context(), contact({ tenantId: "tenant-bravo" }))).rejects.toThrow(
      /does not match active tenant/,
    );

    expect(pool.connectCount).toBe(0);
  });

  it("checks out one client, binds tenant context, and releases after a read", async () => {
    const pool = new FakePool();
    const store = new PostgresCrmStore(pool);

    const result = await store.getContact(context(), "contact-db");

    expect(result?.email).toBe("dana@example.test");
    expect(pool.connectCount).toBe(1);
    expect(pool.client.released).toBe(true);
    expect(pool.client.calls[0]).toBe("begin");
    expect(pool.client.calls).toContain("commit");
    expect(pool.client.calls.some((call) => call.includes("set_config"))).toBe(true);
  });
});
