import { describe, expect, it } from "vitest";

import {
  CrmDuplicateRecordError,
  CrmStoreValidationError,
  PostgresCrmStore,
  type CrmContact,
  type CrmTenantContext,
} from "../../src/crm/index.js";
import type { PostgresCrmClient, PostgresCrmPool } from "../../src/crm/postgres-crm-store.js";

const CONTACT_ROW = {
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
};

// Records every statement and returns a valid contact row for all of them, so
// an update (preload SELECT + UPDATE ... returning) completes and the recorded
// SQL can be asserted.
class RecordingClient implements PostgresCrmClient {
  readonly calls: { text: string; values?: readonly unknown[] }[] = [];
  released = false;

  async query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[]; rowCount: number | null }> {
    this.calls.push({ text, values });
    return { rows: [CONTACT_ROW] as T[], rowCount: 1 };
  }

  release(): void {
    this.released = true;
  }
}

// Passes the uniqueness preflight (empty SELECT) but raises a pg unique
// violation (23505) on insert, simulating the concurrent-create loser.
class UniqueViolationClient implements PostgresCrmClient {
  released = false;

  async query<T = unknown>(text: string): Promise<{ rows: T[]; rowCount: number | null }> {
    if (text.includes("insert into")) {
      const error = new Error("duplicate key value violates unique constraint") as Error & { code: string };
      error.code = "23505";
      throw error;
    }
    return { rows: [], rowCount: 0 };
  }

  release(): void {
    this.released = true;
  }
}

function poolReturning(client: PostgresCrmClient): PostgresCrmPool & { connectCount: number } {
  return {
    connectCount: 0,
    async connect(): Promise<PostgresCrmClient> {
      this.connectCount += 1;
      return client;
    },
  };
}

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

  it("preloads updates with a tenant-leading query (spec §13, no id-only read)", async () => {
    const client = new RecordingClient();
    const store = new PostgresCrmStore(poolReturning(client));

    await store.updateContact(context(), "contact-db", { tenantId: "tenant-alpha", lifecycleStage: "qualified" });

    const preload = client.calls.find(
      (call) => call.text.includes("select") && call.text.includes("from public.crm_contacts"),
    );
    expect(preload).toBeDefined();
    expect(preload!.text).toMatch(/where tenant_id = \$1 and contact_id = \$2/);
    expect(preload!.values).toEqual(["tenant-alpha", "contact-db"]);
    // The forbidden id-only preload must never be issued.
    expect(client.calls.every((call) => !/where contact_id = \$1 limit 1/.test(call.text))).toBe(true);
  });

  it("translates a concurrent unique violation (23505) into CrmDuplicateRecordError", async () => {
    const client = new UniqueViolationClient();
    const store = new PostgresCrmStore(poolReturning(client));

    await expect(store.createContact(context(), contact())).rejects.toBeInstanceOf(CrmDuplicateRecordError);
    expect(client.released).toBe(true);
  });

  it("rethrows non-unique DB errors from inserts unchanged", async () => {
    const failing = new Error("syntax error") as Error & { code: string };
    failing.code = "42601";
    const client: PostgresCrmClient = {
      async query<T = unknown>(text: string): Promise<{ rows: T[]; rowCount: number | null }> {
        if (text.includes("insert into")) throw failing;
        return { rows: [], rowCount: 0 };
      },
      release() {},
    };
    const store = new PostgresCrmStore(poolReturning(client));

    await expect(store.createContact(context(), contact())).rejects.toBe(failing);
  });
});
