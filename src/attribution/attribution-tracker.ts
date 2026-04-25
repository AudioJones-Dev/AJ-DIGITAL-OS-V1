import { randomUUID } from "node:crypto";
import { mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type { AttributionEvent } from "./attribution-types.js";
import { evaluateMAP } from "./map-validator.js";

const LOG_PATH = join(process.cwd(), "logs", "attribution-events.jsonl");
const MAX_BUFFER = 1000;
const buffer: AttributionEvent[] = [];

function ensureLogDir(): void {
  try {
    mkdirSync(join(process.cwd(), "logs"), { recursive: true });
  } catch {
    // already exists
  }
}

export function emitEvent(
  event: Omit<AttributionEvent, "eventId" | "timestamp" | "mapScore">,
): AttributionEvent {
  const mapScore = evaluateMAP(event);
  const full: AttributionEvent = {
    ...event,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    mapScore,
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

export function getRecentEvents(limit = 100): AttributionEvent[] {
  return buffer.slice(-limit);
}

export function getEventsByRun(runId: string): AttributionEvent[] {
  return buffer.filter((e) => e.runId === runId);
}

export function getEventsByAgent(agentId: string): AttributionEvent[] {
  return buffer.filter((e) => e.agentId === agentId);
}
