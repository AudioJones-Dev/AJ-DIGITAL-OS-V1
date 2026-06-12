import type { ConnectorAdapter, ConnectorCapability, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "google-drive",
  provider: "google",
  displayName: "Google Drive",
  capabilities: ["read", "write", "list", "search", "delete"],
  authType: "oauth",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

function stub(action: ConnectorCapability): ConnectorResult["data"] {
  if (action === "list") return [{ id: "file-001", name: "Q1 Report.pdf", mimeType: "application/pdf" }];
  if (action === "read") return { id: "file-001", name: "Q1 Report.pdf", content: "[stub file content]" };
  if (action === "search") return [{ id: "file-002", name: "Lead Database.xlsx" }];
  return { ok: true };
}

export const GoogleDriveConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, _payload, environment) {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (environment !== "local") return { ok: false, error: "not configured — set GOOGLE_OAUTH_TOKEN", ...base };
    return { ok: true, data: stub(action), ...base };
  },
};
