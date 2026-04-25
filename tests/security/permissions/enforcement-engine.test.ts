import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enforceAgentAction } from "../../../src/security/permissions/enforcement-engine.js";
import { executeWithEnforcement } from "../../../src/security/permissions/enforced-execution.js";

let tempDir = "";
let previousAuditPath: string | undefined;

describe("permission enforcement engine", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "aj-perm-audit-"));
    previousAuditPath = process.env.AJ_AGENT_AUDIT_LOG_PATH;
    process.env.AJ_AGENT_AUDIT_LOG_PATH = path.join(tempDir, "agent-action-audit.jsonl");
  });

  afterEach(async () => {
    if (previousAuditPath === undefined) {
      delete process.env.AJ_AGENT_AUDIT_LOG_PATH;
    } else {
      process.env.AJ_AGENT_AUDIT_LOG_PATH = previousAuditPath;
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("allows read action at level 0", async () => {
    const result = await enforceAgentAction(
      {
        agentId: "agent-read",
        actionType: "read_file",
        target: "README.md",
      },
      {
        permissionLevel: 0,
      },
    );

    expect(result.decision).toBe("allow");
    expect(result.category).toBe("READ");
  });

  it("blocks file write at level 0", async () => {
    const result = await enforceAgentAction(
      {
        agentId: "agent-read",
        actionType: "write_file",
        target: "src/new.ts",
      },
      {
        permissionLevel: 0,
      },
    );

    expect(result.decision).toBe("block");
    expect(result.category).toBe("WRITE");
  });

  it("allows safe command at level 2", async () => {
    const result = await enforceAgentAction(
      {
        agentId: "agent-local",
        actionType: "terminal_command",
        command: "npm run test",
      },
      {
        permissionLevel: 2,
      },
    );

    expect(result.decision).toBe("allow");
    expect(result.category).toBe("COMMAND_SAFE");
  });

  it("requires approval for git push at level 4", { timeout: 15_000 }, async () => {
    const result = await enforceAgentAction(
      {
        agentId: "agent-remote",
        actionType: "terminal_command",
        command: "git push origin main",
        target: "origin/main",
      },
      {
        permissionLevel: 4,
      },
    );

    expect(result.decision).toBe("require_approval");
    expect(result.category).toBe("GIT_PUSH");
  });

  it("requires approval for rm -rf at level 5 and blocks lower levels", async () => {
    const lowLevel = await enforceAgentAction(
      {
        agentId: "agent-low",
        actionType: "terminal_command",
        command: "rm -rf ./tmp",
      },
      {
        permissionLevel: 2,
      },
    );

    const highLevelNoApproval = await enforceAgentAction(
      {
        agentId: "agent-admin",
        actionType: "terminal_command",
        command: "rm -rf ./tmp",
      },
      {
        permissionLevel: 5,
      },
    );

    expect(lowLevel.decision).toBe("block");
    expect(highLevelNoApproval.decision).toBe("require_approval");
    expect(highLevelNoApproval.category).toBe("COMMAND_RESTRICTED");
  });

  it("requires approval for secret modification", { timeout: 15_000 }, async () => {
    const result = await enforceAgentAction(
      {
        agentId: "agent-secrets",
        actionType: "secret_modify",
        target: "SUPABASE_SERVICE_ROLE_KEY",
      },
      {
        permissionLevel: 5,
      },
    );

    expect(result.decision).toBe("require_approval");
    expect(result.category).toBe("SECRET_MODIFY");
  });

  it("ensures blocked command never executes", async () => {
    let executed = false;

    await expect(
      executeWithEnforcement(
        {
          agentId: "agent-low",
          actionType: "terminal_command",
          command: "rm -rf ./tmp",
        },
        {
          permissionLevel: 2,
        },
        async () => {
          executed = true;
          return { ok: true };
        },
      ),
    ).rejects.toThrowError();

    expect(executed).toBe(false);
  });

  it("ensures approval-gated command does not execute without approval", { timeout: 15_000 }, async () => {
    let executed = false;

    const result = await executeWithEnforcement(
      {
        agentId: "agent-remote",
        actionType: "terminal_command",
        command: "git push origin main",
        target: "origin/main",
      },
      {
        permissionLevel: 4,
      },
      async () => {
        executed = true;
        return { ok: true };
      },
    );

    expect(result.status).toBe("approval_required");
    expect(executed).toBe(false);
  });
});
