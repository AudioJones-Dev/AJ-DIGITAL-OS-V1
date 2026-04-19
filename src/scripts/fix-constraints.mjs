/**
 * Fix CHECK constraint on clients.status to include 'provisioning'.
 */

import pg from "pg";

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) { console.error("Set SUPABASE_DB_URL"); process.exit(1); }

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  await client.query(`ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check`);
  await client.query(`ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'paused', 'archived', 'provisioning'))`);
  console.log("✓ clients.status constraint updated to include 'provisioning'");

  const { rows } = await client.query(
    `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='clients'::regclass AND contype='c' AND conname LIKE '%status%'`
  );
  console.log("Constraint:", rows);
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
