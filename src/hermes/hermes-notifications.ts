/**
 * Hermes Notifications — stub notification layer.
 *
 * Currently logs to console. Designed to be extended with:
 * - webhook delivery
 * - Slack/Discord integration
 * - email alerts
 *
 * Hermes does NOT store notification history. It fires and forgets.
 */

import type { HermesNotification, NotificationChannel } from "./hermes-types.js";

const TAG = "[HERMES-NOTIFY]";

// ── Notification History (in-memory, not persisted) ────────────────

const recentNotifications: HermesNotification[] = [];
const MAX_RECENT = 50;

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

  webhook: (_n) => {
    // Stub: would POST to a configured webhook URL
    // Not implemented yet — will be wired when webhook endpoint is configured
    console.log(`${TAG} [WEBHOOK-STUB] Would send: ${_n.title}`);
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
