/**
 * Apply repair_events schema to live Neon database.
 * Uses raw HTTP (same approach as neon-client.ts).
 *
 * Usage: node scripts/apply-repair-schema.mjs
 * Requires: NEON_DATABASE_URL in .env (or environment)
 */
import { readFileSync } from "node:fs";

// Load .env manually (no dotenv dependency)
try {
  const envText = readFileSync(new URL("../.env", import.meta.url), "utf-8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* .env not found — rely on environment */ }

const dbUrl = process.env.NEON_DATABASE_URL?.trim();
if (!dbUrl) { console.error("NEON_DATABASE_URL not set"); process.exit(1); }

const host = new URL(dbUrl).hostname;

async function neonExec(sql) {
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": dbUrl },
    body: JSON.stringify({ query: sql, params: [] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Neon ${res.status}: ${body.slice(0, 500)}`);
  }
  return (await res.json()).rows;
}

async function main() {
  console.log("Applying repair_events table…");

  await neonExec(`CREATE TABLE IF NOT EXISTS repair_events (
    id              bigserial primary key,
    failure_id      bigint references failures(id) on delete set null,
    run_id          bigint references runs(id) on delete cascade,
    run_ref         text not null,
    classification  text not null check (classification in ('transient', 'network', 'dependency', 'data_schema', 'auth_config', 'unknown')),
    strategy        text not null check (strategy in ('retry_immediate', 'retry_backoff', 'retry_targeted', 'alert_only', 'retry_then_escalate')),
    retry_count     integer not null default 0,
    max_retries     integer not null default 1,
    result          text not null default 'pending' check (result in ('pending', 'success', 'failed', 'escalated')),
    escalated       boolean not null default false,
    error_message   text,
    metadata        jsonb not null default '{}',
    created_at      timestamptz not null default now(),
    resolved_at     timestamptz
  )`);

  await neonExec(`CREATE INDEX IF NOT EXISTS idx_repair_events_run ON repair_events (run_id)`);
  await neonExec(`CREATE INDEX IF NOT EXISTS idx_repair_events_classification ON repair_events (classification)`);
  await neonExec(`CREATE INDEX IF NOT EXISTS idx_repair_events_result ON repair_events (result)`);
  await neonExec(`CREATE INDEX IF NOT EXISTS idx_repair_events_created ON repair_events (created_at desc)`);

  const tables = await neonExec(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  console.log("Tables:", tables.map(r => r.tablename).join(", "));

  const cols = await neonExec(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'repair_events' ORDER BY ordinal_position`);
  console.log("repair_events columns:");
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  console.log("✔ repair_events table + indexes applied");
}

main().catch(e => { console.error(e); process.exit(1); });
