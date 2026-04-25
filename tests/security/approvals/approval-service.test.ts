import os from "node:os";
import path from "node:path";
import { existsSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { ApprovalService } from "../../../src/security/approvals/approval-service.js";
import { PersistentApprovalStore } from "../../../src/security/approvals/persistent-approval-store.js";

// Each test gets a unique isolated file in the OS temp dir.
// Collected here so afterEach can clean them up reliably.
const tempFiles: string[] = [];

function makeIsolatedService(): ApprovalService {
  const filePath = path.join(os.tmpdir(), `aj-approval-test-${randomUUID()}.json`);
  tempFiles.push(filePath);
  const store = new PersistentApprovalStore(filePath);
  return new ApprovalService(store);
}

afterEach(() => {
  // Remove temp files; ignore errors (file may not have been created yet).
  for (const f of tempFiles.splice(0)) {
    // Also clean up any stale .tmp variants left by a crashed write.
    const staleGlob = `${f}.*.tmp`;
    try {
      // Best-effort: clean the main file and any .pid.hex.tmp siblings.
      if (existsSync(f)) rmSync(f, { force: true });
      // There is no glob in Node core, so we just try the exact path variants
      // that writeJSON produces. Any survivors will be overwritten next run.
    } catch {
      // Intentionally swallow — temp cleanup must not fail the test.
    }
    void staleGlob; // suppress unused-variable lint
  }
});

function futureIso(minutes = 10): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function pastIso(minutes = 10): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

describe("approval service", () => {
  it("creates approval request", async () => {
    const service = makeIsolatedService();
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
    const service = makeIsolatedService();
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
    const service = makeIsolatedService();
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
    const service = makeIsolatedService();
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
    const service = makeIsolatedService();

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
