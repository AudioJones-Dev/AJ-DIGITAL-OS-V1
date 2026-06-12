import type { ConnectorAdapter, ConnectorCapability, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "gmail",
  provider: "google",
  displayName: "Gmail",
  capabilities: ["read", "send", "list", "search"],
  authType: "oauth",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

export const GmailConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment) {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (environment !== "local") return { ok: false, error: "not configured — set GOOGLE_OAUTH_TOKEN", ...base };
    if (action === "send") {
      return { ok: true, data: { messageId: "stub-msg-001", status: "sent", to: payload["to"] ?? "" }, ...base };
    }
    if (action === "list") {
      return { ok: true, data: [{ id: "msg-001", subject: "Test Email", from: "test@example.com" }], ...base };
    }
    if (action === "read") {
      return { ok: true, data: { id: payload["messageId"] ?? "msg-001", body: "[stub email body]" }, ...base };
    }
    return { ok: true, data: [], ...base };
  },
};
