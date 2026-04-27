/**
 * Lead Email Notification — Florida Platform Lift Pros
 *
 * Sends alert emails via the Resend HTTP API when a new lead is submitted.
 * Uses fetch directly — no Resend npm package required.
 *
 * Required env:
 *   RESEND_API_KEY         — Resend API key
 *   INTERNAL_ALERT_EMAIL   — recipient (default: contact@floridaplatformliftpros.com)
 *   DEFAULT_FROM_EMAIL     — sender address (e.g. leads@floridaplatformliftpros.com)
 *
 * Fail-open: if Resend fails the lead is still stored; the error is logged safely.
 */

import type { DbLead } from "../../db/db-types.js";

const TAG = "[LEAD-EMAIL]";

const BRAND = "Florida Platform Lift Pros";
const FALLBACK_ALERT_EMAIL = "contact@floridaplatformliftpros.com";
const RESEND_SEND_URL = "https://api.resend.com/emails";

// ── Safe Formatting ────────────────────────────────────────────────

function fmt(value: string | null | undefined): string {
  return value?.trim() || "—";
}

function buildSubject(lead: DbLead): string {
  const service = lead.service_needed?.trim() || "General Inquiry";
  return `New ${BRAND} Lead — ${service}`;
}

function buildTextBody(lead: DbLead): string {
  return [
    `New lead received from ${BRAND}.`,
    "",
    `Name:          ${fmt(lead.name)}`,
    `Email:         ${fmt(lead.email)}`,
    `Phone:         ${fmt(lead.phone)}`,
    `County:        ${fmt(lead.county)}`,
    `City:          ${fmt(lead.city)}`,
    `Service:       ${fmt(lead.service_needed)}`,
    `Property Type: ${fmt(lead.property_type)}`,
    `Timeline:      ${fmt(lead.timeline)}`,
    `Message:       ${fmt(lead.message)}`,
    "",
    "── Attribution ─────────────────────────────────────",
    `Source Page:   ${fmt(lead.lead_source_page)}`,
    `UTM Source:    ${fmt(lead.utm_source)}`,
    `UTM Medium:    ${fmt(lead.utm_medium)}`,
    `UTM Campaign:  ${fmt(lead.utm_campaign)}`,
    "",
    `Lead ID:       ${lead.id}`,
    `Submitted:     ${lead.created_at}`,
  ].join("\n");
}

function buildHtmlBody(lead: DbLead): string {
  const row = (label: string, value: string | null | undefined) =>
    `<tr><td style="padding:4px 12px 4px 0;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:4px 0">${fmt(value)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>New Lead</title></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:4px">${BRAND}</h2>
  <p style="margin-top:0;color:#555">New lead received</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
  <table cellpadding="0" cellspacing="0" border="0">
    ${row("Name", lead.name)}
    ${row("Email", lead.email)}
    ${row("Phone", lead.phone)}
    ${row("County", lead.county)}
    ${row("City", lead.city)}
    ${row("Service Needed", lead.service_needed)}
    ${row("Property Type", lead.property_type)}
    ${row("Timeline", lead.timeline)}
  </table>
  ${lead.message ? `<p style="margin-top:16px"><strong>Message:</strong><br>${lead.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ""}
  <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
  <table cellpadding="0" cellspacing="0" border="0" style="font-size:12px;color:#555">
    ${row("Source Page", lead.lead_source_page)}
    ${row("UTM Source", lead.utm_source)}
    ${row("UTM Medium", lead.utm_medium)}
    ${row("UTM Campaign", lead.utm_campaign)}
    ${row("Lead ID", lead.id)}
    ${row("Submitted", lead.created_at)}
  </table>
</body>
</html>`;
}

// ── Resend Sender ──────────────────────────────────────────────────

export interface LeadEmailResult {
  ok: boolean;
  messageId: string | null;
  error: string | null;
}

export async function sendLeadAlert(lead: DbLead): Promise<LeadEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`${TAG} RESEND_API_KEY not set — skipping email alert for lead ${lead.id}`);
    return { ok: false, messageId: null, error: "RESEND_API_KEY not configured" };
  }

  const toEmail =
    process.env.INTERNAL_ALERT_EMAIL?.trim() || FALLBACK_ALERT_EMAIL;
  const fromEmail =
    process.env.DEFAULT_FROM_EMAIL?.trim() || `leads@floridaplatformliftpros.com`;

  const payload = {
    from: fromEmail,
    to: [toEmail],
    subject: buildSubject(lead),
    text: buildTextBody(lead),
    html: buildHtmlBody(lead),
  };

  try {
    const res = await fetch(RESEND_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${TAG} Resend responded ${res.status} for lead ${lead.id}`);
      return { ok: false, messageId: null, error: `Resend error ${res.status}` };
    }

    const data = await res.json() as { id?: string };
    const messageId = data.id ?? null;
    console.log(`${TAG} alert sent — messageId=${messageId} lead=${lead.id}`);
    return { ok: true, messageId, error: null };
  } catch (err) {
    console.error(`${TAG} Failed to send lead alert for ${lead.id}:`, err instanceof Error ? err.message : String(err));
    return { ok: false, messageId: null, error: "Email send failed" };
  }
}
