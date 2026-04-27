/**
 * Lead Submission API Handler — POST /api/leads
 *
 * Validates the payload with Zod, normalises phone/email,
 * stores the lead, and dispatches an email alert via Resend.
 *
 * Required fields: name or firstName + email or phone + serviceNeeded
 * Capture: source page and UTM params
 *
 * Returns: safe JSON only — never exposes internal errors or secrets.
 */

import { z } from "zod";
import type { InsertLead } from "../db/db-types.js";
import { storeLead } from "../services/leads/lead-storage.js";
import { sendLeadAlert } from "../services/leads/lead-email.js";

const TAG = "[LEADS-API]";

// ── Validation Schema ──────────────────────────────────────────────

const LeadSubmitSchema = z
  .object({
    // Name variants
    name: z.string().trim().min(1).max(200).optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    first_name: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    last_name: z.string().trim().min(1).max(100).optional(),

    // Contact
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(7).max(30).optional(),

    // Service
    serviceNeeded: z.string().trim().min(1).max(200).optional(),
    service_needed: z.string().trim().min(1).max(200).optional(),

    // Location
    county: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),

    // Details
    propertyType: z.string().trim().max(100).optional(),
    property_type: z.string().trim().max(100).optional(),
    timeline: z.string().trim().max(200).optional(),
    message: z.string().trim().max(2000).optional(),

    // Attribution
    leadSourcePage: z.string().trim().max(500).optional(),
    lead_source_page: z.string().trim().max(500).optional(),
    utmSource: z.string().trim().max(200).optional(),
    utm_source: z.string().trim().max(200).optional(),
    utmMedium: z.string().trim().max(200).optional(),
    utm_medium: z.string().trim().max(200).optional(),
    utmCampaign: z.string().trim().max(200).optional(),
    utm_campaign: z.string().trim().max(200).optional(),
  })
  .refine(
    (d: { name?: string; firstName?: string; first_name?: string }) => !!(d.name ?? d.firstName ?? d.first_name),
    { message: "name or firstName is required", path: ["name"] },
  )
  .refine(
    (d: { email?: string; phone?: string }) => !!(d.email ?? d.phone),
    { message: "email or phone is required", path: ["email"] },
  )
  .refine(
    (d: { serviceNeeded?: string; service_needed?: string }) => !!(d.serviceNeeded ?? d.service_needed),
    { message: "serviceNeeded is required", path: ["serviceNeeded"] },
  );

type LeadSubmitInput = z.infer<typeof LeadSubmitSchema>;

// ── Normalisation ──────────────────────────────────────────────────

function normaliseEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.trim().toLowerCase();
}

function normalisePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim();
}

function buildInsertLead(d: LeadSubmitInput): InsertLead {
  const firstName = d.firstName ?? d.first_name ?? undefined;
  const lastName = d.lastName ?? d.last_name ?? undefined;
  const fullName =
    d.name ??
    (firstName && lastName ? `${firstName} ${lastName}` : firstName ?? lastName ?? null);

  return {
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    name: fullName ?? null,
    // email is required by the DB schema (NOT NULL); the Zod refine above ensures
    // at least email or phone is present; when only phone is given, email is stored
    // as empty string to satisfy the NOT NULL constraint.
    email: normaliseEmail(d.email) ?? "",
    phone: normalisePhone(d.phone),
    county: d.county ?? null,
    city: d.city ?? null,
    service_needed: d.serviceNeeded ?? d.service_needed ?? null,
    property_type: d.propertyType ?? d.property_type ?? null,
    timeline: d.timeline ?? null,
    message: d.message ?? null,
    lead_source_page: d.leadSourcePage ?? d.lead_source_page ?? null,
    utm_source: d.utmSource ?? d.utm_source ?? null,
    utm_medium: d.utmMedium ?? d.utm_medium ?? null,
    utm_campaign: d.utmCampaign ?? d.utm_campaign ?? null,
    status: "new",
    priority: "normal",
    assigned_to: null,
    notes: null,
  };
}

// ── Handler ────────────────────────────────────────────────────────

export interface LeadSubmitResponse {
  ok: boolean;
  id: string | null;
  errors: string[];
}

export async function handleLeadSubmit(
  rawBody: string,
): Promise<{ statusCode: 200 | 400 | 422 | 500; body: LeadSubmitResponse }> {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: { ok: false, id: null, errors: ["Invalid JSON payload"] } };
  }

  // Validate
  const result = LeadSubmitSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".") || "root"}: ${i.message}`);
    return { statusCode: 422, body: { ok: false, id: null, errors } };
  }

  // Build insert payload
  const insertLead = buildInsertLead(result.data);

  // Store lead
  const storeResult = await storeLead(insertLead);
  if (!storeResult.ok || !storeResult.data) {
    console.error(`${TAG} Failed to store lead:`, storeResult.error);
    return { statusCode: 500, body: { ok: false, id: null, errors: ["Failed to store lead"] } };
  }

  const lead = storeResult.data;
  console.log(`${TAG} lead stored — id=${lead.id} email=${lead.email}`);

  // Send email alert (fail-open — lead already stored)
  sendLeadAlert(lead).catch((err: unknown) => {
    console.error(`${TAG} Email alert error for lead ${lead.id}:`, err instanceof Error ? err.message : String(err));
  });

  return { statusCode: 200, body: { ok: true, id: lead.id, errors: [] } };
}
