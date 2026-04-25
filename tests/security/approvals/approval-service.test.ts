import { describe, expect, it } from "vitest";

import { ApprovalService } from "../../../src/security/approvals/approval-service.js";

function futureIso(minutes = 10): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function pastIso(minutes = 10): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

describe("approval service", () => {
  it("creates approval request", async () => {
    const service = new ApprovalService();
    const created = await service.createApprovalRequest({
      approvalType: "git_push",
      requestedByAgentId: "agent-1",
      permissionLevel: 4,
      actionCategory: "GIT_PUSH",
      risk: "high",
      reason: "push needs review",
      expiresAt: futureIso(),
      environment: "dev",
    });

    expect(created.status).toBe("pending");
    expect(created.approvalId).toBeTruthy();
    expect(created.environment).toBe("dev");
  });

  it("approves pending request", async () => {
    const service = new ApprovalService();
    const created = await service.createApprovalRequest({
      approvalType: "remote_change",
      requestedByAgentId: "agent-1",
      permissionLevel: 4,
      actionCategory: "REMOTE_CHANGE",
      risk: "high",
      reason: "remote config change",
      expiresAt: futureIso(),
      environment: "staging",
    });

    const approved = await service.approvePendingRequest({
      approvalId: created.approvalId,
      actorId: "operator-1",
      channel: "cli",
    });

    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe("operator-1");
  });

  it("denies pending request", async () => {
    const service = new ApprovalService();
    const created = await service.createApprovalRequest({
      approvalType: "secret_modify",
      requestedByAgentId: "agent-1",
      permissionLevel: 5,
      actionCategory: "SECRET_MODIFY",
      risk: "critical",
      reason: "rotate secret",
      expiresAt: futureIso(),
      environment: "production",
    });

    const denied = await service.denyPendingRequest({
      approvalId: created.approvalId,
      actorId: "operator-2",
      channel: "manual",
    });

    expect(denied.status).toBe("denied");
  });

  it("expired approval cannot be used", async () => {
    const service = new ApprovalService();
    const created = await service.createApprovalRequest({
      approvalType: "destructive_admin",
      requestedByAgentId: "agent-1",
      permissionLevel: 5,
      actionCategory: "DESTRUCTIVE_ADMIN",
      risk: "critical",
      reason: "dangerous operation",
      expiresAt: pastIso(),
      environment: "local",
    });

    const canUse = await service.canUseApproval(created.approvalId);
    expect(canUse).toBe(false);

    const resolved = await service.getApprovalById(created.approvalId);
    expect(resolved?.status).toBe("expired");
  });

  it("production deployment approval requires explicit environment field", async () => {
    const service = new ApprovalService();

    await expect(
      service.createApprovalRequest({
        approvalType: "deployment",
        requestedByAgentId: "agent-1",
        permissionLevel: 5,
        actionCategory: "DEPLOYMENT",
        risk: "critical",
        reason: "production deploy",
        expiresAt: futureIso(),
      }),
    ).rejects.toThrowError("Deployment approval requires explicit environment field.");
  });
});
