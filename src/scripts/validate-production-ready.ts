/**
 * Production Readiness Validation Script
 *
 * Checks environment variables, build artifacts, Supabase schema,
 * and deployment config before go-live.
 *
 * Usage:
 *   npm run validate:production
 */

import "../env.js";
import { resolveConfig, isConfigured } from "../db/supabase-client.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const TAG = "[PRODUCTION-CHECK]";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`  ${icon} ${name}: ${detail}`);
}

// ── 1. Required Environment Variables ──────────────────────────────
console.log(`\n${TAG} Checking environment variables...`);

const REQUIRED_ENV: Array<[string, string]> = [
  ["SUPABASE_URL", "Supabase project URL"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key"],
  ["STRIPE_SECRET_KEY", "Stripe secret key"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret"],
];

for (const [key, label] of REQUIRED_ENV) {
  const val = process.env[key]?.trim();
  check(key, !!val, val ? `set (${val.length} chars)` : `MISSING — ${label}`);
}

// ── 2. Optional but recommended env vars ───────────────────────────
console.log(`\n${TAG} Checking recommended environment variables...`);

const RECOMMENDED_ENV: Array<[string, string]> = [
  ["NODE_ENV", "Should be 'production' in prod"],
  ["HERMES_BIND_HOST", "Should be '0.0.0.0' in prod (defaults to 127.0.0.1)"],
  ["HERMES_STATUS_PORT", "HTTP port (defaults to 7420)"],
];

for (const [key, hint] of RECOMMENDED_ENV) {
  const val = process.env[key]?.trim();
  check(key, !!val, val ? `set: ${val}` : `not set — ${hint}`);
}

// ── 3. Build Artifacts ─────────────────────────────────────────────
console.log(`\n${TAG} Checking build artifacts...`);

const distDir = resolve(process.cwd(), "dist");
const serverJs = resolve(distDir, "server.js");
const envJs = resolve(distDir, "env.js");

check("dist/ directory", existsSync(distDir), existsSync(distDir) ? "exists" : "MISSING — run npm run build");
check("dist/server.js", existsSync(serverJs), existsSync(serverJs) ? "exists" : "MISSING — run npm run build");
check("dist/env.js", existsSync(envJs), existsSync(envJs) ? "exists" : "MISSING — run npm run build");

// ── 4. Supabase Connectivity ───────────────────────────────────────
console.log(`\n${TAG} Checking Supabase connectivity...`);

const cfg = resolveConfig();
if (isConfigured(cfg)) {
  try {
    const res = await fetch(`${cfg.url}/rest/v1/clients?select=id&limit=1`, {
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
      },
    });
    check("Supabase PostgREST", res.ok, res.ok ? `reachable (HTTP ${res.status})` : `FAILED (HTTP ${res.status})`);
  } catch (err: any) {
    check("Supabase PostgREST", false, `connection error: ${err.message}`);
  }
} else {
  check("Supabase PostgREST", false, "Supabase not configured — missing URL or key");
}

// ── 5. Stripe Key Validation ───────────────────────────────────────
console.log(`\n${TAG} Checking Stripe key format...`);

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
const isLiveKey = stripeKey.startsWith("sk_live_");
const isTestKey = stripeKey.startsWith("sk_test_");
check("Stripe key format", isLiveKey || isTestKey, isLiveKey ? "live key" : isTestKey ? "test key" : "INVALID format (expected sk_live_ or sk_test_)");

const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
check("Webhook secret format", whSecret.startsWith("whsec_"), whSecret.startsWith("whsec_") ? "valid format" : "INVALID format (expected whsec_)");

// ── 6. Deployment Files ────────────────────────────────────────────
console.log(`\n${TAG} Checking deployment files...`);

const deployFiles = ["Dockerfile", "docker-compose.yml", "Procfile", ".dockerignore"];
for (const f of deployFiles) {
  const p = resolve(process.cwd(), f);
  check(f, existsSync(p), existsSync(p) ? "present" : "MISSING");
}

// ── Summary ────────────────────────────────────────────────────────
console.log(`\n${TAG} ─── SUMMARY ───`);
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`${TAG} ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n${TAG} ⚠ Production readiness check FAILED. Fix the issues above before deploying.`);
  process.exit(1);
} else {
  console.log(`\n${TAG} All checks passed. Ready for deployment.`);
}
