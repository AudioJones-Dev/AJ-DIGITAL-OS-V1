import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "./run-control-types.js";
import { resolveLogsPath } from "../../core/runtime-paths.js";

const MAX_BUFFER = 500;

const buffer: AuditEvent[] = [];

function logPath(): string {
  return resolveLogsPath("control-audit.jsonl");
}

function ensureDir(): void {
  const dir = resolveLogsPath();
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
    decision: event.decision ?? "allow",
    risk: event.risk ?? "low",
    ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
    ...(event.enforcementResult !== undefined ? { enforcementResult: event.enforcementResult } : {}),
    ...(event.approvalId !== undefined ? { approvalId: event.approvalId } : {}),
    ...(event.metadata !== undefined ? { metadata: event.metadata } : {}),
  };
  buffer.push(full);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  appendFileSync(logPath(), JSON.stringify(full) + "\n", "utf-8");
  return full;
}

export function getAuditEvents(runId?: string, limit?: number): AuditEvent[] {
  let events: AuditEvent[] = [];

  const path = logPath();
  if (existsSync(path)) {
    try {
      events = readFileSync(path, "utf-8")
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
