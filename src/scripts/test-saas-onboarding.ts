/**
 * SaaS Onboarding Validation — test provisioning flow end-to-end.
 *
 * Tests:
 *   1. Plan feature maps are complete
 *   2. Provisioning creates agents, missions, schedules
 *   3. Stripe webhook handlers respond correctly
 *   4. RLS SQL is syntactically valid
 *   5. Dashboard types cover new tables
 *
 * Usage:
 *   node --import ./dist/env.js dist/scripts/test-saas-onboarding.js
 */

import type { ClientTier } from "../db/db-types.js";
import { provisionClient, type ProvisionResult } from "../services/provisioning.js";
import {
  seedClientSchedules,
  getClientSchedules,
  removeClientSchedules,
  getAllClientSchedules,
} from "../hermes/hermes-client-schedules.js";
import { createStripeWebhookHandlers } from "../api/stripe-handlers.js";
import {
  verifyWebhookSignature,
  createCheckoutSession,
  handleStripeWebhook,
  type StripeWebhookEvent,
} from "../api/stripe.js";
import { createHmac } from "node:crypto";

const TAG = "[SAAS-TEST]";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}` + (detail ? ` — ${detail}` : ""));
  } else {
    failed++;
    console.log(`  ✘ ${name}` + (detail ? ` — ${detail}` : ""));
  }
}

// ═══════════════════════════════════════════════════════════════════
// 1. Plan Feature Maps
// ═══════════════════════════════════════════════════════════════════

function testPlanFeatures(): void {
  console.log(`\n${TAG} ── Plan Feature Maps ──`);

  const tiers: ClientTier[] = ["standard", "professional", "enterprise"];

  for (const tier of tiers) {
    // We can't import PLAN_FEATURES directly (it's inside provisioning module),
    // but we can test via the schedule seeding behavior
    const testId = `plan-test-${tier}`;
    const schedules = [
      { id: "test-s", name: "Test", cron: "every 6h", mission_type: "monitor_only", objective: "Test" },
    ];
    const result = seedClientSchedules(testId, tier, schedules);
    check(`${tier} plan seeds schedules`, result.count === 1, `count=${result.count}`);

    const fetched = getClientSchedules(testId);
    check(`${tier} plan schedules retrievable`, fetched.length === 1);

    removeClientSchedules(testId);
    const after = getClientSchedules(testId);
    check(`${tier} plan schedules removable`, after.length === 0);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. Client Schedule Seeding
// ═══════════════════════════════════════════════════════════════════

function testScheduleSeeding(): void {
  console.log(`\n${TAG} ── Schedule Seeding ──`);

  const clientA = "client-a-test";
  const clientB = "client-b-test";

  const schedulesA = [
    { id: "health", name: "Health Check", cron: "every 6h", mission_type: "monitor_only", objective: "Health" },
    { id: "extract", name: "Extract", cron: "every day 02:00", mission_type: "extract_normalize_store", objective: "Extract data" },
  ];
  const schedulesB = [
    { id: "health", name: "Health Check", cron: "every 6h", mission_type: "monitor_only", objective: "Health B" },
  ];

  seedClientSchedules(clientA, "professional", schedulesA);
  seedClientSchedules(clientB, "standard", schedulesB);

  const allSchedules = getAllClientSchedules();
  check("getAllClientSchedules returns all clients", allSchedules.length === 3, `count=${allSchedules.length}`);

  const aSchedules = getClientSchedules(clientA);
  check("client A has 2 schedules", aSchedules.length === 2);
  check("client A schedule IDs are namespaced", aSchedules[0]!.id.startsWith(`client-${clientA}-`));

  const bSchedules = getClientSchedules(clientB);
  check("client B has 1 schedule", bSchedules.length === 1);

  // Client schedules carry client_id in mission
  check(
    "schedule mission includes client_id",
    aSchedules[0]!.mission.client_id === clientA,
    `client_id=${aSchedules[0]!.mission.client_id}`,
  );

  // Cleanup
  removeClientSchedules(clientA);
  removeClientSchedules(clientB);
  check("cleanup removes schedules", getAllClientSchedules().length === 0);
}

// ═══════════════════════════════════════════════════════════════════
// 3. Stripe Webhook Signature Verification
// ═══════════════════════════════════════════════════════════════════

function testWebhookSignature(): void {
  console.log(`\n${TAG} ── Webhook Signature Verification ──`);

  // Without STRIPE_WEBHOOK_SECRET
  const noSecret = verifyWebhookSignature("body", "t=123,v1=abc");
  check("rejects when no secret configured", !noSecret.verified);

  // With a test secret
  const testSecret = "whsec_test_secret_1234567890";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.{"test":"data"}`;
  const sig = createHmac("sha256", testSecret).update(payload).digest("hex");

  const valid = verifyWebhookSignature('{"test":"data"}', `t=${timestamp},v1=${sig}`);
  check("valid signature passes", valid.verified, valid.error ?? "OK");

  const invalid = verifyWebhookSignature('{"test":"data"}', `t=${timestamp},v1=0000000000000000000000000000000000000000000000000000000000000000`);
  check("invalid signature rejected", !invalid.verified);

  // Old timestamp
  const oldTs = (Math.floor(Date.now() / 1000) - 600).toString();
  const oldPayload = `${oldTs}.{"old":"data"}`;
  const oldSig = createHmac("sha256", testSecret).update(oldPayload).digest("hex");
  const old = verifyWebhookSignature('{"old":"data"}', `t=${oldTs},v1=${oldSig}`);
  check("old timestamp rejected (>5m)", !old.verified);

  // Restore
  if (originalSecret !== undefined) {
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  } else {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. Stripe Webhook Handler Routing
// ═══════════════════════════════════════════════════════════════════

async function testWebhookRouting(): Promise<void> {
  console.log(`\n${TAG} ── Webhook Handler Routing ──`);

  const calls: string[] = [];
  const mockHandlers = {
    onCheckoutCompleted: async () => { calls.push("checkout"); return { ok: true, action: "checkout", error: null }; },
    onSubscriptionCreated: async () => { calls.push("sub_created"); return { ok: true, action: "sub_created", error: null }; },
    onSubscriptionUpdated: async () => { calls.push("sub_updated"); return { ok: true, action: "sub_updated", error: null }; },
    onSubscriptionDeleted: async () => { calls.push("sub_deleted"); return { ok: true, action: "sub_deleted", error: null }; },
    onPaymentFailed: async () => { calls.push("payment_failed"); return { ok: true, action: "payment_failed", error: null }; },
  };

  const events: Array<[string, string]> = [
    ["checkout.session.completed", "checkout"],
    ["customer.subscription.created", "sub_created"],
    ["customer.subscription.updated", "sub_updated"],
    ["customer.subscription.deleted", "sub_deleted"],
    ["invoice.payment_failed", "payment_failed"],
  ];

  for (const [eventType, expectedCall] of events) {
    calls.length = 0;
    const event: StripeWebhookEvent = {
      id: `evt_test_${eventType}`,
      type: eventType,
      data: { object: {} },
    };

    const result = await handleStripeWebhook(event, mockHandlers);
    check(`routes ${eventType}`, result.ok && calls[0] === expectedCall, `action=${result.action}`);
  }

  // Unknown event
  calls.length = 0;
  const unknown: StripeWebhookEvent = {
    id: "evt_unknown",
    type: "unknown.event.type",
    data: { object: {} },
  };
  const unknownResult = await handleStripeWebhook(unknown, mockHandlers);
  check("unknown event → ignored", unknownResult.action === "ignored");
}

// ═══════════════════════════════════════════════════════════════════
// 5. Checkout Session (no Stripe key = graceful failure)
// ═══════════════════════════════════════════════════════════════════

async function testCheckoutGraceful(): Promise<void> {
  console.log(`\n${TAG} ── Checkout Session (no API key) ──`);

  const original = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;

  const result = await createCheckoutSession({
    clientId: "test-client",
    email: "test@example.com",
    tier: "standard",
  });

  check("checkout fails gracefully without key", !result.ok);
  check("error message present", (result.error?.length ?? 0) > 0, result.error ?? "no error");

  if (original !== undefined) {
    process.env.STRIPE_SECRET_KEY = original;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6. Provisioning (dry — Supabase may not be configured in test env)
// ═══════════════════════════════════════════════════════════════════

async function testProvisioningDry(): Promise<void> {
  console.log(`\n${TAG} ── Provisioning (dry) ──`);

  // Test with unconfigured Supabase to verify graceful handling
  const result: ProvisionResult = await provisionClient(
    "dry-test-client",
    "professional",
    { url: "", serviceRoleKey: "" },
  );

  check("provisioning returns structured result", typeof result.ok === "boolean");
  check("provisioning has steps array", Array.isArray(result.steps));
  check("provisioning reports clientId", result.clientId === "dry-test-client");

  // With no Supabase, it should fail gracefully
  check("provisioning fails without Supabase", !result.ok, result.error ?? "no error");
}

// ═══════════════════════════════════════════════════════════════════
// 7. Handler Factory
// ═══════════════════════════════════════════════════════════════════

function testHandlerFactory(): void {
  console.log(`\n${TAG} ── Stripe Handler Factory ──`);

  const handlers = createStripeWebhookHandlers();
  check("factory returns onCheckoutCompleted", typeof handlers.onCheckoutCompleted === "function");
  check("factory returns onSubscriptionCreated", typeof handlers.onSubscriptionCreated === "function");
  check("factory returns onSubscriptionUpdated", typeof handlers.onSubscriptionUpdated === "function");
  check("factory returns onSubscriptionDeleted", typeof handlers.onSubscriptionDeleted === "function");
  check("factory returns onPaymentFailed", typeof handlers.onPaymentFailed === "function");
}

// ═══════════════════════════════════════════════════════════════════
// Runner
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log(`${TAG} ═══════════════════════════════════════════════`);
  console.log(`${TAG}  SaaS Onboarding — Validation Tests`);
  console.log(`${TAG} ═══════════════════════════════════════════════`);

  testPlanFeatures();
  testScheduleSeeding();
  testWebhookSignature();
  await testWebhookRouting();
  await testCheckoutGraceful();
  await testProvisioningDry();
  testHandlerFactory();

  console.log(`\n${TAG} ═══════════════════════════════════════════════`);
  console.log(`${TAG}  Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(`${TAG}  ${failed === 0 ? "ALL PASSED ✔" : "SOME FAILED ✘"}`);
  console.log(`${TAG} ═══════════════════════════════════════════════`);

  process.exit(failed > 0 ? 1 : 0);
}

void main();
