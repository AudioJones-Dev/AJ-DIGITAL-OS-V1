import { getCacheAuditEvents } from "../cache/cache-audit-log.js";
import type { CacheAuditEvent } from "../cache/cache-audit-log.js";
import type { CacheNamespace } from "../cache/cache-types.js";

export interface CacheAuditCommandInput {
  namespace?: string;
  tenantId?: string;
  cacheKey?: string;
  limit?: number;
  json?: boolean;
}

export interface CacheAuditCommandResult {
  ok: boolean;
  command: "cache-audit";
  rendered: boolean;
  events: CacheAuditEvent[];
  warnings: string[];
  errors: string[];
}

export class CacheAuditCommand {
  async run(input: CacheAuditCommandInput = {}): Promise<CacheAuditCommandResult> {
    const events = getCacheAuditEvents({
      ...(input.namespace !== undefined ? { namespace: input.namespace as CacheNamespace } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.cacheKey !== undefined ? { cacheKey: input.cacheKey } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : { limit: 100 }),
    });

    if (input.json) {
      console.log(JSON.stringify({ ok: true, events }, null, 2));
    } else {
      console.log("CACHE AUDIT LOG");
      console.log("===============");
      if (events.length === 0) {
        console.log("(no events)");
      } else {
        for (const e of events) {
          console.log(
            `${e.timestamp} ${e.eventType.padEnd(28)} ${e.namespace.padEnd(16)} ${(e.cacheKey ?? "-").padEnd(48)} ${e.decision}${e.reason ? " — " + e.reason : ""}`,
          );
        }
      }
    }

    return { ok: true, command: "cache-audit", rendered: true, events, warnings: [], errors: [] };
  }
}
