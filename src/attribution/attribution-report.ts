import type { AttributionSummary } from "./attribution-types.js";
import { getEventsByAgent } from "./attribution-tracker.js";

export function generateSummary(agentId: string, periodDays: number): AttributionSummary {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const events = getEventsByAgent(agentId).filter(
    (e) => new Date(e.timestamp) >= periodStart,
  );

  const totalRuns = events.filter(
    (e) => e.eventType === "run_created" || e.eventType === "run_completed" || e.eventType === "run_failed",
  ).length;
  const completedRuns = events.filter((e) => e.eventType === "run_completed").length;
  const failedRuns = events.filter((e) => e.eventType === "run_failed").length;
  const publishedContent = events.filter(
    (e) => e.eventType === "content_published" || e.eventType === "content_distributed",
  ).length;
  const mapCompliantCount = events.filter((e) => e.mapScore?.mapCompliant === true).length;

  return {
    agentId,
    channel: events[0]?.channel ?? "unknown",
    totalRuns,
    completedRuns,
    failedRuns,
    publishedContent,
    mapCompliantCount,
    mapComplianceRate:
      events.length > 0 ? Math.round((mapCompliantCount / events.length) * 100) / 100 : 0,
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
  };
}
