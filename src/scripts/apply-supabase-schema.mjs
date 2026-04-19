/**
 * Apply Supabase schema migrations via direct PostgreSQL connection.
 *
 * Usage:
 *   node src/scripts/apply-supabase-schema.mjs
 *
 * Requires: SUPABASE_DB_URL env or constructs from project ref + password.
 */

import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = "owaojhijfulwillaeyrx";
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD ?? "";

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;

const MIGRATIONS = [
  resolve(__dirname, "../../sql/supabase-schema.sql"),
  resolve(__dirname, "../../sql/002-saas-onboarding.sql"),
];

async function main() {
  if (!DB_PASSWORD && !process.env.SUPABASE_DB_URL) {
    console.error("[MIGRATE] Error: set SUPABASE_DB_PASSWORD or SUPABASE_DB_URL");
    process.exit(1);
  }

  console.log(`[MIGRATE] Connecting to Supabase project ${PROJECT_REF}...`);

  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("[MIGRATE] Connected.");

    for (const file of MIGRATIONS) {
      const sql = readFileSync(file, "utf-8");
      const name = file.split(/[\\/]/).pop();
      console.log(`[MIGRATE] Applying ${name}...`);
      await client.query(sql);
      console.log(`[MIGRATE] ✓ ${name} applied.`);
    }

    // Verify tables exist
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('clients','subscriptions','client_agents','missions','mission_runs','deliverables','assets')
      ORDER BY table_name;
    `);

    console.log(`\n[MIGRATE] Verified ${rows.length}/7 tables in public schema:`);
    for (const r of rows) console.log(`  ✓ ${r.table_name}`);

    if (rows.length < 7) {
      const found = new Set(rows.map((r) => r.table_name));
      const expected = ["clients", "subscriptions", "client_agents", "missions", "mission_runs", "deliverables", "assets"];
      const missing = expected.filter((t) => !found.has(t));
      console.error(`\n[MIGRATE] MISSING: ${missing.join(", ")}`);
      process.exit(1);
    }

    console.log("\n[MIGRATE] All 7 tables confirmed. Schema deployment complete.");
  } catch (err) {
    console.error("[MIGRATE] FAILED:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
