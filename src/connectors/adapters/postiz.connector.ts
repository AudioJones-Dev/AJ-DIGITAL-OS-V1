import type { ConnectorAdapter, ConnectorResult, OSConnector } from "../connector-types.js";

/**
 * Postiz scheduler connector (Social Ops Phase 1 stub).
 *
 * Domain: scheduler. Postiz can list connected social integrations, inspect
 * platform posting schema, create draft posts, and schedule approved posts.
 *
 * Phase 1 contract: disabled by default, local stub only, no network calls.
 * Scheduling/publishing authority is gated by the approval layer, not here —
 * this adapter only proves deterministic stub behavior and credential gating.
 * Fine-grained social capabilities (social.post.draft, social.post.schedule)
 * travel in the payload; the connector-level capability stays generic.
 */
const META: OSConnector = {
  id: "postiz",
  provider: "postiz",
  displayName: "Postiz",
  capabilities: ["list", "read", "create", "update"],
  authType: "api_key",
  riskLevel: "high",
  version: "1.0.0",
  enabled: false,
};

export const PostizConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment): Promise<ConnectorResult> {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };

    if (environment !== "local") {
      return { ok: false, error: "not configured — POSTIZ_API_KEY required for postiz connector", ...base };
    }

    switch (action) {
      case "list":
        return {
          ok: true,
          data: {
            integrations: [
              { id: "stub-integration-001", platform: "x", display: "[stub account]" },
              { id: "stub-integration-002", platform: "linkedin", display: "[stub account]" },
            ],
            stub: true,
          },
          ...base,
        };
      case "read":
        return {
          ok: true,
          data: { queue: [], schema: { maxLength: 0, supportsImages: true, supportsVideo: true }, stub: true },
          ...base,
        };
      case "create":
        return {
          ok: true,
          data: { id: "stub-postiz-draft-001", status: "draft", content: String(payload["content"] ?? "[stub draft]"), stub: true },
          ...base,
        };
      case "update":
        // Represents schedule/queue mutation — approval-gated at a higher layer.
        return {
          ok: true,
          data: { id: String(payload["id"] ?? "stub-postiz-draft-001"), status: "scheduled", stub: true },
          ...base,
        };
      default:
        return { ok: false, error: `unsupported postiz action: ${action}`, ...base };
    }
  },
};
