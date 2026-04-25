import type { AttributionEvent, MAPScore } from "./attribution-types.js";

const MEANINGFUL_EVENT_TYPES = new Set(["content_published", "run_completed", "content_distributed"]);
const PROFITABLE_CHANNELS = new Set(["seo", "aeo", "blog", "distribution"]);

export function evaluateMAP(event: AttributionEvent): MAPScore {
  const meaningful = MEANINGFUL_EVENT_TYPES.has(event.eventType) && event.channel !== "unknown";
  const actionable = event.contentType !== undefined || event.contentId !== undefined;
  const profitable = PROFITABLE_CHANNELS.has(event.channel);
  const mapCompliant = meaningful && actionable && profitable;

  const reasons: string[] = [];
  if (!meaningful) reasons.push("eventType not in meaningful set or channel unknown");
  if (!actionable) reasons.push("contentType and contentId both absent");
  if (!profitable) reasons.push("channel not in profitable set");

  const score: MAPScore = { meaningful, actionable, profitable, mapCompliant };
  if (reasons.length > 0) score.reason = reasons.join("; ");
  return score;
}

export function filterMAPCompliant(events: AttributionEvent[]): AttributionEvent[] {
  return events.filter((e) => {
    const score = e.mapScore ?? evaluateMAP(e);
    return score.mapCompliant;
  });
}

export function getMAPStats(events: AttributionEvent[]): {
  total: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
} {
  const total = events.length;
  const compliant = events.filter((e) => {
    const score = e.mapScore ?? evaluateMAP(e);
    return score.mapCompliant;
  }).length;
  const nonCompliant = total - compliant;
  const complianceRate = total === 0 ? 0 : Math.round((compliant / total) * 1000) / 10;
  return { total, compliant, nonCompliant, complianceRate };
}
