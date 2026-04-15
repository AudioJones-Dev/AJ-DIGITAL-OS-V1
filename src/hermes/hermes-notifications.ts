/**
 * Hermes Notifications — console + webhook notification layer.
 *
 * Supports:
 * - console: human-readable log output
 * - log: structured JSON for aggregation
 * - webhook: delivers to SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL, or N8N_WEBHOOK_URL
 *
 * Webhook failures are logged but never throw fatally.
 */

import type { HermesNotification, NotificationChannel } from "./hermes-types.js";

const TAG = "[HERMES-NOTIFY]";

// ── Notification History (in-memory, not persisted) ────────────────

const recentNotifications: HermesNotification[] = [];
const MAX_RECENT = 50;

// ── Webhook Delivery ───────────────────────────────────────────────

function getWebhookUrl(): string | null {
  return (
    process.env.SLACK_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_WEBHOOK_URL?.trim() ||
    process.env.N8N_WEBHOOK_URL?.trim() ||
    null
  );
}

function getWebhookType(): "slack" | "discord" | "n8n" | null {
  if (process.env.SLACK_WEBHOOK_URL?.trim()) return "slack";
  if (process.env.DISCORD_WEBHOOK_URL?.trim()) return "discord";
  if (process.env.N8N_WEBHOOK_URL?.trim()) return "n8n";
  return null;
}

function buildWebhookPayload(
  n: HermesNotification,
  type: "slack" | "discord" | "n8n",
): unknown {
  const icon = n.severity === "critical" ? "🔴" : n.severity === "warning" ? "🟡" : "🟢";
  const text = `${icon} **[${n.severity.toUpperCase()}]** ${n.title}\n${n.message}`;

  switch (type) {
    case "slack":
      return {
        text: `${icon} *[${n.severity.toUpperCase()}]* ${n.title}\n${n.message}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${icon} *${n.title}*\n${n.message}`,
            },
          },
          ...(n.metadata && Object.keys(n.metadata).length > 0
            ? [{
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: Object.entries(n.metadata)
                      .map(([k, v]) => `*${k}:* ${String(v)}`)
                      .join(" | "),
                  },
                ],
              }]
            : []),
        ],
      };

    case "discord":
      return {
        content: text,
        embeds: [
          {
            title: n.title,
            description: n.message,
            color: n.severity === "critical" ? 0xef4444 : n.severity === "warning" ? 0xeab308 : 0x22c55e,
            timestamp: n.timestamp,
            fields: n.metadata
              ? Object.entries(n.metadata).map(([k, v]) => ({
                  name: k,
                  value: String(v),
                  inline: true,
                }))
              : [],
          },
        ],
      };

    case "n8n":
      return {
        severity: n.severity,
        title: n.title,
        message: n.message,
        metadata: n.metadata ?? {},
        timestamp: n.timestamp,
        source: "hermes",
      };
  }
}

async function deliverWebhook(n: HermesNotification): Promise<void> {
  const url = getWebhookUrl();
  const type = getWebhookType();

  if (!url || !type) {
    return;
  }

  try {
    const payload = buildWebhookPayload(n, type);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      console.log(`${TAG} [WEBHOOK:${type}] Delivered: ${n.title}`);
    } else {
      console.warn(`${TAG} [WEBHOOK:${type}] Failed (${res.status}): ${n.title}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`${TAG} [WEBHOOK:${type}] Error: ${msg}`);
  }
}

// ── Telegram Delivery ──────────────────────────────────────────────

function getTelegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  return { token, chatId };
}

async function deliverTelegram(n: HermesNotification): Promise<void> {
  const tg = getTelegramConfig();
  if (!tg) return;

  const icon = n.severity === "critical" ? "🔴" : n.severity === "warning" ? "🟡" : "🟢";
  const metaLines = n.metadata && Object.keys(n.metadata).length > 0
    ? "\n" + Object.entries(n.metadata).map(([k, v]) => `• *${k}:* ${String(v)}`).join("\n")
    : "";

  const text = `${icon} *\\[${n.severity.toUpperCase()}\\]* ${n.title}\n${n.message}${metaLines}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${tg.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tg.chatId,
        text,
        parse_mode: "MarkdownV2",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      console.log(`${TAG} [TELEGRAM] Delivered: ${n.title}`);
    } else {
      const body = await res.text().catch(() => "");
      console.warn(`${TAG} [TELEGRAM] Failed (${res.status}): ${body.slice(0, 200)}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`${TAG} [TELEGRAM] Error: ${msg}`);
  }
}

// ── Channel Handlers ───────────────────────────────────────────────

const channelHandlers: Record<NotificationChannel, (n: HermesNotification) => void> = {
  console: (n) => {
    const icon = n.severity === "critical" ? "🔴" : n.severity === "warning" ? "🟡" : "🟢";
    console.log(`${TAG} ${icon} [${n.severity.toUpperCase()}] ${n.title}: ${n.message}`);
  },

  log: (n) => {
    // Structured log output for log aggregation
    console.log(JSON.stringify({
      system: "hermes",
      level: n.severity,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      timestamp: n.timestamp,
    }));
  },

  webhook: (n) => {
    // Fire-and-forget webhook delivery — never throws
    void deliverWebhook(n);
  },

  telegram: (n) => {
    // Fire-and-forget Telegram delivery — never throws
    void deliverTelegram(n);
  },
};

// ── Public API ─────────────────────────────────────────────────────

/**
 * Send a notification through the specified channel.
 */
export function notify(notification: HermesNotification): void {
  const handler = channelHandlers[notification.channel];
  if (handler) {
    handler(notification);
  } else {
    channelHandlers.console(notification);
  }

  // Keep recent history in memory (not persisted)
  recentNotifications.push(notification);
  if (recentNotifications.length > MAX_RECENT) {
    recentNotifications.shift();
  }
}

/**
 * Send a notification to all channels.
 */
export function notifyAll(
  severity: HermesNotification["severity"],
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const base = {
    severity,
    title,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };

  for (const channel of Object.keys(channelHandlers) as NotificationChannel[]) {
    notify({ ...base, channel, metadata: metadata ?? {} });
  }
}

/**
 * Get recent in-memory notification history (not persisted).
 */
export function getRecentNotifications(): readonly HermesNotification[] {
  return recentNotifications;
}

/**
 * Clear in-memory notification history.
 */
export function clearNotifications(): void {
  recentNotifications.length = 0;
}
