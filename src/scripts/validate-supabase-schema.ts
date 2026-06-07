/**
 * Supabase Schema Validation Script
 *
 * Verifies required PostgREST tables for AJ Digital OS runtime.
 * Exits with code 1 if any required table is missing or unreachable.
 *
 * Usage:
 *   npm run validate:supabase-schema
 */

import "../env.js";
import { resolveConfig, isConfigured } from "../db/supabase-client.js";

const TAG = "[SUPABASE-SCHEMA-CHECK]";

const REQUIRED_TABLES = [
  "clients",
  "subscriptions",
  "client_agents",
  "missions",
  "mission_runs",
  "deliverables",
  "assets",
  "stripe_events",
] as const;

type RequiredTable = (typeof REQUIRED_TABLES)[number];

interface TableCheckResult {
  table: RequiredTable;
  ok: boolean;
  status: number;
  error: string | null;
  missingInSchemaCache: boolean;
}

async function checkTable(
  baseUrl: string,
  serviceRoleKey: string,
  table: RequiredTable,
): Promise<TableCheckResult> {
  const url = `${baseUrl}/rest/v1/${table}?select=id&limit=1`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (res.ok) {
      return { table, ok: true, status: res.status, error: null, missingInSchemaCache: false };
    }

    const body = await res.text().catch(() => "");
    const snippet = body.slice(0, 300);
    const missingInSchemaCache = res.status === 404 && snippet.includes("PGRST205");

    return {
      table,
      ok: false,
      status: res.status,
      error: snippet || `HTTP ${res.status}`,
      missingInSchemaCache,
    };
  } catch (err) {
    return {
      table,
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
      missingInSchemaCache: false,
    };
  }
}

async function main(): Promise<void> {
  const cfg = resolveConfig();

  console.log(`${TAG} Starting schema validation...`);

  if (!isConfigured(cfg)) {
    console.error(`${TAG} Supabase env is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).`);
    process.exit(1);
  }

  const checks = await Promise.all(
    REQUIRED_TABLES.map((table) => checkTable(cfg.url, cfg.serviceRoleKey, table)),
  );

  let allOk = true;
  for (const c of checks) {
    if (c.ok) {
      console.log(`${TAG} OK ${c.table}`);
      continue;
    }

    allOk = false;
    const kind = c.missingInSchemaCache ? "missing (schema cache)" : "error";
    console.error(`${TAG} FAIL ${c.table} (${kind}, status=${c.status})`);
    if (c.error) {
      console.error(`${TAG}   ${c.error}`);
    }
  }

  if (!allOk) {
    const missing = checks.filter((c) => !c.ok).map((c) => c.table).join(", ");
    console.error(`${TAG} Missing/unavailable tables: ${missing}`);
    process.exit(1);
  }

  console.log(`${TAG} All required tables are available via PostgREST.`);
}

void main();
