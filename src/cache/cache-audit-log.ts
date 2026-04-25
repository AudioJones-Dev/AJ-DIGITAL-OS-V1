/**
 * Cache Audit Log — JSONL events written to runtime/cache/cache-audit.jsonl
 * for every cache decision and side effect.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CacheDecision, CacheNamespace } from "./cache-types.js";

export type CacheAuditEventType =
  | "cache_hit"
  | "cache_miss"
  | "cache_stale"
  | "cache_invalidated"
  | "cache_write"
  | "cache_blocked_cross_tenant"
  | "cache_blocked_policy_mismatch"
  | "cache_bypass_high_risk";

export interface CacheAuditEvent {
  eventId: string;
  timestamp: string;
  eventType: CacheAuditEventType;
  namespace: CacheNamespace;
  cacheKey?: string;
  tenantId?: string;
  decision: CacheDecision;
  reason?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
}

const CACHE_DIR = join(process.cwd(), "runtime", "cache");
const AUDIT_PATH = join(CACHE_DIR, "cache-audit.jsonl");
const MAX_BUFFER = 500;

const buffer: CacheAuditEvent[] = [];

function ensureDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

export function logCacheAuditEvent(
  event: Omit<CacheAuditEvent, "eventId" | "timestamp">,
): CacheAuditEvent {
  const full: CacheAuditEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    namespace: event.namespace,
    decision: event.decision,
    ...(event.cacheKey !== undefined ? { cacheKey: event.cacheKey } : {}),
    ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
    ...(event.reason !== undefined ? { reason: event.reason } : {}),
    ...(event.performedBy !== undefined ? { performedBy: event.performedBy } : {}),
    ...(event.metadata !== undefined ? { metadata: event.metadata } : {}),
  };

  buffer.push(full);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  try {
    ensureDir();
    appendFileSync(AUDIT_PATH, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // file-system errors are non-fatal
  }

  return full;
}

export function getCacheAuditEvents(filter?: {
  namespace?: CacheNamespace;
  tenantId?: string;
  cacheKey?: string;
  limit?: number;
}): CacheAuditEvent[] {
  let events: CacheAuditEvent[] = [];
  if (existsSync(AUDIT_PATH)) {
    try {
      events = readFileSync(AUDIT_PATH, "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as CacheAuditEvent);
    } catch {
      events = [...buffer];
    }
  } else {
    events = [...buffer];
  }

  if (filter?.namespace !== undefined) events = events.filter((e) => e.namespace === filter.namespace);
  if (filter?.tenantId !== undefined) events = events.filter((e) => e.tenantId === filter.tenantId);
  if (filter?.cacheKey !== undefined) events = events.filter((e) => e.cacheKey === filter.cacheKey);

  events = events.slice().reverse();
  if (filter?.limit !== undefined) events = events.slice(0, filter.limit);
  return events;
}
