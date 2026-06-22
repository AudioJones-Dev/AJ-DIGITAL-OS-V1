import type { ConnectorAdapter, ConnectorResult, OSConnector } from "../connector-types.js";

const META: OSConnector = {
  id: "resend",
  provider: "resend",
  displayName: "Resend",
  capabilities: ["send"],
  authType: "api_key",
  riskLevel: "medium",
  version: "1.0.0",
  enabled: false,
};

function stringField(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function buildEmailPayload(payload: Record<string, unknown>): Record<string, unknown> | string {
  const from = stringField(payload, "from") ?? process.env["DEFAULT_FROM_EMAIL"];
  const to = payload["to"];
  const subject = stringField(payload, "subject");
  const html = stringField(payload, "html");
  const text = stringField(payload, "text");

  if (!from) return "payload.from or DEFAULT_FROM_EMAIL is required";
  if (!subject) return "payload.subject is required";
  if (!html && !text) return "payload.html or payload.text is required";
  if (typeof to !== "string" && !Array.isArray(to)) return "payload.to is required";

  const email: Record<string, unknown> = { from, to, subject };
  if (html) email["html"] = html;
  if (text) email["text"] = text;
  if (payload["replyTo"] !== undefined) email["reply_to"] = payload["replyTo"];
  if (payload["cc"] !== undefined) email["cc"] = payload["cc"];
  if (payload["bcc"] !== undefined) email["bcc"] = payload["bcc"];
  if (payload["tags"] !== undefined) email["tags"] = payload["tags"];
  return email;
}

export const ResendConnector: ConnectorAdapter = {
  connector: META,
  async execute(action, payload, environment): Promise<ConnectorResult> {
    const base = { connectorId: META.id, action, executedAt: new Date().toISOString() };
    if (action !== "send") return { ok: false, error: "unsupported resend action", ...base };

    const emailPayload = buildEmailPayload(payload);
    if (typeof emailPayload === "string") return { ok: false, error: emailPayload, ...base };

    if (environment === "local") {
      return {
        ok: true,
        data: { id: "stub-resend-email-001", status: "sent", stub: true },
        ...base,
      };
    }

    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) return { ok: false, error: "RESEND_API_KEY is required for resend connector", ...base };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error =
          typeof body === "object" && body !== null && "message" in body
            ? String((body as Record<string, unknown>)["message"])
            : `Resend API returned ${response.status}`;
        return { ok: false, error, ...base };
      }
      return { ok: true, data: body, ...base };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Resend API request failed", ...base };
    }
  },
};
