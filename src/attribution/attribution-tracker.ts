import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { AttributionEvent } from "./attribution-types.js";
import { evaluateMAP } from "./map-validator.js";

const LOGS_DIR = path.join(process.cwd(), "logs");
const EVENTS_FILE = path.join(LOGS_DIR, "attribution-events.jsonl");
const BUFFER_MAX = 1000;

const buffer: AttributionEvent[] = [];

async function ensureLogsDir(): Promise<void> {
  await mkdir(LOGS_DIR, { recursive: true });
}

export async function emitEvent(
  event: Omit<AttributionEvent, "eventId" | "timestamp" | "mapScore">,
): Promise<AttributionEvent> {
  const partial: Omit<AttributionEvent, "mapScore"> = {
    ...event,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const mapScore = evaluateMAP(partial as AttributionEvent);
  const full: AttributionEvent = { ...partial, mapScore };

  buffer.push(full);
  if (buffer.length > BUFFER_MAX) {
    buffer.shift();
  }

  try {
    await ensureLogsDir();
    await appendFile(EVENTS_FILE, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // File write errors are non-fatal
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
