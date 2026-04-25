import { getCacheStats } from "../cache/cache-store.js";
import type { CacheNamespace, CacheStats } from "../cache/cache-types.js";

export interface CacheStatsCommandInput {
  namespace?: string;
  json?: boolean;
}

export interface CacheStatsCommandResult {
  ok: boolean;
  command: "cache-stats";
  rendered: boolean;
  stats: CacheStats[];
  warnings: string[];
  errors: string[];
}

export class CacheStatsCommand {
  async run(input: CacheStatsCommandInput = {}): Promise<CacheStatsCommandResult> {
    const stats = getCacheStats(input.namespace as CacheNamespace | undefined);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, stats }, null, 2));
    } else {
      console.log("CACHE STATS");
      console.log("===========");
      console.log(`${"namespace".padEnd(18)} ${"total".padEnd(8)} ${"active".padEnd(8)} ${"stale".padEnd(8)} invalidated`);
      for (const s of stats) {
        console.log(
          `${s.namespace.padEnd(18)} ${String(s.totalEntries).padEnd(8)} ${String(s.activeEntries).padEnd(8)} ${String(s.staleEntries).padEnd(8)} ${s.invalidatedEntries}`,
        );
      }
    }

    return { ok: true, command: "cache-stats", rendered: true, stats, warnings: [], errors: [] };
  }
}
