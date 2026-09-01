/**
 * Leads Neon Client — Lead Pipeline Data Layer
 *
 * CRUD operations for the `leads` table in Neon.
 * Uses the same fetch-based HTTP approach as neon-client.ts.
 *
 * Requires env:
 *   DATABASE_URL — postgres://user:pass@host/dbname?sslmode=require
 *   (falls back to NEON_DATABASE_URL if DATABASE_URL is not set)
 */

import type {
  DbLead,
  InsertLead,
  LeadUpdateInput,
  LeadStats,
  QueryResult,
} from "./db-types.js";

// ── Configuration ──────────────────────────────────────────────────

export interface LeadsNeonConfig {
  databaseUrl: string;
}

function resolveLeadsConfig(override?: Partial<LeadsNeonConfig>): LeadsNeonConfig {
  const url =
    override?.databaseUrl ??
    process.env.DATABASE_URL?.trim() ??
    process.env.NEON_DATABASE_URL?.trim() ??
    "";
  return { databaseUrl: url };
}

export function isLeadsConfigured(cfg?: Partial<LeadsNeonConfig>): boolean {
  return resolveLeadsConfig(cfg).databaseUrl.length > 0;
}

function parseConnectionString(url: string): { host: string; password: string } | null {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname, password: decodeURIComponent(parsed.password) };
  } catch {
    return null;
  }
}

// ── Query Executor ─────────────────────────────────────────────────

async function leadsQuery<T>(
  cfg: LeadsNeonConfig,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T[]>> {
  const parsed = parseConnectionString(cfg.databaseUrl);
  if (!parsed) {
    return { ok: false, data: null, error: "Invalid DATABASE_URL", count: null };
  }

  const endpoint = `https://${parsed.host}/sql`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Neon-Connection-String": cfg.databaseUrl,
      },
      body: JSON.stringify({ query: sql, params }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, data: null, error: `Neon ${res.status}: ${body.slice(0, 300)}`, count: null };
    }

    const result = await res.json() as { fields: Array<{ name: string }>; rows: unknown[]; rowAsArray?: boolean };
    let rows: T[];

    if (result.rowAsArray) {
      const fields = result.fields.map((f) => f.name);
      rows = (result.rows as unknown[][]).map((row) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < fields.length; i++) {
          obj[fields[i]!] = row[i];
        }
        return obj as T;
      });
    } else {
      rows = result.rows as T[];
    }

    return { ok: true, data: rows, error: null, count: rows.length };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err), count: null };
  }
}

async function leadsInsert<T>(
  cfg: LeadsNeonConfig,
  sql: string,
  params: unknown[],
): Promise<QueryResult<T>> {
  const result = await leadsQuery<T>(cfg, sql, params);
  return { ok: result.ok, data: result.data?.[0] ?? null, error: result.error, count: result.count };
}

// ── Lead Operations ────────────────────────────────────────────────

export async function createLead(
  lead: InsertLead,
  config?: Partial<LeadsNeonConfig>,
): Promise<QueryResult<DbLead>> {
  const cfg = resolveLeadsConfig(config);
  if (!isLeadsConfigured(cfg)) {
    return { ok: false, data: null, error: "Lead database not configured (DATABASE_URL missing)", count: null };
  }

  return leadsInsert<DbLead>(
    cfg,
    `INSERT INTO leads (
       first_name, last_name, name, email, phone, county, city,
       service_needed, property_type, timeline, message,
       lead_source_page, utm_source, utm_medium, utm_campaign,
       status, priority, assigned_to, notes
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      lead.first_name, lead.last_name, lead.name, lead.email, lead.phone,
      lead.county, lead.city, lead.service_needed, lead.property_type,
      lead.timeline, lead.message, lead.lead_source_page,
      lead.utm_source, lead.utm_medium, lead.utm_campaign,
      lead.status, lead.priority, lead.assigned_to, lead.notes,
    ],
  );
}

export async function updateLead(
  id: string,
  updates: LeadUpdateInput,
  config?: Partial<LeadsNeonConfig>,
): Promise<QueryResult<DbLead>> {
  const cfg = resolveLeadsConfig(config);
  if (!isLeadsConfigured(cfg)) {
    return { ok: false, data: null, error: "Lead database not configured", count: null };
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${idx++}`);
    params.push(updates.status);
  }
  if (updates.priority !== undefined) {
    setClauses.push(`priority = $${idx++}`);
    params.push(updates.priority);
  }
  if (updates.notes !== undefined) {
    setClauses.push(`notes = $${idx++}`);
    params.push(updates.notes);
  }
  if (updates.assigned_to !== undefined) {
    setClauses.push(`assigned_to = $${idx++}`);
    params.push(updates.assigned_to);
  }

  if (setClauses.length === 0) {
    return { ok: false, data: null, error: "No fields to update", count: null };
  }

  params.push(id);
  const sql = `UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`;

  const result = await leadsInsert<DbLead>(cfg, sql, params);
  if (result.ok && result.data === null) {
    return { ok: false, data: null, error: `Lead not found: ${id}`, count: 0 };
  }
  return result;
}

export async function getLeadById(
  id: string,
  config?: Partial<LeadsNeonConfig>,
): Promise<QueryResult<DbLead>> {
  const cfg = resolveLeadsConfig(config);
  if (!isLeadsConfigured(cfg)) {
    return { ok: false, data: null, error: "Lead database not configured", count: null };
  }

  const result = await leadsQuery<DbLead>(cfg, `SELECT * FROM leads WHERE id = $1`, [id]);
  if (!result.ok) {
    return { ok: false, data: null, error: result.error, count: null };
  }
  const row = result.data?.[0] ?? null;
  if (!row) {
    return { ok: false, data: null, error: `Lead not found: ${id}`, count: 0 };
  }
  return { ok: true, data: row, error: null, count: 1 };
}

export async function listLeads(
  limit = 100,
  config?: Partial<LeadsNeonConfig>,
): Promise<QueryResult<DbLead[]>> {
  const cfg = resolveLeadsConfig(config);
  if (!isLeadsConfigured(cfg)) {
    return { ok: false, data: null, error: "Lead database not configured", count: null };
  }

  return leadsQuery<DbLead>(
    cfg,
    `SELECT * FROM leads ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}

export async function getLeadStats(
  config?: Partial<LeadsNeonConfig>,
): Promise<QueryResult<LeadStats>> {
  const cfg = resolveLeadsConfig(config);
  if (!isLeadsConfigured(cfg)) {
    return { ok: false, data: null, error: "Lead database not configured", count: null };
  }

  const result = await leadsQuery<{ total: string; new_leads: string; urgent_leads: string }>(
    cfg,
    `SELECT
       count(*)                                  AS total,
       count(*) filter (where status = 'new')    AS new_leads,
       count(*) filter (where priority = 'urgent') AS urgent_leads
     FROM leads`,
    [],
  );

  if (!result.ok || !result.data?.[0]) {
    return { ok: false, data: null, error: result.error ?? "Stats query failed", count: null };
  }

  const row = result.data[0];

  function safeCount(raw: string): number {
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }

  return {
    ok: true,
    data: {
      total: safeCount(row.total),
      new_leads: safeCount(row.new_leads),
      urgent_leads: safeCount(row.urgent_leads),
    },
    error: null,
    count: 1,
  };
}
