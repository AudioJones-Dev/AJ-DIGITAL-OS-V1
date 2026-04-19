import "./env.js";
import { startHermes } from "./hermes/index.js";

// ── Production Config Guards ───────────────────────────────────────
// Fail fast if critical env vars are missing.

const REQUIRED_ENV: Array<[string, string]> = [
  ["SUPABASE_URL", "Supabase project URL"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key (required for RLS writes)"],
  ["STRIPE_SECRET_KEY", "Stripe secret key"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret"],
];

function validateEnv(): void {
  const missing: string[] = [];
  for (const [key, label] of REQUIRED_ENV) {
    if (!process.env[key]?.trim()) {
      missing.push(`  ${key} — ${label}`);
    }
  }
  if (missing.length > 0) {
    console.error("[Server] FATAL: Missing required environment variables:");
    for (const m of missing) console.error(m);
    console.error("[Server] Set these in .env or your platform's env var config.");
    process.exit(1);
  }

  // Warn on suspicious config in production
  const isProduction = process.env.NODE_ENV === "production" || process.env.AJ_OS_ENV === "production";
  if (isProduction) {
    const bindHost = process.env.HERMES_BIND_HOST ?? "127.0.0.1";
    if (bindHost === "127.0.0.1") {
      console.warn("[Server] WARNING: HERMES_BIND_HOST=127.0.0.1 in production — external traffic will be rejected.");
      console.warn("[Server] Set HERMES_BIND_HOST=0.0.0.0 to accept connections.");
    }
  }
}

async function main() {
  validateEnv();
  console.log("[Server] Starting...");
  await startHermes({ statusApi: true });
  console.log("[Server] Hermes started");
  const port = process.env.HERMES_STATUS_PORT || "7420";
  const host = process.env.HERMES_BIND_HOST || "127.0.0.1";
  console.log(`[Server] HTTP server listening on http://${host}:${port}`);
  console.log("[Server] Startup complete");
}

main().catch((err) => {
  console.error("Fatal error in server startup:", err);
  process.exit(1);
});
