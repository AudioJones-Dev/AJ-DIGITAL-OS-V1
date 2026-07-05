import type { ConnectorAdapter, ConnectorResult, OSConnector } from "../connector-types.js";

/**
 * Canva creative connector (Social Ops Phase 1 stub).
 *
 * Domain: creative. Canva can generate/edit draft designs, search assets,
 * read brand kits, and export. It is a creative tool, NOT a publishing
 * authority: it cannot publish, update platform profiles, or bypass
 * brand/claims review.
 *
 * Phase 1 contract: disabled by default, local stub only, no network calls.
 * The adapter rejects publish-like actions (send/delete) by surface area —
 * only read/list/search/create are exposed.
 */
const META: OSConnector = {
  id: "canva",
  provider: "canva",
  displayName: "Canva",
  capabilities: ["read", "list", "search", "create"],
  authType: "oauth",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

export const CanvaConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment): Promise<ConnectorResult> {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };

    if (environment !== "local") {
      return { ok: false, error: "not configured — Canva OAuth/MCP credentials required for canva connector", ...base };
    }

    switch (action) {
      case "read":
        return { ok: true, data: { brandKit: { id: "stub-brandkit-001", name: "[stub brand kit]" }, stub: true }, ...base };
      case "list":
        return { ok: true, data: { designs: [{ id: "stub-design-001", title: "[stub design]" }], stub: true }, ...base };
      case "search":
        return { ok: true, data: { assets: [{ id: "stub-asset-001", type: "image" }], stub: true }, ...base };
      case "create":
        // Draft generation only — never a client-facing publish.
        return {
          ok: true,
          data: { id: "stub-canva-design-001", status: "draft", prompt: String(payload["prompt"] ?? "[stub prompt]"), stub: true },
          ...base,
        };
      default:
        return { ok: false, error: `unsupported canva action: ${action}`, ...base };
    }
  },
};
