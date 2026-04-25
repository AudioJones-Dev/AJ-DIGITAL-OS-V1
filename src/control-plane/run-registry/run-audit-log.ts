import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "./run-control-types.js";

const LOG_PATH = join(process.cwd(), "logs", "control-audit.jsonl");
const MAX_BUFFER = 500;

const buffer: AuditEvent[] = [];

function ensureDir(): void {
  const dir = join(process.cwd(), "logs");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function logAuditEvent(event: Omit<AuditEvent, "eventId" | "timestamp">): AuditEvent {
  ensureDir();
  const full: AuditEvent = {
    runId: event.runId,
    agentId: event.agentId,
    action: event.action,
    fromState: event.fromState,
    toState: event.toState,
    performedBy: event.performedBy,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    ...(event.metadata !== undefined ? { metadata: event.metadata } : {}),
  };
  buffer.push(full);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  appendFileSync(LOG_PATH, JSON.stringify(full) + "\n", "utf-8");
  return full;
}

export function getAuditEvents(runId?: string, limit?: number): AuditEvent[] {
  let events: AuditEvent[] = [];

  if (existsSync(LOG_PATH)) {
    try {
      events = readFileSync(LOG_PATH, "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as AuditEvent);
    } catch {
      events = [...buffer];
    }
  } else {
    events = [...buffer];
  }

  if (runId !== undefined) events = events.filter((e) => e.runId === runId);
  events = events.slice().reverse();
  if (limit !== undefined) events = events.slice(0, limit);
  return events;
}
