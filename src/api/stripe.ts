/**
 * Stripe Integration — Checkout + Webhook handlers.
 *
 * Uses raw fetch (no Stripe SDK) to stay consistent with existing codebase.
 * Webhook signature verification uses HMAC-SHA256.
 *
 * Env:
 *   STRIPE_SECRET_KEY      — sk_live_xxx or sk_test_xxx
 *   STRIPE_WEBHOOK_SECRET  — whsec_xxx
 *   STRIPE_PRICE_STANDARD  — price_xxx (standard tier)
 *   STRIPE_PRICE_PROFESSIONAL — price_xxx (professional tier)
 *   STRIPE_PRICE_ENTERPRISE   — price_xxx (enterprise tier)
 *   APP_BASE_URL           — e.g. https://app.ajdigital.com
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ClientTier } from "../db/db-types.js";

const TAG = "[STRIPE]";

// ── Config ─────────────────────────────────────────────────────────

function stripeKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

function webhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}

function appBaseUrl(): string {
  return process.env.APP_BASE_URL?.trim() ?? "http://localhost:5173";
}

/** Map plan tier to Stripe price ID. */
function priceIdForTier(tier: ClientTier): string {
  switch (tier) {
    case "professional":
      return process.env.STRIPE_PRICE_PROFESSIONAL?.trim() ?? "";
    case "enterprise":
      return process.env.STRIPE_PRICE_ENTERPRISE?.trim() ?? "";
    default:
      return process.env.STRIPE_PRICE_STANDARD?.trim() ?? "";
  }
}

// ── Stripe REST Helpers ────────────────────────────────────────────

async function stripePost<T>(
  endpoint: string,
  body: Record<string, string>,
): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  const key = stripeKey();
  if (!key) return { ok: false, data: null, error: "STRIPE_SECRET_KEY not configured" };

  try {
    const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    const json = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) {
      const msg = (json as Record<string, unknown>).error
        ? ((json as Record<string, { message?: string }>).error?.message ?? `Stripe ${res.status}`)
        : `Stripe ${res.status}`;
      return { ok: false, data: null, error: msg };
    }

    return { ok: true, data: json, error: null };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Checkout Session ───────────────────────────────────────────────

export interface CreateCheckoutInput {
  clientId: string;
  email: string;
  tier: ClientTier;
}

export interface CheckoutSessionResult {
  ok: boolean;
  sessionId: string | null;
  url: string | null;
  error: string | null;
}

/**
 * Create a Stripe Checkout Session for a new subscription.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CheckoutSessionResult> {
  const priceId = priceIdForTier(input.tier);
  if (!priceId) {
    return { ok: false, sessionId: null, url: null, error: `No Stripe price configured for tier: ${input.tier}` };
  }

  const base = appBaseUrl();
  const result = await stripePost<{
    id: string;
    url: string;
  }>("/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    customer_email: input.email,
    success_url: `${base}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/onboarding/cancel`,
    "metadata[client_id]": input.clientId,
    "metadata[plan_tier]": input.tier,
  });

  if (!result.ok || !result.data) {
    console.error(`${TAG} Checkout session creation failed:`, result.error);
    return { ok: false, sessionId: null, url: null, error: result.error };
  }

  console.log(`${TAG} Checkout session created: ${result.data.id} for client ${input.clientId}`);
  return { ok: true, sessionId: result.data.id, url: result.data.url, error: null };
}

// ── Webhook Signature Verification ─────────────────────────────────

/**
 * Verify Stripe webhook signature.
 * Returns the parsed event or null if verification fails.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string,
): { verified: boolean; error: string | null } {
  const secret = webhookSecret();
  if (!secret) return { verified: false, error: "STRIPE_WEBHOOK_SECRET not configured" };

  const parts = signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, val] = part.split("=");
      if (key && val) acc[key.trim()] = val.trim();
      return acc;
    },
    {} as Record<string, string>,
  );

  const timestamp = parts["t"];
  const v1Signature = parts["v1"];
  if (!timestamp || !v1Signature) {
    return { verified: false, error: "Missing t or v1 in signature header" };
  }

  // Reject if timestamp is older than 5 minutes
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return { verified: false, error: "Webhook timestamp too old (>5m)" };
  }

  const payload = `${timestamp}.${typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8")}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const sigBuf = Buffer.from(v1Signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { verified: false, error: "Signature mismatch" };
  }

  return { verified: true, error: null };
}

// ── Webhook Event Types ────────────────────────────────────────────

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface WebhookHandlerResult {
  ok: boolean;
  action: string;
  error: string | null;
}

/**
 * Route a Stripe webhook event to the appropriate handler.
 * Returns a result describing what action was taken.
 */
export async function handleStripeWebhook(
  event: StripeWebhookEvent,
  handlers: StripeWebhookHandlers,
): Promise<WebhookHandlerResult> {
  console.log(`${TAG} Webhook received: ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed":
      return handlers.onCheckoutCompleted(event.data.object);

    case "customer.subscription.created":
      return handlers.onSubscriptionCreated(event.data.object);

    case "customer.subscription.updated":
      return handlers.onSubscriptionUpdated(event.data.object);

    case "customer.subscription.deleted":
      return handlers.onSubscriptionDeleted(event.data.object);

    case "invoice.payment_failed":
      return handlers.onPaymentFailed(event.data.object);

    default:
      console.log(`${TAG} Unhandled event type: ${event.type}`);
      return { ok: true, action: "ignored", error: null };
  }
}

/**
 * Handler callbacks for each Stripe event type.
 * Implemented by the provisioning layer.
 */
export interface StripeWebhookHandlers {
  onCheckoutCompleted: (session: Record<string, unknown>) => Promise<WebhookHandlerResult>;
  onSubscriptionCreated: (subscription: Record<string, unknown>) => Promise<WebhookHandlerResult>;
  onSubscriptionUpdated: (subscription: Record<string, unknown>) => Promise<WebhookHandlerResult>;
  onSubscriptionDeleted: (subscription: Record<string, unknown>) => Promise<WebhookHandlerResult>;
  onPaymentFailed: (invoice: Record<string, unknown>) => Promise<WebhookHandlerResult>;
}
