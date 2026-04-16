/**
 * Stripe Webhook Handlers — connects Stripe events to provisioning.
 *
 * Implements the StripeWebhookHandlers interface from stripe.ts.
 * Wired into the Hermes status API as HTTP routes.
 */

import type { StripeWebhookHandlers, WebhookHandlerResult } from "./stripe.js";
import type { ClientTier } from "../db/db-types.js";
import {
  supabaseInsert,
  supabasePatch,
  supabaseGet,
  resolveConfig,
  isConfigured,
  type SupabaseConfig,
} from "../db/supabase-client.js";
import { provisionClient } from "../services/provisioning.js";
import { removeClientSchedules } from "../hermes/hermes-client-schedules.js";
import { notify } from "../hermes/hermes-notifications.js";

const TAG = "[STRIPE-HANDLERS]";

// ── Handler Factory ────────────────────────────────────────────────

export function createStripeWebhookHandlers(
  config?: Partial<SupabaseConfig>,
): StripeWebhookHandlers {
  const cfg = resolveConfig(config);

  return {
    onCheckoutCompleted: (session) => handleCheckoutCompleted(session, cfg),
    onSubscriptionCreated: (sub) => handleSubscriptionCreated(sub, cfg),
    onSubscriptionUpdated: (sub) => handleSubscriptionUpdated(sub, cfg),
    onSubscriptionDeleted: (sub) => handleSubscriptionDeleted(sub, cfg),
    onPaymentFailed: (invoice) => handlePaymentFailed(invoice, cfg),
  };
}

// ── Checkout Completed ─────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Record<string, unknown>,
  cfg: SupabaseConfig,
): Promise<WebhookHandlerResult> {
  if (!isConfigured(cfg)) {
    return { ok: false, action: "checkout_completed", error: "Supabase not configured" };
  }

  const metadata = session["metadata"] as Record<string, string> | undefined;
  const clientId = metadata?.["client_id"];
  const planTier = (metadata?.["plan_tier"] ?? "standard") as ClientTier;
  const customerId = session["customer"] as string | undefined;
  const subscriptionId = session["subscription"] as string | undefined;
  const customerEmail = session["customer_email"] as string | undefined;

  if (!clientId) {
    // No client_id in metadata — create a new client from checkout info
    console.log(`${TAG} Checkout without client_id — creating new client`);

    const slug = (customerEmail ?? `client-${Date.now()}`)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .slice(0, 50);

    const clientResult = await supabaseInsert<{ id: string }>(cfg, "clients", {
      slug,
      display_name: slug,
      contact_email: customerEmail ?? null,
      tier: planTier,
      status: "provisioning",
      metadata: { stripe_checkout_session: session["id"] },
    });

    if (!clientResult.ok || !clientResult.data) {
      return { ok: false, action: "checkout_completed", error: `Failed to create client: ${clientResult.error}` };
    }

    const newClientId = clientResult.data.id;

    // Create subscription record
    if (customerId && subscriptionId) {
      await supabaseInsert(cfg, "subscriptions", {
        client_id: newClientId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: "active",
        plan_tier: planTier,
        current_period_end: null,
      });
    }

    // Provision
    const provision = await provisionClient(newClientId, planTier, cfg);
    return {
      ok: provision.ok,
      action: `checkout_completed:new_client:${newClientId}`,
      error: provision.error,
    };
  }

  // Existing client — create subscription + provision
  if (customerId && subscriptionId) {
    await supabaseInsert(cfg, "subscriptions", {
      client_id: clientId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: "active",
      plan_tier: planTier,
      current_period_end: null,
    });
  }

  const provision = await provisionClient(clientId, planTier, cfg);
  return {
    ok: provision.ok,
    action: `checkout_completed:provisioned:${clientId}`,
    error: provision.error,
  };
}

// ── Subscription Created ───────────────────────────────────────────

async function handleSubscriptionCreated(
  sub: Record<string, unknown>,
  cfg: SupabaseConfig,
): Promise<WebhookHandlerResult> {
  if (!isConfigured(cfg)) {
    return { ok: false, action: "subscription_created", error: "Supabase not configured" };
  }

  const stripeSubId = sub["id"] as string;
  const customerId = sub["customer"] as string;
  const status = sub["status"] as string;
  const periodEnd = sub["current_period_end"] as number | undefined;

  // Check if we already recorded this from checkout.session.completed
  const existing = await supabaseGet<{ id: string }>(
    cfg,
    "subscriptions",
    `stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}&limit=1`,
  );

  if (existing.data && existing.data.length > 0) {
    // Already exists — just update status
    await supabasePatch(
      cfg,
      "subscriptions",
      `stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}`,
      {
        status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      },
    );
    return { ok: true, action: "subscription_created:updated_existing", error: null };
  }

  console.log(`${TAG} Subscription created: ${stripeSubId} (customer: ${customerId})`);
  return { ok: true, action: "subscription_created:acknowledged", error: null };
}

// ── Subscription Updated ───────────────────────────────────────────

async function handleSubscriptionUpdated(
  sub: Record<string, unknown>,
  cfg: SupabaseConfig,
): Promise<WebhookHandlerResult> {
  if (!isConfigured(cfg)) {
    return { ok: false, action: "subscription_updated", error: "Supabase not configured" };
  }

  const stripeSubId = sub["id"] as string;
  const status = sub["status"] as string;
  const periodEnd = sub["current_period_end"] as number | undefined;

  const result = await supabasePatch(
    cfg,
    "subscriptions",
    `stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}`,
    {
      status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    },
  );

  if (!result.ok) {
    return { ok: false, action: "subscription_updated", error: result.error };
  }

  console.log(`${TAG} Subscription updated: ${stripeSubId} → ${status}`);
  return { ok: true, action: `subscription_updated:${status}`, error: null };
}

// ── Subscription Deleted (Canceled) ────────────────────────────────

async function handleSubscriptionDeleted(
  sub: Record<string, unknown>,
  cfg: SupabaseConfig,
): Promise<WebhookHandlerResult> {
  if (!isConfigured(cfg)) {
    return { ok: false, action: "subscription_deleted", error: "Supabase not configured" };
  }

  const stripeSubId = sub["id"] as string;

  // Find the subscription to get client_id
  const existing = await supabaseGet<{ client_id: string }>(
    cfg,
    "subscriptions",
    `stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}&select=client_id&limit=1`,
  );

  const clientId = existing.data?.[0]?.client_id;

  // Mark subscription canceled
  await supabasePatch(
    cfg,
    "subscriptions",
    `stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}`,
    { status: "canceled" },
  );

  // Pause the client
  if (clientId) {
    await supabasePatch(cfg, "clients", `id=eq.${encodeURIComponent(clientId)}`, {
      status: "paused",
    });
    removeClientSchedules(clientId);

    notify({
      severity: "warning",
      channel: "console",
      title: "Subscription Canceled",
      message: `Client ${clientId} subscription canceled — paused account`,
      metadata: { client_id: clientId, stripe_subscription_id: stripeSubId },
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`${TAG} Subscription canceled: ${stripeSubId}`);
  return { ok: true, action: `subscription_deleted:paused:${clientId ?? "unknown"}`, error: null };
}

// ── Payment Failed ─────────────────────────────────────────────────

async function handlePaymentFailed(
  invoice: Record<string, unknown>,
  cfg: SupabaseConfig,
): Promise<WebhookHandlerResult> {
  if (!isConfigured(cfg)) {
    return { ok: false, action: "payment_failed", error: "Supabase not configured" };
  }

  const customerId = invoice["customer"] as string;
  const subscriptionId = invoice["subscription"] as string | undefined;

  if (subscriptionId) {
    await supabasePatch(
      cfg,
      "subscriptions",
      `stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
      { status: "past_due" },
    );
  }

  // Find client for notification
  const sub = subscriptionId
    ? await supabaseGet<{ client_id: string }>(
        cfg,
        "subscriptions",
        `stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=client_id&limit=1`,
      )
    : null;

  const clientId = sub?.data?.[0]?.client_id;

  notify({
    severity: "critical",
    channel: "console",
    title: "Payment Failed",
    message: `Invoice payment failed for customer ${customerId}${clientId ? ` (client: ${clientId})` : ""}`,
    metadata: { stripe_customer_id: customerId, client_id: clientId },
    timestamp: new Date().toISOString(),
  });

  console.log(`${TAG} Payment failed: customer ${customerId}, subscription ${subscriptionId ?? "n/a"}`);
  return { ok: true, action: `payment_failed:${customerId}`, error: null };
}
