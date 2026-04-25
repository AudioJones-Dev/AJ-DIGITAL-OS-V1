/**
 * Operating Core — System Event Ledger v1
 *
 * Append-only JSONL store of cross-cutting system events. The ledger is the
 * source of truth for replay & audit; downstream stores (run-control, BEL)
 * stay authoritative for their own state.
 */

import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

import type { SystemEvent, SystemEventFilter } from "./event-types.js";
import { incrementMetric } from "../observability/metrics-store.js";

const SCHEMA_VERSION = "1.0.0";

export function eventLedgerPath(): string {
  return join(process.cwd(), "runtime", "events", "system-events.jsonl");
}

function ensureFile(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) writeFileSync(path, "", "utf-8");
}

function readAll(): SystemEvent[] {
  const path = eventLedgerPath();
  ensureFile(path);
  const raw = readFileSync(path, "utf-8");
  if (raw.trim().length === 0) return [];
  const events: SystemEvent[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as SystemEvent);
    } catch {
      // Skip malformed line — log via metric so we notice
      try {
        incrementMetric("event_ledger_parse_errors");
      } catch {
        // metrics module may not be ready during cold init
      }
    }
  }
  return events;
}

export type AppendSystemEventInput = Omit<SystemEvent, "eventId" | "timestamp" | "schemaVersion"> & {
  timestamp?: string;
  schemaVersion?: string;
};

export function appendSystemEvent(event: AppendSystemEventInput): SystemEvent {
  const path = eventLedgerPath();
  ensureFile(path);

  const enriched: SystemEvent = {
    eventId: randomUUID(),
    eventType: event.eventType,
    category: event.category,
    ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
    ...(event.runId !== undefined ? { runId: event.runId } : {}),
    ...(event.nodeId !== undefined ? { nodeId: event.nodeId } : {}),
    ...(event.actorId !== undefined ? { actorId: event.actorId } : {}),
    ...(event.actorType !== undefined ? { actorType: event.actorType } : {}),
    environment: event.environment,
    payload: event.payload,
    timestamp: event.timestamp ?? new Date().toISOString(),
    schemaVersion: event.schemaVersion ?? SCHEMA_VERSION,
    ...(event.correlationId !== undefined ? { correlationId: event.correlationId } : {}),
    ...(event.causationId !== undefined ? { causationId: event.causationId } : {}),
  };

  appendFileSync(path, JSON.stringify(enriched) + "\n", "utf-8");

  try {
    incrementMetric("system_event_count");
    incrementMetric(`system_event_count.${enriched.category}`);
  } catch {
    // metrics best-effort
  }

  return enriched;
}

export function listSystemEvents(filter?: SystemEventFilter): SystemEvent[] {
  let events = readAll();
  if (filter?.category !== undefined) events = events.filter((e) => e.category === filter.category);
  if (filter?.runId !== undefined) events = events.filter((e) => e.runId === filter.runId);
  if (filter?.tenantId !== undefined) events = events.filter((e) => e.tenantId === filter.tenantId);
  if (filter?.eventType !== undefined) events = events.filter((e) => e.eventType === filter.eventType);
  if (filter?.limit !== undefined) events = events.slice(-filter.limit);
  return events;
}

export function getEventsByRunId(runId: string): SystemEvent[] {
  return readAll().filter((e) => e.runId === runId);
}

export function getEventsByTenantId(tenantId: string): SystemEvent[] {
  return readAll().filter((e) => e.tenantId === tenantId);
}

export function getEventsByCategory(category: SystemEvent["category"]): SystemEvent[] {
  return readAll().filter((e) => e.category === category);
}

/**
 * Reset ledger — used by tests. Truncates the JSONL file.
 */
export function resetEventLedger(): void {
  const path = eventLedgerPath();
  ensureFile(path);
  writeFileSync(path, "", "utf-8");
}
