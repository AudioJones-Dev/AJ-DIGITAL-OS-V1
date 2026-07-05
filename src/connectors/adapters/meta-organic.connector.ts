import type { ConnectorAdapter, ConnectorResult, OSConnector } from "../connector-types.js";

/**
 * Meta organic connector (Social Ops Phase 1 stub).
 *
 * Domain: organic (Facebook Pages + Instagram professional). Reads account
 * metadata and insights (guarded), and represents publishing/profile writes
 * as restricted-risk actions. Restricted risk means the executor tenant-gate
 * applies in non-local/non-dev environments, and every external write must be
 * approval-gated at a higher layer.
 *
 * Phase 1 contract: disabled by default, local stub only, no network calls,
 * no Graph API tokens. Live capability and permission/app-review state must be
 * verified per account before any write path is wired.
 */
const META: OSConnector = {
  id: "meta-organic",
  provider: "meta",
  displayName: "Meta Organic (Facebook/Instagram)",
  capabilities: ["read", "list", "create"],
  authType: "oauth",
  riskLevel: "restricted",
  version: "1.0.0",
  enabled: false,
};

export const MetaOrganicConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment): Promise<ConnectorResult> {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };

    if (environment !== "local") {
      return {
        ok: false,
        error: "not configured — Meta Graph API credentials and verified permissions required for meta-organic connector",
        ...base,
      };
    }

    switch (action) {
      case "list":
        return {
          ok: true,
          data: {
            accounts: [
              { id: "stub-page-001", type: "facebook_page", name: "[stub page]" },
              { id: "stub-ig-001", type: "instagram_professional", name: "[stub ig]" },
            ],
            stub: true,
          },
          ...base,
        };
      case "read":
        return { ok: true, data: { insights: { impressions: 0, reach: 0, engagement: 0 }, stub: true }, ...base };
      case "create":
        // Represents a publish request — restricted, approval-gated upstream.
        return {
          ok: true,
          data: { id: "stub-meta-post-001", status: "stub_published", message: String(payload["message"] ?? "[stub post]"), stub: true },
          ...base,
        };
      default:
        return { ok: false, error: `unsupported meta-organic action: ${action}`, ...base };
    }
  },
};
