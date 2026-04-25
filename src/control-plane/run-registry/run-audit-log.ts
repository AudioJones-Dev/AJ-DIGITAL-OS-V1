import { randomUUID } from "node:crypto";
import { mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type { AuditEvent } from "./run-control-types.js";

const LOG_PATH = join(process.cwd(), "logs", "control-audit.jsonl");
const MAX_BUFFER = 500;
const buffer: AuditEvent[] = [];

function ensureLogDir(): void {
  try {
    mkdirSync(join(process.cwd(), "logs"), { recursive: true });
  } catch {
    // already exists
  }
}

export function logAuditEvent(
  event: Omit<AuditEvent, "eventId" | "timestamp">,
): AuditEvent {
  const full: AuditEvent = {
    ...event,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  buffer.push(full);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  try {
    ensureLogDir();
    appendFileSync(LOG_PATH, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // best-effort
  }
  return full;
}

export function getAuditEvents(runId?: string, limit?: number): AuditEvent[] {
  let results = runId ? buffer.filter((e) => e.runId === runId) : [...buffer];
  if (limit) results = results.slice(-limit);
  return results;
}
