import type { ConnectorAdapter, ConnectorResult, OSConnector } from "../connector-types.js";

/**
 * Google Ads connector (Social Ops Phase 1 stub).
 *
 * Domain: paid analytics. The Google Ads MCP is documented as READ-ONLY in its
 * current release (account discovery + performance reporting), so this adapter
 * actively rejects any write/mutation action even in stub mode. A write-capable
 * path requires a separate approval gate and a new capability set — encoding the
 * read-only property now prevents a "it worked in the stub" surprise later.
 *
 * Phase 1 contract: disabled by default, local stub only, no network calls,
 * no credentials.
 */
const META: OSConnector = {
  id: "google-ads",
  provider: "google-ads",
  displayName: "Google Ads (read-only)",
  capabilities: ["read", "list"],
  authType: "oauth",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

const READ_ONLY_ACTIONS = new Set(["read", "list"]);

export const GoogleAdsConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, _payload, environment): Promise<ConnectorResult> {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };

    // Enforce read-only regardless of environment — mutations are never allowed
    // through this connector in its current release.
    if (!READ_ONLY_ACTIONS.has(action)) {
      return { ok: false, error: `google-ads is read-only — action not permitted: ${action}`, ...base };
    }

    if (environment !== "local") {
      return { ok: false, error: "not configured — Google Ads API credentials required for google-ads connector", ...base };
    }

    if (action === "list") {
      return { ok: true, data: { accounts: [{ id: "stub-ads-account-001", name: "[stub ads account]" }], stub: true }, ...base };
    }
    // read → performance report
    return {
      ok: true,
      data: { campaigns: [{ id: "stub-campaign-001", impressions: 0, clicks: 0, cost: 0 }], stub: true },
      ...base,
    };
  },
};
