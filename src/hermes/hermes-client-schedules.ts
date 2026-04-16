/**
 * Hermes Client Schedules — per-client schedule management.
 *
 * Seeds client-specific schedules into Hermes when a client is provisioned.
 * Schedules are stored in-memory (same as core scheduler) and tagged with client_id.
 */

import type { ScheduleDefinition } from "./hermes-types.js";
import type { ClientTier } from "../db/db-types.js";

const TAG = "[HERMES-CLIENT-SCHEDULES]";

// ── In-Memory Client Schedule Registry ─────────────────────────────

const clientSchedules: Map<string, ScheduleDefinition[]> = new Map();

/**
 * Seed schedules for a newly provisioned client.
 * Returns the count of schedules added.
 */
export function seedClientSchedules(
  clientId: string,
  _planTier: ClientTier,
  schedules: Array<{
    id: string;
    name: string;
    cron: string;
    mission_type: string;
    objective: string;
  }>,
): { count: number } {
  const definitions: ScheduleDefinition[] = schedules.map((s) => ({
    id: `client-${clientId}-${s.id}`,
    name: `[${clientId}] ${s.name}`,
    cron: s.cron,
    enabled: true,
    mission: {
      mission_type: s.mission_type as ScheduleDefinition["mission"]["mission_type"],
      objective: s.objective,
      input: { client_id: clientId },
      priority: "normal",
      client_id: clientId,
    },
  }));

  clientSchedules.set(clientId, definitions);

  console.log(`${TAG} Seeded ${definitions.length} schedule(s) for client ${clientId}`);
  for (const d of definitions) {
    console.log(`${TAG}   → ${d.name} (${d.cron})`);
  }

  return { count: definitions.length };
}

/**
 * Get all schedules for a specific client.
 */
export function getClientSchedules(clientId: string): ScheduleDefinition[] {
  return clientSchedules.get(clientId) ?? [];
}

/**
 * Get all client schedules across all clients.
 */
export function getAllClientSchedules(): ScheduleDefinition[] {
  const all: ScheduleDefinition[] = [];
  for (const schedules of clientSchedules.values()) {
    all.push(...schedules);
  }
  return all;
}

/**
 * Remove all schedules for a client (e.g. on cancellation).
 */
export function removeClientSchedules(clientId: string): void {
  clientSchedules.delete(clientId);
  console.log(`${TAG} Removed schedules for client ${clientId}`);
}
