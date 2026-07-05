import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Isolate registry + audit paths per test run (mirrors connector.test.ts)
const testRunId = randomUUID();
let tmpDir = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), `aj-social-test-${testRunId.slice(0, 8)}-`));
  process.env["AJ_CONNECTOR_REGISTRY_PATH"] = path.join(tmpDir, "registry.json");
  process.env["AJ_CONNECTOR_AUDIT_PATH"] = path.join(tmpDir, "audit.jsonl");
});

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
  delete process.env["AJ_CONNECTOR_REGISTRY_PATH"];
  delete process.env["AJ_CONNECTOR_AUDIT_PATH"];
  vi.restoreAllMocks();
});

import { registerConnector } from "../../src/connectors/connector-registry.js";
import { executeConnector } from "../../src/connectors/connector-executor.js";
import {
  PostizConnector,
  CanvaConnector,
  MetaOrganicConnector,
  GoogleAdsConnector,
} from "../../src/connectors/adapters/index.js";

describe("social-ops connector metadata", () => {
  it("1. all social connectors are disabled by default", () => {
    expect(PostizConnector.connector.enabled).toBe(false);
    expect(CanvaConnector.connector.enabled).toBe(false);
    expect(MetaOrganicConnector.connector.enabled).toBe(false);
    expect(GoogleAdsConnector.connector.enabled).toBe(false);
  });

  it("2. risk levels match doctrine (postiz high, canva medium, meta restricted, ads medium)", () => {
    expect(PostizConnector.connector.riskLevel).toBe("high");
    expect(CanvaConnector.connector.riskLevel).toBe("medium");
    expect(MetaOrganicConnector.connector.riskLevel).toBe("restricted");
    expect(GoogleAdsConnector.connector.riskLevel).toBe("medium");
  });

  it("3. google-ads exposes no write capabilities", () => {
    expect(GoogleAdsConnector.connector.capabilities).toEqual(["read", "list"]);
  });
});

describe("social-ops disabled-by-default enforcement", () => {
  it("4. disabled postiz cannot execute", async () => {
    registerConnector({ ...PostizConnector.connector, enabled: false });
    const result = await executeConnector({ connectorId: "postiz", action: "list", payload: {}, environment: "local" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("disabled");
  });
});

describe("postiz scheduler stub", () => {
  it("5. lists connected integrations in local env when enabled", async () => {
    registerConnector({ ...PostizConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "postiz", action: "list", payload: {}, environment: "local" });
    expect(result.ok).toBe(true);
    expect((result.data as Record<string, unknown>)["stub"]).toBe(true);
  });

  it("6. requires credentials outside local env", async () => {
    registerConnector({ ...PostizConnector.connector, enabled: true });
    const result = await executeConnector({
      connectorId: "postiz",
      action: "create",
      payload: { content: "hello" },
      tenantId: "tenant-test",
      environment: "production",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("POSTIZ_API_KEY");
  });

  it("7. rejects an unsupported action", async () => {
    registerConnector({ ...PostizConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "postiz", action: "delete", payload: {}, environment: "local" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unsupported postiz action");
  });
});

describe("canva creative stub", () => {
  it("8. generates a draft design (never publishes) in local env", async () => {
    registerConnector({ ...CanvaConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "canva", action: "create", payload: { prompt: "brand banner" }, environment: "local" });
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data["status"]).toBe("draft");
    expect(data["stub"]).toBe(true);
  });

  it("9. rejects a publish-like action it does not expose", async () => {
    registerConnector({ ...CanvaConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "canva", action: "send", payload: {}, environment: "local" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unsupported canva action");
  });
});

describe("meta-organic restricted stub", () => {
  it("10. tenant-gated: blocked without tenantId in production", async () => {
    registerConnector({ ...MetaOrganicConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "meta-organic", action: "read", payload: {}, environment: "production" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("tenantId required");
  });

  it("11. reads insights stub in local env", async () => {
    registerConnector({ ...MetaOrganicConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "meta-organic", action: "read", payload: {}, environment: "local" });
    expect(result.ok).toBe(true);
    expect((result.data as Record<string, unknown>)["stub"]).toBe(true);
  });
});

describe("google-ads read-only enforcement", () => {
  it("12. rejects a write action even in local env", async () => {
    registerConnector({ ...GoogleAdsConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "google-ads", action: "create", payload: {}, environment: "local" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("read-only");
  });

  it("13. allows a performance read in local env", async () => {
    registerConnector({ ...GoogleAdsConnector.connector, enabled: true });
    const result = await executeConnector({ connectorId: "google-ads", action: "read", payload: {}, environment: "local" });
    expect(result.ok).toBe(true);
    expect((result.data as Record<string, unknown>)["stub"]).toBe(true);
  });
});
