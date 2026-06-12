import type { ConnectorAdapter, ConnectorCapability, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "airtable",
  provider: "airtable",
  displayName: "Airtable",
  capabilities: ["read", "write", "list", "create", "update", "delete", "search"],
  authType: "api_key",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

export const AirtableConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment) {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (environment !== "local") return { ok: false, error: "not configured — set AIRTABLE_API_KEY", ...base };
    if (action === "list" || action === "search") {
      return { ok: true, data: { records: [{ id: "rec001", fields: { Name: "Lead Alpha", Status: "New", Score: 85 } }] }, ...base };
    }
    if (action === "create") {
      return { ok: true, data: { id: "rec002", fields: payload["fields"] ?? {} }, ...base };
    }
    if (action === "update") {
      return { ok: true, data: { id: String(payload["recordId"] ?? "rec001"), fields: payload["fields"] ?? {} }, ...base };
    }
    if (action === "delete") {
      return { ok: true, data: { deleted: true, id: String(payload["recordId"] ?? "rec001") }, ...base };
    }
    return { ok: true, data: { id: String(payload["recordId"] ?? "rec001"), fields: {} }, ...base };
  },
};
