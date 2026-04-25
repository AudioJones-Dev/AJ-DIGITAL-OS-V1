import { describe, expect, it } from "vitest";

import { validateTenantContext } from "../../../src/security/tenancy/tenant-context.js";
import { evaluateTenantPolicy } from "../../../src/security/tenancy/tenant-policy.js";
import type { TenantContext } from "../../../src/security/tenancy/tenant-types.js";

const baseContext: TenantContext = {
  tenantId: "internal-aj",
  tenantType: "internal_aj",
  workspaceRoot: "c:/dev/AJ-DIGITAL-OS/data/internal",
  dataClassification: "internal",
  allowedAgents: ["agent-ops"],
  allowedTools: ["read_file", "run_safe_command"],
  allowedEnvironments: ["local", "dev"],
  retentionPolicy: "365-days",
  createdAt: new Date().toISOString(),
};

describe("tenant policy", () => {
  it("validates tenant context", () => {
    const result = validateTenantContext(baseContext);
    expect(result.valid).toBe(true);
  });

  it("blocks unassigned agent", () => {
    const result = evaluateTenantPolicy({
      context: baseContext,
      agentId: "agent-unassigned",
      toolName: "read_file",
      environment: "dev",
    });

    expect(result.allowed).toBe(false);
  });

  it("blocks unauthorized tool", () => {
    const result = evaluateTenantPolicy({
      context: baseContext,
      agentId: "agent-ops",
      toolName: "browser_task",
      environment: "dev",
    });

    expect(result.allowed).toBe(false);
  });

  it("blocks environment outside allowed list", () => {
    const result = evaluateTenantPolicy({
      context: baseContext,
      agentId: "agent-ops",
      toolName: "read_file",
      environment: "production",
    });

    expect(result.allowed).toBe(false);
  });

  it("blocks restricted data in sandbox/demo", () => {
    const sandboxContext: TenantContext = {
      ...baseContext,
      tenantId: "sandbox-1",
      tenantType: "sandbox",
      allowedEnvironments: ["dev"],
      dataClassification: "public",
    };

    const result = evaluateTenantPolicy({
      context: sandboxContext,
      agentId: "agent-ops",
      toolName: "read_file",
      environment: "dev",
      requestedDataClassification: "restricted",
    });

    expect(result.allowed).toBe(false);
  });

  it("allows valid internal AJ context", () => {
    const result = evaluateTenantPolicy({
      context: baseContext,
      agentId: "agent-ops",
      toolName: "read_file",
      environment: "dev",
      requestedDataClassification: "internal",
    });

    expect(result.allowed).toBe(true);
  });
});
