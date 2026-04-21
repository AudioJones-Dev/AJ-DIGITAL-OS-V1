/**
 * Send a signed Stripe checkout.session.completed webhook to localhost.
 * Usage: node src/scripts/trigger-stripe-webhook.mjs
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

// Load .env manually
const envPath = new URL("../../.env", import.meta.url);
const envText = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envText.split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = "http://localhost:7420/api/stripe/webhook";

const checkoutSession = {
  id: "cs_test_" + Date.now(),
  object: "checkout.session",
  customer: "cus_test_" + Date.now(),
  customer_email: "test-deploy@ajdigital.com",
  subscription: "sub_test_" + Date.now(),
  payment_status: "paid",
  status: "complete",
  mode: "subscription",
  metadata: {
    plan_tier: "standard",
  },
  amount_total: 9900,
  currency: "gbp",
};

const event = {
  id: "evt_test_" + Date.now(),
  object: "event",
  type: "checkout.session.completed",
  data: { object: checkoutSession },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  api_version: "2023-10-16",
};

const body = JSON.stringify(event);
const timestamp = Math.floor(Date.now() / 1000);
const payload = `${timestamp}.${body}`;
const signature = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
const sigHeader = `t=${timestamp},v1=${signature}`;

console.log("[TRIGGER] Sending checkout.session.completed to", WEBHOOK_URL);
console.log("[TRIGGER] Event ID:", event.id);
console.log("[TRIGGER] Customer email:", checkoutSession.customer_email);

try {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": sigHeader,
    },
    body,
  });

  const text = await res.text();
  console.log(`[TRIGGER] Response: ${res.status} ${res.statusText}`);
  console.log("[TRIGGER] Body:", text);

  if (res.ok) {
    const parsed = JSON.parse(text);
    if (parsed.ok) {
      console.log("\n[TRIGGER] ✓ Webhook accepted and provisioning completed successfully.");
    } else {
      console.log("\n[TRIGGER] ✗ Webhook accepted but handler returned error:", parsed.error || parsed);
    }
  } else {
    console.log("\n[TRIGGER] ✗ Webhook rejected:", text);
  }
} catch (err) {
  console.error("[TRIGGER] FAILED:", err.message);
  process.exit(1);
}
