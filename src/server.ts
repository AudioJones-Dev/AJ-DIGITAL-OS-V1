import "./env.js";
import { preloadLocalModel } from "./bootstrap/preload-local-model.js";
import { startHermes, stopHermes } from "./hermes/index.js";
import { startFallowBeaconFromEnv, type FallowBeaconRuntime } from "./observability/fallow-beacon.js";

// ── Production Config Guards ───────────────────────────────────────
// Fail fast if critical env vars are missing.

const REQUIRED_ENV: Array<[string, string]> = [
  ["SUPABASE_URL", "Supabase project URL"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key (required for RLS writes)"],
  ["STRIPE_SECRET_KEY", "Stripe secret key"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret"],
];

let fallowBeacon: FallowBeaconRuntime | null = null;
let hermesStarted = false;
let shutdownStarted = false;

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
  fallowBeacon = startFallowBeaconFromEnv();
  await preloadLocalModel();
  await startHermes({ statusApi: true });
  hermesStarted = true;
  console.log("[Server] Hermes started");
  const port = process.env.HERMES_STATUS_PORT || "7420";
  const host = process.env.HERMES_BIND_HOST || "127.0.0.1";
  console.log(`[Server] HTTP server listening on http://${host}:${port}`);
  console.log("[Server] Startup complete");
}

async function shutdown(reason: string, exitCode: number): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  console.log(`[Server] ${reason} received. Shutting down...`);

  if (hermesStarted) {
    stopHermes();
    hermesStarted = false;
  }

  if (fallowBeacon) {
    await fallowBeacon.flush();
    await fallowBeacon.stop();
    fallowBeacon = null;
  }

  process.exit(exitCode);
}

process.once("SIGINT", () => void shutdown("SIGINT", 0));
process.once("SIGTERM", () => void shutdown("SIGTERM", 0));

main().catch((err) => {
  console.error("Fatal error in server startup:", err);
  void shutdown("startup failure", 1);
});
