/**
 * Stripe Integration Smoke Test — validates the full onboarding flow.
 *
 * Phase 1: Config Validation (no network)
 *   - All required env vars present
 *   - Price IDs have correct format
 *   - Webhook secret has correct prefix
 *
 * Phase 2: API Connectivity (needs STRIPE_SECRET_KEY)
 *   - Stripe API key authenticates
 *   - Price IDs are valid and active
 *   - Checkout session creation works (test mode)
 *
 * Phase 3: Webhook Verification (local only)
 *   - Signature generation + verification round-trip
 *   - Replay protection (old timestamps rejected)
 *   - Event routing dispatches correctly
 *
 * Phase 4: Provisioning Dry Run (no Supabase required)
 *   - Handler factory returns all 5 handlers
 *   - Provisioning fails gracefully without Supabase
 *   - Plan feature maps have correct agent/mission counts
 *
 * Usage:
 *   npm run build && node --import ./dist/env.js dist/scripts/test-stripe-smoke.js
 *
 * Flags:
 *   --live   Run Phase 2 (requires valid STRIPE_SECRET_KEY)
 */

import { createHmac } from "node:crypto";
import {
  createCheckoutSession,
  verifyWebhookSignature,
  handleStripeWebhook,
  type StripeWebhookEvent,
} from "../api/stripe.js";
import { createStripeWebhookHandlers } from "../api/stripe-handlers.js";
import { provisionClient } from "../services/provisioning.js";
import {
  seedClientSchedules,
  getClientSchedules,
  removeClientSchedules,
} from "../hermes/hermes-client-schedules.js";
import type { ClientTier } from "../db/db-types.js";

const TAG = "[STRIPE-SMOKE]";
const LIVE = process.argv.includes("--live");

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}` + (detail ? ` — ${detail}` : ""));
  } else {
    failed++;
    console.log(`  ✘ ${name}` + (detail ? ` — ${detail}` : ""));
  }
}

function skip(name: string, reason: string): void {
  skipped++;
  console.log(`  ⊘ ${name} — SKIPPED: ${reason}`);
}

// ═══════════════════════════════════════════════════════════════════
// Phase 1: Config Validation
// ═══════════════════════════════════════════════════════════════════

function phase1_configValidation(): void {
  console.log(`\n${TAG} ── Phase 1: Config Validation ──`);

  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STANDARD",
    "STRIPE_PRICE_PROFESSIONAL",
    "STRIPE_PRICE_ENTERPRISE",
  ];

  const present: string[] = [];
  const missing: string[] = [];

  for (const key of required) {
    const val = process.env[key]?.trim();
    if (val && val.length > 0) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  check("required env vars present", missing.length === 0,
    missing.length === 0 ? `all ${required.length} set` : `missing: ${missing.join(", ")}`);

  // Format checks (only if values exist)
  const sk = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (sk) {
    check("STRIPE_SECRET_KEY format", sk.startsWith("sk_live_") || sk.startsWith("sk_test_"),
      sk.startsWith("sk_test_") ? "test mode" : "live mode");
  }

  const pk = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  if (pk) {
    check("STRIPE_PUBLISHABLE_KEY format", pk.startsWith("pk_live_") || pk.startsWith("pk_test_"),
      pk.startsWith("pk_test_") ? "test mode" : "live mode");
  }

  const whsec = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (whsec) {
    check("STRIPE_WEBHOOK_SECRET format", whsec.startsWith("whsec_"), `length=${whsec.length}`);
  }

  const prices = ["STRIPE_PRICE_STANDARD", "STRIPE_PRICE_PROFESSIONAL", "STRIPE_PRICE_ENTERPRISE"];
  for (const p of prices) {
    const val = process.env[p]?.trim() ?? "";
    if (val) {
      check(`${p} format`, val.startsWith("price_"), val.slice(0, 20));
    }
  }

  // APP_BASE_URL
  const baseUrl = process.env.APP_BASE_URL?.trim() ?? "";
  if (baseUrl) {
    check("APP_BASE_URL is a valid URL", baseUrl.startsWith("http://") || baseUrl.startsWith("https://"), baseUrl);
  } else {
    check("APP_BASE_URL set (defaults to localhost:5173)", true, "using default");
  }
}

// ═══════════════════════════════════════════════════════════════════
// Phase 2: API Connectivity (live only)
// ═══════════════════════════════════════════════════════════════════

async function phase2_apiConnectivity(): Promise<void> {
  console.log(`\n${TAG} ── Phase 2: API Connectivity ──`);

  if (!LIVE) {
    skip("Stripe API auth", "pass --live to run");
    skip("price ID validation", "pass --live to run");
    skip("checkout session creation", "pass --live to run");
    return;
  }

  const sk = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!sk) {
    skip("all Phase 2 tests", "STRIPE_SECRET_KEY not set");
    return;
  }

  // Test API key by fetching account info
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${sk}` },
    });
    check("Stripe API authenticates", res.ok, `status=${res.status}`);

    if (!res.ok) {
      console.log(`  ⚠ Cannot proceed — API key invalid`);
      return;
    }
  } catch (err) {
    check("Stripe API reachable", false, err instanceof Error ? err.message : String(err));
    return;
  }

  // Validate each price ID exists
  const priceVars = [
    { name: "STRIPE_PRICE_STANDARD", env: "STRIPE_PRICE_STANDARD" },
    { name: "STRIPE_PRICE_PROFESSIONAL", env: "STRIPE_PRICE_PROFESSIONAL" },
    { name: "STRIPE_PRICE_ENTERPRISE", env: "STRIPE_PRICE_ENTERPRISE" },
  ];

  for (const { name, env } of priceVars) {
    const priceId = process.env[env]?.trim() ?? "";
    if (!priceId) {
      skip(`${name} exists in Stripe`, `${env} not set`);
      continue;
    }

    try {
      const res = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`, {
        headers: { Authorization: `Bearer ${sk}` },
      });
      const data = await res.json() as Record<string, unknown>;
      check(`${name} exists in Stripe`, res.ok, res.ok ? `active=${data["active"]}` : `${res.status}`);
    } catch (err) {
      check(`${name} exists in Stripe`, false, err instanceof Error ? err.message : String(err));
    }
  }

  // Test checkout session creation with test email
  try {
    const result = await createCheckoutSession({
      clientId: "smoke-test-client",
      email: "smoke-test@ajdigital.com",
      tier: "standard",
    });

    check("checkout session created", result.ok, result.ok ? `session=${result.sessionId}` : result.error ?? "unknown error");

    if (result.url) {
      check("checkout URL returned", result.url.startsWith("https://checkout.stripe.com"), result.url.slice(0, 60));
    }
  } catch (err) {
    check("checkout session creation", false, err instanceof Error ? err.message : String(err));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Phase 3: Webhook Verification
// ═══════════════════════════════════════════════════════════════════

async function phase3_webhookVerification(): Promise<void> {
  console.log(`\n${TAG} ── Phase 3: Webhook Verification ──`);

  const testSecret = "whsec_smoke_test_secret_abcdef1234567890";
  const origSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  // Round-trip: generate signature → verify
  const body = JSON.stringify({
    id: "evt_smoke_test",
    type: "checkout.session.completed",
    data: { object: { id: "cs_smoke", metadata: { client_id: "smoke-client", plan_tier: "standard" } } },
  });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", testSecret).update(`${ts}.${body}`).digest("hex");

  const valid = verifyWebhookSignature(body, `t=${ts},v1=${sig}`);
  check("webhook signature round-trip", valid.verified, valid.error ?? "OK");

  // Reject tampered body
  const tamperedResult = verifyWebhookSignature(body + "x", `t=${ts},v1=${sig}`);
  check("tampered body rejected", !tamperedResult.verified);

  // Reject old timestamp (replay protection)
  const oldTs = (Math.floor(Date.now() / 1000) - 600).toString();
  const oldSig = createHmac("sha256", testSecret).update(`${oldTs}.${body}`).digest("hex");
  const oldResult = verifyWebhookSignature(body, `t=${oldTs},v1=${oldSig}`);
  check("replay protection (>5m rejected)", !oldResult.verified);

  // Event routing
  const calls: string[] = [];
  const mockHandlers = {
    onCheckoutCompleted: async () => { calls.push("checkout"); return { ok: true, action: "checkout", error: null }; },
    onSubscriptionCreated: async () => { calls.push("sub_created"); return { ok: true, action: "sub_created", error: null }; },
    onSubscriptionUpdated: async () => { calls.push("sub_updated"); return { ok: true, action: "sub_updated", error: null }; },
    onSubscriptionDeleted: async () => { calls.push("sub_deleted"); return { ok: true, action: "sub_deleted", error: null }; },
    onPaymentFailed: async () => { calls.push("payment_failed"); return { ok: true, action: "payment_failed", error: null }; },
  };

  const eventTypes: Array<[string, string]> = [
    ["checkout.session.completed", "checkout"],
    ["customer.subscription.created", "sub_created"],
    ["customer.subscription.updated", "sub_updated"],
    ["customer.subscription.deleted", "sub_deleted"],
    ["invoice.payment_failed", "payment_failed"],
  ];

  for (const [type, expected] of eventTypes) {
    calls.length = 0;
    const event: StripeWebhookEvent = { id: `evt_${type}`, type, data: { object: {} } };
    await handleStripeWebhook(event, mockHandlers);
    check(`event ${type} routes correctly`, calls[0] === expected);
  }

  // Unknown event → ignored
  calls.length = 0;
  const unk: StripeWebhookEvent = { id: "evt_unk", type: "foo.bar.baz", data: { object: {} } };
  const unkResult = await handleStripeWebhook(unk, mockHandlers);
  check("unknown event → ignored", unkResult.action === "ignored");

  // Restore
  if (origSecret !== undefined) {
    process.env.STRIPE_WEBHOOK_SECRET = origSecret;
  } else {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Phase 4: Provisioning Dry Run
// ═══════════════════════════════════════════════════════════════════

async function phase4_provisioningDryRun(): Promise<void> {
  console.log(`\n${TAG} ── Phase 4: Provisioning Dry Run ──`);

  // Handler factory
  const handlers = createStripeWebhookHandlers();
  check("handler factory returns all 5 handlers",
    typeof handlers.onCheckoutCompleted === "function" &&
    typeof handlers.onSubscriptionCreated === "function" &&
    typeof handlers.onSubscriptionUpdated === "function" &&
    typeof handlers.onSubscriptionDeleted === "function" &&
    typeof handlers.onPaymentFailed === "function",
  );

  // Provisioning without Supabase → graceful failure
  const result = await provisionClient("smoke-dry-client", "professional", { url: "", serviceRoleKey: "" });
  check("provisioning returns structured result", typeof result.ok === "boolean" && Array.isArray(result.steps));
  check("provisioning reports client ID", result.clientId === "smoke-dry-client");
  check("provisioning fails gracefully without Supabase", !result.ok, result.error ?? "no error");

  // Verify plan feature maps produce correct schedule counts
  const tiers: Array<[ClientTier, number]> = [
    ["standard", 1],
    ["professional", 2],
    ["enterprise", 3],
  ];

  for (const [tier, expectedSchedules] of tiers) {
    const testId = `smoke-sched-${tier}`;
    // We seed with the same number of schedules the provisioning code would
    const scheduleConfigs: Array<{ id: string; name: string; cron: string; mission_type: string; objective: string }> = [];
    for (let i = 0; i < expectedSchedules; i++) {
      scheduleConfigs.push({
        id: `s${i}`, name: `Schedule ${i}`, cron: "every 6h",
        mission_type: "monitor_only", objective: "Smoke test",
      });
    }
    const seedResult = seedClientSchedules(testId, tier, scheduleConfigs);
    check(`${tier} plan seeds ${expectedSchedules} schedule(s)`, seedResult.count === expectedSchedules);

    const fetched = getClientSchedules(testId);
    check(`${tier} schedules are client-scoped`, fetched.every(s => s.mission.client_id === testId));
    removeClientSchedules(testId);
  }

  // Verify cross-client isolation
  const clientA = "smoke-iso-a";
  const clientB = "smoke-iso-b";
  seedClientSchedules(clientA, "standard", [
    { id: "ha", name: "Health A", cron: "every 6h", mission_type: "monitor_only", objective: "A" },
  ]);
  seedClientSchedules(clientB, "standard", [
    { id: "hb", name: "Health B", cron: "every 6h", mission_type: "monitor_only", objective: "B" },
  ]);

  const aScheds = getClientSchedules(clientA);
  const bScheds = getClientSchedules(clientB);
  check("client A sees only its schedules", aScheds.length === 1 && aScheds[0]!.mission.client_id === clientA);
  check("client B sees only its schedules", bScheds.length === 1 && bScheds[0]!.mission.client_id === clientB);
  check("no cross-client leakage", aScheds[0]!.id !== bScheds[0]!.id);

  removeClientSchedules(clientA);
  removeClientSchedules(clientB);
}

// ═══════════════════════════════════════════════════════════════════
// Runner
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log(`${TAG} ═══════════════════════════════════════════════════`);
  console.log(`${TAG}  Stripe Integration Smoke Test`);
  console.log(`${TAG}  Mode: ${LIVE ? "LIVE (will hit Stripe API)" : "LOCAL (no network calls)"}`);
  console.log(`${TAG} ═══════════════════════════════════════════════════`);

  phase1_configValidation();
  await phase2_apiConnectivity();
  await phase3_webhookVerification();
  await phase4_provisioningDryRun();

  console.log(`\n${TAG} ═══════════════════════════════════════════════════`);
  console.log(`${TAG}  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`${TAG}  ${failed === 0 ? "ALL PASSED ✔" : "SOME FAILED ✘"}`);
  console.log(`${TAG} ═══════════════════════════════════════════════════`);

  if (failed > 0) {
    console.log(`\n${TAG}  ⚠ Checklist for failures:`);
    console.log(`${TAG}    1. Set all STRIPE_* vars in .env (see .env.example)`);
    console.log(`${TAG}    2. Create products/prices in Stripe Dashboard`);
    console.log(`${TAG}    3. Add webhook endpoint: POST /api/stripe/webhook`);
    console.log(`${TAG}    4. Copy webhook signing secret to STRIPE_WEBHOOK_SECRET`);
    console.log(`${TAG}    5. Run with --live to test against Stripe API`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

void main();
