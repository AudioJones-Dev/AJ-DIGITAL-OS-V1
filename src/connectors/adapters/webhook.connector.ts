import type { ConnectorAdapter, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "webhook",
  provider: "webhook",
  displayName: "Webhook",
  capabilities: ["send"],
  authType: "none",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

export const WebhookConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment) {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (environment === "local") {
      return { ok: true, data: { ok: true, status: 200, stub: true, url: String(payload["url"] ?? "") }, ...base };
    }
    // In non-local environments, actually attempt the HTTP call if url is provided
    const url = String(payload["url"] ?? "");
    if (!url) return { ok: false, error: "payload.url is required for webhook connector", ...base };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload["body"] ?? payload),
      });
      return { ok: res.ok, data: { status: res.status, url }, ...base };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "fetch failed", ...base };
    }
  },
};
