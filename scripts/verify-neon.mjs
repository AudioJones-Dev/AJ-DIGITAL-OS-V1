import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/NEON_DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) { console.error("No NEON_DATABASE_URL"); process.exit(1); }

const host = new URL(url).hostname;

async function query(sql) {
  const resp = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": url },
    body: JSON.stringify({ query: sql, params: [] }),
  });
  return resp.json();
}

// List tables
const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
console.log("Tables:", tables.rows?.map(r => r.table_name).join(", "));

// Health check (SELECT 1)
const t0 = Date.now();
const health = await query("SELECT 1 AS n");
console.log("Health:", health.rows?.[0]?.n === 1 ? "OK" : "FAIL", `(${Date.now() - t0}ms)`);
