/**
 * Admin Leads Handler — GET /admin/leads, PATCH /api/leads/:id
 *
 * Lightweight CRM admin interface for Florida Platform Lift Pros.
 *
 * Auth:
 *   Both routes require ADMIN_ACCESS_TOKEN env var.
 *   Pass token via query param:  ?token=<value>
 *   or header:                   X-Admin-Token: <value>
 *
 * GET /admin/leads              — HTML admin dashboard (or JSON with Accept: application/json)
 * GET /admin/leads?format=json  — force JSON response
 * PATCH /api/leads/:id          — update status, priority, notes, assigned_to
 */

import { z } from "zod";
import { patchLead, fetchLeads, fetchLeadStats } from "../services/leads/lead-storage.js";
import type { DbLead, LeadUpdateInput, LeadStatus, LeadPriority } from "../db/db-types.js";

const TAG = "[LEADS-ADMIN]";

// ── Auth Guard ─────────────────────────────────────────────────────

function resolveAdminToken(): string | null {
  return process.env.ADMIN_ACCESS_TOKEN?.trim() || null;
}

function checkAdminAccess(
  queryToken: string | null,
  headerToken: string | null,
): { ok: boolean; reason: string | null } {
  const expected = resolveAdminToken();

  if (!expected) {
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.AJ_OS_ENV === "production";
    if (isProduction) {
      return { ok: false, reason: "Admin access is not configured." };
    }
    // Development warning: allow access but warn
    console.warn(`${TAG} ADMIN_ACCESS_TOKEN is not set. Access permitted in development only.`);
    return { ok: true, reason: null };
  }

  const provided = queryToken ?? headerToken;
  if (!provided || provided !== expected) {
    return { ok: false, reason: "Unauthorized" };
  }

  return { ok: true, reason: null };
}

// ── PATCH /api/leads/:id ───────────────────────────────────────────

const LeadUpdateSchema = z.object({
  status: z
    .enum(["new", "contacted", "qualified", "estimate_scheduled", "estimate_sent", "won", "lost", "spam"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  notes: z.string().trim().max(5000).optional(),
  assigned_to: z.string().trim().max(200).optional(),
});

export interface LeadUpdateResponse {
  ok: boolean;
  data: DbLead | null;
  errors: string[];
}

export async function handleLeadUpdate(
  id: string,
  rawBody: string,
  queryToken: string | null,
  headerToken: string | null,
): Promise<{ statusCode: 200 | 400 | 401 | 403 | 404 | 422 | 500; body: LeadUpdateResponse }> {
  const auth = checkAdminAccess(queryToken, headerToken);
  if (!auth.ok) {
    return { statusCode: 401, body: { ok: false, data: null, errors: [auth.reason ?? "Unauthorized"] } };
  }

  if (!id || id.trim().length === 0) {
    return { statusCode: 400, body: { ok: false, data: null, errors: ["Lead ID is required"] } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: { ok: false, data: null, errors: ["Invalid JSON payload"] } };
  }

  const result = LeadUpdateSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".") || "root"}: ${i.message}`);
    return { statusCode: 422, body: { ok: false, data: null, errors } };
  }

  if (!result.data.status && !result.data.priority && result.data.notes === undefined && result.data.assigned_to === undefined) {
    return { statusCode: 400, body: { ok: false, data: null, errors: ["At least one field must be provided"] } };
  }

  const updatePayload: LeadUpdateInput = {};
  if (result.data.status !== undefined) updatePayload.status = result.data.status as LeadStatus;
  if (result.data.priority !== undefined) updatePayload.priority = result.data.priority as LeadPriority;
  if (result.data.notes !== undefined) updatePayload.notes = result.data.notes;
  if (result.data.assigned_to !== undefined) updatePayload.assigned_to = result.data.assigned_to;

  const updateResult = await patchLead(id, updatePayload);

  if (!updateResult.ok) {
    console.error(`${TAG} Lead update failed id=${id}:`, updateResult.error);
    if (updateResult.error?.includes("not found") || updateResult.error?.includes("0 rows")) {
      return { statusCode: 404, body: { ok: false, data: null, errors: ["Lead not found"] } };
    }
    return { statusCode: 500, body: { ok: false, data: null, errors: ["Update failed"] } };
  }

  console.log(`${TAG} lead updated — id=${id}`);
  return { statusCode: 200, body: { ok: true, data: updateResult.data, errors: [] } };
}

// ── HTML Admin Dashboard ───────────────────────────────────────────

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    new: "#2563eb",
    contacted: "#7c3aed",
    qualified: "#0891b2",
    estimate_scheduled: "#d97706",
    estimate_sent: "#ca8a04",
    won: "#16a34a",
    lost: "#6b7280",
    spam: "#dc2626",
  };
  const bg = colors[status] ?? "#6b7280";
  return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">${status}</span>`;
}

function priorityBadge(priority: string): string {
  const colors: Record<string, string> = {
    low: "#6b7280",
    normal: "#2563eb",
    high: "#d97706",
    urgent: "#dc2626",
  };
  const bg = colors[priority] ?? "#6b7280";
  return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">${priority}</span>`;
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function buildAdminHtml(
  leads: DbLead[],
  stats: { total: number; new_leads: number; urgent_leads: number },
  setupWarning: boolean,
): string {
  const rows = leads
    .map(
      (l) => `<tr>
      <td>${statusBadge(l.status)}</td>
      <td>${priorityBadge(l.priority)}</td>
      <td>${escapeHtml(l.service_needed)}</td>
      <td>${escapeHtml(l.name)}</td>
      <td>${escapeHtml(l.phone)}</td>
      <td>${escapeHtml(l.email)}</td>
      <td>${escapeHtml(l.county)}</td>
      <td style="white-space:nowrap">${fmtDate(l.created_at)}</td>
    </tr>`,
    )
    .join("\n");

  const warningBanner = setupWarning
    ? `<div style="background:#fef3c7;border:1px solid #d97706;border-radius:6px;padding:12px 16px;margin-bottom:20px;color:#92400e">
        <strong>⚠ Setup Warning:</strong> ADMIN_ACCESS_TOKEN is not configured.
        Set it in your .env file to protect this page in production.
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Leads — Florida Platform Lift Pros</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f9fafb;color:#111}
    h1{margin:0 0 4px}
    .subtitle{color:#6b7280;margin:0 0 20px;font-size:14px}
    .stats{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
    .stat{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px 24px;min-width:120px}
    .stat-value{font-size:28px;font-weight:700;line-height:1}
    .stat-label{font-size:12px;color:#6b7280;margin-top:4px}
    table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb}
    th{background:#f3f4f6;text-align:left;padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#374151}
    td{padding:10px 12px;border-top:1px solid #e5e7eb;font-size:13px;vertical-align:middle}
    tr:hover td{background:#f9fafb}
  </style>
</head>
<body>
  <h1>Florida Platform Lift Pros</h1>
  <p class="subtitle">Lead CRM Dashboard</p>
  ${warningBanner}
  <div class="stats">
    <div class="stat"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Leads</div></div>
    <div class="stat"><div class="stat-value">${stats.new_leads}</div><div class="stat-label">New Leads</div></div>
    <div class="stat"><div class="stat-value">${stats.urgent_leads}</div><div class="stat-label">Urgent</div></div>
  </div>
  ${leads.length === 0
    ? `<p style="color:#6b7280">No leads yet.</p>`
    : `<table>
    <thead><tr>
      <th>Status</th><th>Priority</th><th>Service</th>
      <th>Name</th><th>Phone</th><th>Email</th>
      <th>County</th><th>Submitted</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`}
</body>
</html>`;
}

// ── GET /admin/leads ───────────────────────────────────────────────

export interface AdminLeadsResponse {
  ok: boolean;
  stats: { total: number; new_leads: number; urgent_leads: number } | null;
  leads: DbLead[] | null;
  error: string | null;
}

export async function handleAdminLeads(
  queryToken: string | null,
  headerToken: string | null,
  forceJson: boolean,
  acceptHeader: string | null,
): Promise<{
  statusCode: 200 | 401 | 403 | 500;
  contentType: "application/json" | "text/html";
  body: string;
}> {
  const auth = checkAdminAccess(queryToken, headerToken);
  const setupWarning = !resolveAdminToken();

  if (!auth.ok) {
    const json: AdminLeadsResponse = { ok: false, stats: null, leads: null, error: auth.reason };
    return { statusCode: 401, contentType: "application/json", body: JSON.stringify(json) };
  }

  const [statsResult, leadsResult] = await Promise.all([
    fetchLeadStats(),
    fetchLeads(200),
  ]);

  const stats = statsResult.data ?? { total: 0, new_leads: 0, urgent_leads: 0 };
  const leads = leadsResult.data ?? [];

  const wantsJson = forceJson || (acceptHeader?.includes("application/json") ?? false);

  if (wantsJson) {
    const json: AdminLeadsResponse = { ok: true, stats, leads, error: null };
    return { statusCode: 200, contentType: "application/json", body: JSON.stringify(json) };
  }

  const html = buildAdminHtml(leads, stats, setupWarning);
  return { statusCode: 200, contentType: "text/html", body: html };
}
