import { describe, expect, it } from "vitest";

import {
  AgentIdentityResolutionError,
  AgentTenantMismatchError,
  assertAgentTenantAccess,
  assertAgentToolAccess,
  resolveAgentContext,
} from "../../../src/security/agents/agent-registry.js";

describe("agent identity registry", () => {
  it("resolves known agent context", () => {
    const context = resolveAgentContext("api-mcp-execute");

    expect(context.agentId).toBe("api-mcp-execute");
    expect(context.permissionLevel).toBe(2);
    expect(context.allowedTools).toContain("run_safe_command");
  });

  it("blocks unknown agents", () => {
    expect(() => resolveAgentContext("unknown-agent")).toThrowError(AgentIdentityResolutionError);
  });

  it("blocks tenant mismatch for tenant-scoped agents", () => {
    const context = {
      ...resolveAgentContext("api-mcp-execute"),
      tenantId: "client-a",
    };

    expect(() => assertAgentTenantAccess(context, "client-b")).toThrowError(AgentTenantMismatchError);
  });

  it("blocks tools outside allowed list", () => {
    const context = resolveAgentContext("run-store");
    expect(() => assertAgentToolAccess(context, "run_safe_command")).toThrowError();
  });
});
