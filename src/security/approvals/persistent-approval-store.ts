import path from "node:path";

import { readJSON, writeJSON } from "../persistence/json-file-store.js";
import type { ApprovalRequest, ApprovalState } from "./approval-types.js";
import type { ApprovalStore } from "./approval-store.js";

export const APPROVALS_STORE_PATH_ENV = "AJ_APPROVALS_STORE_PATH";

// Resolved lazily so AJ_APPROVALS_STORE_PATH overrides (tests) apply
// regardless of module import order.
function defaultApprovalsPath(): string {
  const override = process.env[APPROVALS_STORE_PATH_ENV]?.trim();
  if (override !== undefined && override.length > 0) {
    return path.resolve(override);
  }
  return path.resolve("data", "security", "approvals.json");
}

type ApprovalsData = Record<string, ApprovalRequest>;

export class PersistentApprovalStore implements ApprovalStore {
  private readonly explicitPath: string | undefined;
  private cache: Map<string, ApprovalRequest> | null = null;

  constructor(filePath?: string) {
    this.explicitPath = filePath;
  }

  private get filePath(): string {
    return this.explicitPath ?? defaultApprovalsPath();
  }

  private async load(): Promise<Map<string, ApprovalRequest>> {
    if (this.cache !== null) return this.cache;

    const data = await readJSON<ApprovalsData>(this.filePath, {
      tolerateCorruption: true,
    });

    this.cache = new Map<string, ApprovalRequest>();
    if (data && typeof data === "object") {
      for (const [id, record] of Object.entries(data)) {
        this.cache.set(id, record);
      }
    }

    return this.cache;
  }

  private async persist(): Promise<void> {
    const map = await this.load();
    const obj: ApprovalsData = {};
    for (const [id, record] of map.entries()) {
      obj[id] = record;
    }
    await writeJSON(this.filePath, obj);
  }

  async getById(approvalId: string): Promise<ApprovalRequest | null> {
    const map = await this.load();
    return map.get(approvalId) ?? null;
  }

  async save(request: ApprovalRequest): Promise<void> {
    const map = await this.load();
    map.set(request.approvalId, request);
    await this.persist();
  }

  async updateStatus(approvalId: string, status: ApprovalState): Promise<ApprovalRequest | null> {
    const map = await this.load();
    const existing = map.get(approvalId);
    if (!existing) return null;
    const updated: ApprovalRequest = { ...existing, status };
    map.set(approvalId, updated);
    await this.persist();
    return updated;
  }

  async list(): Promise<ApprovalRequest[]> {
    const map = await this.load();
    return [...map.values()];
  }

  async listByStatus(status: ApprovalState): Promise<ApprovalRequest[]> {
    const map = await this.load();
    return [...map.values()].filter((item) => item.status === status);
  }
}
