import type { ConnectorAdapter, ConnectorCapability, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "github",
  provider: "github",
  displayName: "GitHub",
  capabilities: ["read", "write", "list", "search", "create"],
  authType: "api_key",
  riskLevel: "high",
  version: "1.0.0",
  enabled: false,
};

export const GitHubConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment) {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (environment !== "local") return { ok: false, error: "not configured — set GITHUB_TOKEN", ...base };
    if (action === "list") {
      return { ok: true, data: [{ id: 1, name: "AJ-DIGITAL-OS", full_name: "AudioJones-Dev/AJ-DIGITAL-OS", private: true }], ...base };
    }
    if (action === "create") {
      return { ok: true, data: { id: 42, number: 1, title: String(payload["title"] ?? "stub issue"), state: "open" }, ...base };
    }
    if (action === "search") {
      return { ok: true, data: { total_count: 1, items: [{ id: 1, name: "AJ-DIGITAL-OS" }] }, ...base };
    }
    return { ok: true, data: { content: "[stub file content]", sha: "abc123" }, ...base };
  },
};
