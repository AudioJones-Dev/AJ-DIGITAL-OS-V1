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
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
