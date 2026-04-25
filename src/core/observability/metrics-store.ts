/**
 * Operating Core — Observability Foundation v1
 *
 * File-backed counters for the cross-cutting concerns. Sub-modules call
 * `incrementMetric` (best-effort, must never throw outside this module).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

import type {
  EventMetrics,
  MetricsSnapshot,
  PolicyMetrics,
  RunMetrics,
} from "./metrics-types.js";

const KNOWN_METRICS: ReadonlyArray<string> = [
  "run_created_count",
  "run_completed_count",
  "run_failed_count",
  "state_transition_count",
  "policy_allow_count",
  "policy_block_count",
  "approval_required_count",
  "idempotency_hit_count",
  "idempotency_conflict_count",
  "system_event_count",
  "attribution_emit_count",
  "attribution_failure_count",
];

export function metricsPath(): string {
  return join(process.cwd(), "runtime", "observability", "metrics.json");
}

function ensureFile(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) writeFileSync(path, "{}", "utf-8");
}

function readAll(): MetricsSnapshot {
  const path = metricsPath();
  ensureFile(path);
  try {
    const raw = readFileSync(path, "utf-8");
    if (raw.trim().length === 0) return {};
    return JSON.parse(raw) as MetricsSnapshot;
  } catch {
    return {};
  }
}

function writeAll(snapshot: MetricsSnapshot): void {
  const path = metricsPath();
  ensureFile(path);
  writeFileSync(path, JSON.stringify(snapshot, null, 2), "utf-8");
}

export function recordMetric(name: string, value: number): void {
  const snap = readAll();
  snap[name] = value;
  writeAll(snap);
}

export function incrementMetric(name: string, by = 1): void {
  const snap = readAll();
  snap[name] = (snap[name] ?? 0) + by;
  writeAll(snap);
}

export function getMetricSnapshot(): MetricsSnapshot {
  const snap = readAll();
  for (const key of KNOWN_METRICS) {
    if (snap[key] === undefined) snap[key] = 0;
  }
  return snap;
}

export function getRunMetrics(): RunMetrics {
  const snap = readAll();
  return {
    created: snap["run_created_count"] ?? 0,
    completed: snap["run_completed_count"] ?? 0,
    failed: snap["run_failed_count"] ?? 0,
  };
}

export function getPolicyMetrics(): PolicyMetrics {
  const snap = readAll();
  return {
    allow: snap["policy_allow_count"] ?? 0,
    block: snap["policy_block_count"] ?? 0,
    approval_required: snap["approval_required_count"] ?? 0,
  };
}

export function getEventMetrics(): EventMetrics {
  const snap = readAll();
  const total = snap["system_event_count"] ?? 0;
  const byCategory: Record<string, number> = {};
  for (const [key, value] of Object.entries(snap)) {
    if (key.startsWith("system_event_count.")) {
      byCategory[key.slice("system_event_count.".length)] = value;
    }
  }
  return { total, by_category: byCategory };
}

/**
 * Reset all metrics — used by tests.
 */
export function resetMetrics(): void {
  writeAll({});
}
