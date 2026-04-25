import { randomUUID } from "node:crypto";

import { InMemoryApprovalStore, type ApprovalStore } from "./approval-store.js";
import type {
  ApprovalDecisionInput,
  ApprovalRequest,
  CreateApprovalInput,
} from "./approval-types.js";

function isExpired(expiresAt: string): boolean {
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return Date.now() > expiry;
}

function requireEnvironment(input: CreateApprovalInput): "local" | "dev" | "staging" | "production" {
  if (input.approvalType === "deployment" && !input.environment) {
    throw new Error("Deployment approval requires explicit environment field.");
  }
  return input.environment ?? "local";
}

export class ApprovalService {
  constructor(private readonly store: ApprovalStore = new InMemoryApprovalStore()) {}

  async createApprovalRequest(input: CreateApprovalInput): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      approvalId: randomUUID(),
      requestedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      requestedByAgentId: input.requestedByAgentId,
      permissionLevel: input.permissionLevel,
      actionCategory: input.actionCategory,
      risk: input.risk,
      reason: input.reason,
      target: input.target ?? null,
      command: input.command ?? null,
      clientId: input.clientId ?? null,
      environment: requireEnvironment(input),
      status: "pending",
      approvedBy: null,
      approvalChannel: null,
      auditId: input.auditId ?? null,
    };

    await this.store.save(request);
    return request;
  }

  async getApprovalById(approvalId: string): Promise<ApprovalRequest | null> {
    const item = await this.store.getById(approvalId);
    if (!item) return null;

    if (item.status === "pending" && isExpired(item.expiresAt)) {
      const expired = await this.expireApproval(approvalId);
      return expired;
    }

    return item;
  }

  async approvePendingRequest(input: ApprovalDecisionInput): Promise<ApprovalRequest> {
    const request = await this.getApprovalById(input.approvalId);
    if (!request) {
      throw new Error("Approval request not found.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot approve request in status ${request.status}.`);
    }

    if (isExpired(request.expiresAt)) {
      const expired = await this.expireApproval(input.approvalId);
      if (!expired) {
        throw new Error("Approval request not found.");
      }
      throw new Error("Approval request has expired.");
    }

    const approved: ApprovalRequest = {
      ...request,
      status: "approved",
      approvedBy: input.actorId,
      approvalChannel: input.channel,
    };
    await this.store.save(approved);
    return approved;
  }

  async denyPendingRequest(input: ApprovalDecisionInput): Promise<ApprovalRequest> {
    const request = await this.getApprovalById(input.approvalId);
    if (!request) {
      throw new Error("Approval request not found.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot deny request in status ${request.status}.`);
    }

    const denied: ApprovalRequest = {
      ...request,
      status: "denied",
      approvedBy: input.actorId,
      approvalChannel: input.channel,
    };
    await this.store.save(denied);
    return denied;
  }

  async expireApproval(approvalId: string): Promise<ApprovalRequest | null> {
    const request = await this.store.getById(approvalId);
    if (!request) return null;

    const expired: ApprovalRequest = {
      ...request,
      status: "expired",
    };
    await this.store.save(expired);
    return expired;
  }

  async cancelApproval(input: ApprovalDecisionInput): Promise<ApprovalRequest> {
    const request = await this.store.getById(input.approvalId);
    if (!request) {
      throw new Error("Approval request not found.");
    }

    const cancelled: ApprovalRequest = {
      ...request,
      status: "cancelled",
      approvedBy: input.actorId,
      approvalChannel: input.channel,
    };
    await this.store.save(cancelled);
    return cancelled;
  }

  async listPendingApprovals(): Promise<ApprovalRequest[]> {
    const pending = await this.store.listByStatus("pending");
    const resolved = await Promise.all(
      pending.map(async (item) => {
        if (isExpired(item.expiresAt)) {
          return this.expireApproval(item.approvalId);
        }
        return item;
      }),
    );

    return resolved.filter((item): item is ApprovalRequest => Boolean(item && item.status === "pending"));
  }

  async canUseApproval(approvalId: string): Promise<boolean> {
    const approval = await this.getApprovalById(approvalId);
    return approval?.status === "approved";
  }
}

export const defaultApprovalService = new ApprovalService();
