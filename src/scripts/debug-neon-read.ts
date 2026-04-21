/**
 * Debug script — shows raw Neon HTTP response format.
 * Usage: node --import ./dist/env.js dist/scripts/debug-neon-read.js
 */

const dbUrl = process.env.NEON_DATABASE_URL?.trim() ?? "";
if (!dbUrl) { console.error("Missing NEON_DATABASE_URL"); process.exit(1); }

const parsed = new URL(dbUrl);
const host = parsed.hostname;
const endpoint = `https://${host}/sql`;

async function rawQuery(sql: string, params: unknown[] = []) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": dbUrl,
    },
    body: JSON.stringify({ query: sql, params }),
  });
  const body = await res.json();
  return body;
}

async function main() {
  // Clean up orphan validation data from before the parser fix
  console.log("=== Cleaning orphan test data ===");
  const cleanups = [
    "DELETE FROM failures WHERE run_id IS NULL",
    "DELETE FROM observations WHERE run_id IS NULL",
    "DELETE FROM steps WHERE run_id IS NULL",
    "DELETE FROM runs WHERE run_ref LIKE 'validate-%'",
  ];
  for (const sql of cleanups) {
    const r = await rawQuery(sql);
    console.log(`  ${sql}  →`, JSON.stringify(r?.command ?? r?.message ?? 'ok'));
  }
  console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
