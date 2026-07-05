import "./env.js";
import { preloadLocalModel } from "./bootstrap/preload-local-model.js";
import { startHermes, stopHermes } from "./hermes/index.js";

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

  // Placeholder credentials: fatal in production, loud warning elsewhere.
  // These are the compose-file fallbacks that must never reach a real deploy.
  const PLACEHOLDERS = new Set(["change-me", "change-me-now"]);
  const PLACEHOLDER_CHECKED = [
    "POSTGRES_PASSWORD",
    "N8N_BASIC_AUTH_PASSWORD",
    "GRAFANA_ADMIN_PASSWORD",
    "HERMES_STATUS_API_KEY",
  ];
  const isProduction = process.env.NODE_ENV === "production" || process.env.AJ_OS_ENV === "production";
  const placeholders = PLACEHOLDER_CHECKED.filter((key) => {
    const value = process.env[key]?.trim();
    return value !== undefined && value !== "" && PLACEHOLDERS.has(value);
  });
  if (isProduction && !process.env.HERMES_STATUS_API_KEY?.trim()) {
    placeholders.push("HERMES_STATUS_API_KEY (unset)");
  }
  if (placeholders.length > 0) {
    const lines = placeholders.map((k) => `  ${k}`);
    if (isProduction) {
      console.error("[Server] FATAL: placeholder/unset credentials in production:");
      for (const l of lines) console.error(l);
      console.error("[Server] Set real values (e.g. openssl rand -hex 32) before starting.");
      process.exit(1);
    }
    console.warn("[Server] WARNING: placeholder credentials detected (fatal in production):");
    for (const l of lines) console.warn(l);
  }

  // Warn on suspicious config in production
  if (isProduction) {
    const bindHost = process.env.HERMES_BIND_HOST ?? "127.0.0.1";
    if (bindHost === "127.0.0.1") {
      console.warn("[Server] WARNING: HERMES_BIND_HOST=127.0.0.1 in production — external traffic will be rejected.");
      console.warn("[Server] Set HERMES_BIND_HOST=0.0.0.0 to accept connections.");
    }
  }
}

// ── Graceful shutdown ───────────────────────────────────────────────
// Docker sends SIGTERM on `compose stop/down` and force-kills after a grace
// period (default 10s). Tear Hermes down cleanly inside that window so
// in-flight timers, watchers, and the HTTP listener close instead of dying
// mid-write.

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received — shutting down gracefully...`);
  // Hard deadline inside Docker's kill window; unref so it never keeps the
  // process alive on its own.
  const deadline = setTimeout(() => {
    console.error("[Server] Shutdown deadline exceeded — forcing exit.");
    process.exit(1);
  }, 8000);
  deadline.unref();
  try {
    stopHermes();
    console.log("[Server] Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("[Server] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function main() {
  validateEnv();
  console.log("[Server] Starting...");
  await preloadLocalModel();
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
