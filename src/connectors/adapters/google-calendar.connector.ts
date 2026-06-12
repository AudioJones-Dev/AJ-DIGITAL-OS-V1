import type { ConnectorAdapter, ConnectorCapability, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "google-calendar",
  provider: "google",
  displayName: "Google Calendar",
  capabilities: ["read", "write", "list", "create"],
  authType: "oauth",
  riskLevel: "low",
  version: "1.0.0",
  enabled: false,
};

export const GoogleCalendarConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment) {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (environment !== "local") return { ok: false, error: "not configured — set GOOGLE_OAUTH_TOKEN", ...base };
    if (action === "list") {
      return { ok: true, data: [{ id: "evt-001", title: "Team Standup", start: "2026-04-28T09:00:00Z", end: "2026-04-28T09:30:00Z" }], ...base };
    }
    if (action === "create") {
      return { ok: true, data: { id: "evt-002", title: String(payload["title"] ?? "New Event"), status: "created" }, ...base };
    }
    return { ok: true, data: { id: payload["eventId"] ?? "evt-001" }, ...base };
  },
};
