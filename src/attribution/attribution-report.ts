import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AttributionChannel, AttributionEvent, AttributionSummary } from "./attribution-types.js";
import { getEventsByAgent } from "./attribution-tracker.js";

const LOGS_DIR = path.join(process.cwd(), "logs");
const EVENTS_FILE = path.join(LOGS_DIR, "attribution-events.jsonl");

async function loadFromLog(): Promise<AttributionEvent[]> {
  try {
    const content = await readFile(EVENTS_FILE, "utf-8");
    const events: AttributionEvent[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as AttributionEvent);
      } catch {
        // Skip malformed lines
      }
    }
    return events;
  } catch {
    return [];
  }
}

export async function generateSummary(agentId: string, periodDays: number): Promise<AttributionSummary> {
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  let events = getEventsByAgent(agentId);

  if (events.length === 0) {
    const allEvents = await loadFromLog();
    events = allEvents.filter((e) => e.agentId === agentId);
  }

  events = events.filter((e) => e.timestamp >= periodStart && e.timestamp <= periodEnd);

  const channelCounts: Partial<Record<AttributionChannel, number>> = {};
  for (const event of events) {
    channelCounts[event.channel] = (channelCounts[event.channel] ?? 0) + 1;
  }

  let channel: AttributionChannel = "unknown";
  let maxCount = 0;
  for (const entry of Object.entries(channelCounts)) {
    const ch = entry[0];
    const count = entry[1];
    if (ch !== undefined && count !== undefined && count > maxCount) {
      channel = ch as AttributionChannel;
      maxCount = count;
    }
  }

  const totalRuns = events.filter((e) => e.eventType === "run_created").length;
  const completedRuns = events.filter((e) => e.eventType === "run_completed").length;
  const failedRuns = events.filter((e) => e.eventType === "run_failed").length;
  const publishedContent = events.filter((e) => e.eventType === "content_published").length;

  return {
    agentId,
    channel,
    totalRuns,
    completedRuns,
    failedRuns,
    publishedContent,
    periodStart,
    periodEnd,
  };
}
