import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { runApprovalCli } from "../../../src/security/approvals/approval-cli.js";
import { ApprovalService } from "../../../src/security/approvals/approval-service.js";
import { InMemoryApprovalStore } from "../../../src/security/approvals/approval-store.js";

function futureIso(minutes = 10): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function pastIso(minutes = 10): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function makeService(): ApprovalService {
  return new ApprovalService(new InMemoryApprovalStore());
}

async function seedPending(service: ApprovalService, overrides: { expiresAt?: string } = {}): Promise<string> {
  const created = await service.createApprovalRequest({
    approvalType: "git_push",
    requestedByAgentId: "agent-1",
    permissionLevel: 4,
    actionCategory: "GIT_PUSH",
    risk: "high",
    reason: "push to main",
    expiresAt: overrides.expiresAt ?? futureIso(),
    environment: "dev",
    target: "main",
    clientId: "client-a",
  });
  return created.approvalId;
}

describe("runApprovalCli", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = 0;
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it("list shows pending approvals", async () => {
    const service = makeService();
    await seedPending(service);

    const code = await runApprovalCli(["list"], service);

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(code).toBe(0);
    expect(output).toContain("GIT_PUSH");
    expect(output).toContain("high");
    expect(output).toContain("push to main");
    expect(output).toContain("dev");
    expect(output).toContain("client-a");
  });

  it("list outputs message when no pending approvals", async () => {
    const service = makeService();
    const code = await runApprovalCli(["list"], service);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith("No pending approvals.");
  });

  // -------------------------------------------------------------------------
  // approve
  // -------------------------------------------------------------------------

  it("approve updates pending approval to approved", async () => {
    const service = makeService();
    const id = await seedPending(service);

    const code = await runApprovalCli(["approve", id], service);

    const updated = await service.getApprovalById(id);
    expect(code).toBe(0);
    expect(updated?.status).toBe("approved");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Approved"));
  });

  it("approve with missing approval returns exit code 1", async () => {
    const service = makeService();
    const code = await runApprovalCli(["approve", "nonexistent-id"], service);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("not found"));
  });

  it("approve with expired approval returns exit code 1", async () => {
    const service = makeService();
    const id = await seedPending(service, { expiresAt: pastIso() });
    // Trigger expiry by fetching (service will mark it expired)
    await service.getApprovalById(id);

    const code = await runApprovalCli(["approve", id], service);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("expired"));
  });

  it("approve without id returns exit code 1", async () => {
    const service = makeService();
    const code = await runApprovalCli(["approve"], service);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Usage"));
  });

  // -------------------------------------------------------------------------
  // deny
  // -------------------------------------------------------------------------

  it("deny updates pending approval to denied", async () => {
    const service = makeService();
    const id = await seedPending(service);

    const code = await runApprovalCli(["deny", id], service);

    const updated = await service.getApprovalById(id);
    expect(code).toBe(0);
    expect(updated?.status).toBe("denied");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Denied"));
  });

  it("deny with missing approval returns exit code 1", async () => {
    const service = makeService();
    const code = await runApprovalCli(["deny", "nonexistent-id"], service);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("not found"));
  });

  it("deny without id returns exit code 1", async () => {
    const service = makeService();
    const code = await runApprovalCli(["deny"], service);
    expect(code).toBe(1);
  });

  // -------------------------------------------------------------------------
  // unknown command
  // -------------------------------------------------------------------------

  it("unknown command returns exit code 1", async () => {
    const service = makeService();
    const code = await runApprovalCli(["noop"], service);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
  });
});

