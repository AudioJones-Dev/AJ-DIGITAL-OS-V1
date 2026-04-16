/**
 * Hermes Status API — lightweight HTTP endpoint for runtime state.
 *
 * Exposes Hermes runtime state (scheduler, watcher, notifications) over HTTP
 * so the dashboard (or any consumer) can poll for live status.
 *
 * Default port: 7420 (overridable via HERMES_STATUS_PORT env var).
 * Only binds to localhost — not exposed externally.
 */

import { createServer, type Server } from "node:http";
import { getSchedulerStatus } from "./hermes-scheduler.js";
import { isWatcherRunning, getLastCheckAt } from "./hermes-failure-watcher.js";
import { getRecentNotifications } from "./hermes-notifications.js";
import { getEnabledSchedules, DEFAULT_SCHEDULES } from "./hermes-schedule-config.js";
import { getFullRunData, getRecentRepairEvents } from "../db/neon-client.js";
import { getRecentRepairs } from "./hermes-repair-engine.js";
import {
  createCheckoutSession,
  verifyWebhookSignature,
  handleStripeWebhook,
  type StripeWebhookEvent,
} from "../api/stripe.js";
import { createStripeWebhookHandlers } from "../api/stripe-handlers.js";

const TAG = "[HERMES-API]";
const DEFAULT_PORT = 7420;

let server: Server | null = null;

export interface HermesRuntimeStatus {
  scheduler: {
    running: boolean;
    activeSchedules: number;
    failuresSinceStart: number;
  };
  watcher: {
    running: boolean;
    lastCheck: string | null;
  };
  schedules: {
    enabled: number;
    total: number;
  };
  notifications: {
    recent: number;
    lastAlert: {
      severity: string;
      title: string;
      message: string;
      timestamp: string;
    } | null;
    lastRetry: {
      title: string;
      message: string;
      timestamp: string;
    } | null;
  };
  timestamp: string;
}

function buildStatus(): HermesRuntimeStatus {
  const status = getSchedulerStatus();
  const notifications = getRecentNotifications();
  const enabled = getEnabledSchedules(DEFAULT_SCHEDULES);

  const lastAlert =
    [...notifications].reverse().find((n) => n.severity === "critical" || n.severity === "warning") ?? null;

  const lastRetry =
    [...notifications].reverse().find((n) => n.title.toLowerCase().includes("retry")) ?? null;

  return {
    scheduler: {
      running: status.running,
      activeSchedules: status.activeSchedules,
      failuresSinceStart: status.failuresSinceStart,
    },
    watcher: {
      running: isWatcherRunning(),
      lastCheck: getLastCheckAt(),
    },
    schedules: {
      enabled: enabled.length,
      total: DEFAULT_SCHEDULES.length,
    },
    notifications: {
      recent: notifications.length,
      lastAlert: lastAlert
        ? { severity: lastAlert.severity, title: lastAlert.title, message: lastAlert.message, timestamp: lastAlert.timestamp }
        : null,
      lastRetry: lastRetry
        ? { title: lastRetry.title, message: lastRetry.message, timestamp: lastRetry.timestamp }
        : null,
    },
    timestamp: new Date().toISOString(),
  };
}

// ── Body Collector ─────────────────────────────────────────────────

function collectBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 1_048_576; // 1 MB

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

/**
 * Start the Hermes status API on localhost.
 */
export function startHermesApi(port?: number): void {
  if (server) {
    console.log(`${TAG} Already running.`);
    return;
  }

  const p = port ?? (Number(process.env.HERMES_STATUS_PORT) || DEFAULT_PORT);

  server = createServer((req, res) => {
    // CORS headers for dashboard access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/status" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildStatus()));
      return;
    }

    // Replay endpoint — load full run data from Neon by run_ref
    const replayMatch = req.url?.match(/^\/replay\/(.+)$/);
    if (replayMatch) {
      const runRef = decodeURIComponent(replayMatch[1]!);
      getFullRunData(runRef)
        .then((result) => {
          if (!result.ok || !result.data) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: result.error ?? "Run not found" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: result.data }));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    // Repairs endpoint — recent repair events from Neon + in-memory
    if (req.url === "/repairs" || req.url?.startsWith("/repairs?")) {
      getRecentRepairEvents(30)
        .then((result) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: true,
            data: result.ok ? result.data : [],
            inMemory: getRecentRepairs(),
          }));
        })
        .catch((err: unknown) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: true,
            data: [],
            inMemory: getRecentRepairs(),
            error: err instanceof Error ? err.message : "Failed to fetch repair events",
          }));
        });
      return;
    }

    // ── Stripe: Create Checkout Session ─────────────────────────────
    if (req.url === "/api/stripe/create-checkout-session" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const clientId = body["clientId"] as string | undefined;
          const email = body["email"] as string | undefined;
          const tier = (body["tier"] as string | undefined) ?? "standard";

          if (!email) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "email is required" }));
            return;
          }

          return createCheckoutSession({
            clientId: clientId ?? "",
            email,
            tier: tier as "standard" | "professional" | "enterprise",
          }).then((result) => {
            res.writeHead(result.ok ? 200 : 500, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          });
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Stripe: Webhook ──────────────────────────────────────────────
    if (req.url === "/api/stripe/webhook" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const sig = req.headers["stripe-signature"];
          if (typeof sig !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Missing Stripe-Signature header" }));
            return;
          }

          const verification = verifyWebhookSignature(raw, sig);
          if (!verification.verified) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: verification.error }));
            return;
          }

          const event = JSON.parse(raw) as StripeWebhookEvent;
          const handlers = createStripeWebhookHandlers();

          return handleStripeWebhook(event, handlers).then((result) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          });
        })
        .catch((err: unknown) => {
          console.error(`${TAG} Stripe webhook error:`, err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Internal webhook error" }));
        });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(p, "127.0.0.1", () => {
    console.log(`${TAG} Status API listening on http://127.0.0.1:${p}/status`);
  });
}

/**
 * Stop the Hermes status API.
 */
export function stopHermesApi(): void {
  if (!server) return;
  server.close();
  server = null;
  console.log(`${TAG} Status API stopped.`);
}
