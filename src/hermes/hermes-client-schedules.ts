/**
 * Hermes Client Schedules — per-client schedule management.
 *
 * Seeds client-specific schedules into Hermes when a client is provisioned.
 * Schedules are stored in-memory and persisted to the Supabase `client_schedules`
 * table so they survive restarts.
 */

import type { ScheduleDefinition } from "./hermes-types.js";
import type { ClientTier } from "../db/db-types.js";
import {
  isConfigured,
  resolveConfig,
  supabaseGet,
  type SupabaseConfig,
} from "../db/supabase-client.js";

const TAG = "[SCHEDULER]";

// ── In-Memory Client Schedule Registry ─────────────────────────────

const clientSchedules: Map<string, ScheduleDefinition[]> = new Map();

/**
 * Seed schedules for a newly provisioned client.
 * Stores in-memory and persists to Supabase (best-effort).
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

  // Persist to Supabase (fire-and-forget, never blocks provisioning)
  void persistSchedules(clientId, schedules);

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

// ── Persistence ────────────────────────────────────────────────────

interface DbClientScheduleRow {
  id: string;
  client_id: string;
  schedule_key: string;
  name: string;
  cron: string;
  mission_type: string;
  objective: string;
  enabled: boolean;
}

/**
 * Persist client schedules to the `client_schedules` table via PostgREST upsert.
 * Uses `Prefer: resolution=merge-duplicates` on the unique (client_id, schedule_key) constraint.
 * Best-effort — never throws.
 */
async function persistSchedules(
  clientId: string,
  schedules: Array<{
    id: string;
    name: string;
    cron: string;
    mission_type: string;
    objective: string;
  }>,
): Promise<void> {
  const cfg = resolveConfig();
  if (!isConfigured(cfg)) return;

  for (const s of schedules) {
    try {
      const row = {
        client_id: clientId,
        schedule_key: s.id,
        name: s.name,
        cron: s.cron,
        mission_type: s.mission_type,
        objective: s.objective,
        enabled: true,
      };

      const res = await fetch(`${cfg.url}/rest/v1/client_schedules`, {
        method: "POST",
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(row),
      });

      if (res.ok) {
        console.log(`${TAG} schedule persisted: client=${clientId} key=${s.id}`);
      } else {
        const body = await res.text().catch(() => "");
        console.warn(`${TAG} schedule persist failed: client=${clientId} key=${s.id} status=${res.status} ${body.slice(0, 200)}`);
      }
    } catch {
      console.warn(`${TAG} schedule persist error: client=${clientId} key=${s.id}`);
    }
  }
}

/**
 * Restore all client schedules from the `client_schedules` table.
 * Repopulates the in-memory Map. Skips clients that already have
 * schedules loaded (duplicate avoided).
 * Best-effort — never throws, returns count of restored schedules.
 */
export async function restoreClientSchedules(
  cfg?: SupabaseConfig,
): Promise<{ clientCount: number; scheduleCount: number }> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping schedule restore`);
    return { clientCount: 0, scheduleCount: 0 };
  }

  try {
    const result = await supabaseGet<DbClientScheduleRow>(
      config,
      "client_schedules",
      "enabled=eq.true&order=client_id,schedule_key",
    );

    if (!result.ok || !result.data || result.data.length === 0) {
      console.log(`${TAG} No persisted schedules to restore`);
      return { clientCount: 0, scheduleCount: 0 };
    }

    // Group by client_id
    const byClient = new Map<string, DbClientScheduleRow[]>();
    for (const row of result.data) {
      const list = byClient.get(row.client_id) ?? [];
      list.push(row);
      byClient.set(row.client_id, list);
    }

    let scheduleCount = 0;

    for (const [clientId, rows] of byClient) {
      // Skip clients that already have schedules in memory
      if (clientSchedules.has(clientId)) {
        console.log(`${TAG} duplicate avoided: client=${clientId} already loaded`);
        continue;
      }

      const definitions: ScheduleDefinition[] = rows.map((row) => ({
        id: `client-${clientId}-${row.schedule_key}`,
        name: `[${clientId}] ${row.name}`,
        cron: row.cron,
        enabled: true,
        mission: {
          mission_type: row.mission_type as ScheduleDefinition["mission"]["mission_type"],
          objective: row.objective,
          input: { client_id: clientId },
          priority: "normal",
          client_id: clientId,
        },
      }));

      clientSchedules.set(clientId, definitions);
      scheduleCount += definitions.length;

      console.log(`${TAG} schedule restored: client=${clientId} count=${definitions.length}`);
    }

    console.log(`${TAG} Restore complete: ${byClient.size} client(s), ${scheduleCount} schedule(s)`);
    return { clientCount: byClient.size, scheduleCount };
  } catch (err) {
    console.warn(`${TAG} schedule restore failed: ${err instanceof Error ? err.message : String(err)}`);
    return { clientCount: 0, scheduleCount: 0 };
  }
}
