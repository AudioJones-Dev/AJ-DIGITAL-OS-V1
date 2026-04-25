import type { AttributionEvent, AttributionChannel, AttributionEventType, MAPScore } from "./attribution-types.js";

const MEANINGFUL_EVENT_TYPES: AttributionEventType[] = ["content_published", "run_completed", "content_distributed"];
const PROFITABLE_CHANNELS: AttributionChannel[] = ["seo", "aeo", "blog", "distribution"];

export function evaluateMAP(
  event: Pick<AttributionEvent, "eventType" | "channel" | "contentType" | "contentId">,
): MAPScore {
  const meaningful = MEANINGFUL_EVENT_TYPES.includes(event.eventType) && event.channel !== "unknown";
  const actionable = !!(event.contentType || event.contentId);
  const profitable = PROFITABLE_CHANNELS.includes(event.channel);
  const mapCompliant = meaningful && actionable && profitable;

  const reasons: string[] = [];
  if (!meaningful) reasons.push("eventType or channel not meaningful");
  if (!actionable) reasons.push("no contentType or contentId");
  if (!profitable) reasons.push("channel not in profitable set");

  const reasonStr = reasons.join("; ");
  return { meaningful, actionable, profitable, mapCompliant, ...(reasonStr ? { reason: reasonStr } : {}) };
}

export function filterMAPCompliant(events: AttributionEvent[]): AttributionEvent[] {
  return events.filter((e) => e.mapScore?.mapCompliant === true);
}

export function getMAPStats(events: AttributionEvent[]): {
  total: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
} {
  const compliant = events.filter((e) => e.mapScore?.mapCompliant === true).length;
  return {
    total: events.length,
    compliant,
    nonCompliant: events.length - compliant,
    complianceRate: events.length > 0 ? Math.round((compliant / events.length) * 100) / 100 : 0,
  };
}
