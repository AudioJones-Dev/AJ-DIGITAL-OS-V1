import type { ApprovalRequest, ApprovalState } from "./approval-types.js";

export interface ApprovalStore {
  getById(approvalId: string): Promise<ApprovalRequest | null>;
  save(request: ApprovalRequest): Promise<void>;
  updateStatus(approvalId: string, status: ApprovalState): Promise<ApprovalRequest | null>;
  list(): Promise<ApprovalRequest[]>;
  listByStatus(status: ApprovalState): Promise<ApprovalRequest[]>;
}

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly items = new Map<string, ApprovalRequest>();

  async getById(approvalId: string): Promise<ApprovalRequest | null> {
    return this.items.get(approvalId) ?? null;
  }

  async save(request: ApprovalRequest): Promise<void> {
    this.items.set(request.approvalId, request);
  }

  async updateStatus(approvalId: string, status: ApprovalState): Promise<ApprovalRequest | null> {
    const existing = this.items.get(approvalId);
    if (!existing) return null;
    const updated: ApprovalRequest = {
      ...existing,
      status,
    };
    this.items.set(approvalId, updated);
    return updated;
  }

  async list(): Promise<ApprovalRequest[]> {
    return [...this.items.values()];
  }

  async listByStatus(status: ApprovalState): Promise<ApprovalRequest[]> {
    return [...this.items.values()].filter((item) => item.status === status);
  }
}
