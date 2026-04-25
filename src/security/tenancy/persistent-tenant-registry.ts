import path from "node:path";

import { readJSON, writeJSON } from "../persistence/json-file-store.js";
import type { TenantContext } from "./tenant-types.js";

const DEFAULT_TENANTS_PATH = path.resolve("data", "security", "tenants.json");

type TenantsData = Record<string, TenantContext>;

export class PersistentTenantRegistry {
  private readonly filePath: string;
  private cache: Map<string, TenantContext> | null = null;

  constructor(filePath: string = DEFAULT_TENANTS_PATH) {
    this.filePath = filePath;
  }

  private async load(): Promise<Map<string, TenantContext>> {
    if (this.cache !== null) return this.cache;

    const data = await readJSON<TenantsData>(this.filePath, {
      tolerateCorruption: true,
    });

    this.cache = new Map<string, TenantContext>();
    if (data && typeof data === "object") {
      for (const [id, record] of Object.entries(data)) {
        this.cache.set(id, record);
      }
    }

    return this.cache;
  }

  private async persist(): Promise<void> {
    const map = await this.load();
    const obj: TenantsData = {};
    for (const [id, record] of map.entries()) {
      obj[id] = record;
    }
    await writeJSON(this.filePath, obj);
  }

  async createTenant(context: TenantContext): Promise<TenantContext> {
    const map = await this.load();
    if (map.has(context.tenantId)) {
      throw new Error(`Tenant ${context.tenantId} already exists.`);
    }
    map.set(context.tenantId, context);
    await this.persist();
    return context;
  }

  async getTenant(tenantId: string): Promise<TenantContext | null> {
    const map = await this.load();
    return map.get(tenantId) ?? null;
  }

  async listTenants(): Promise<TenantContext[]> {
    const map = await this.load();
    return [...map.values()];
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<Omit<TenantContext, "tenantId">>,
  ): Promise<TenantContext> {
    const map = await this.load();
    const existing = map.get(tenantId);
    if (!existing) {
      throw new Error(`Tenant ${tenantId} not found.`);
    }
    const updated: TenantContext = { ...existing, ...updates, tenantId };
    map.set(tenantId, updated);
    await this.persist();
    return updated;
  }
}

export const defaultTenantRegistry = new PersistentTenantRegistry();
