import { listCacheEntries } from "../cache/cache-store.js";
import type { CacheEntry, CacheNamespace } from "../cache/cache-types.js";

export interface CacheListCommandInput {
  namespace?: string;
  tenantId?: string;
  json?: boolean;
}

export interface CacheListCommandResult {
  ok: boolean;
  command: "cache-list";
  rendered: boolean;
  entries: CacheEntry[];
  warnings: string[];
  errors: string[];
}

export class CacheListCommand {
  async run(input: CacheListCommandInput = {}): Promise<CacheListCommandResult> {
    if (!input.namespace) {
      return {
        ok: false,
        command: "cache-list",
        rendered: false,
        entries: [],
        warnings: [],
        errors: ["namespace is required"],
      };
    }

    const entries = listCacheEntries(input.namespace as CacheNamespace, input.tenantId);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, entries }, null, 2));
    } else {
      console.log(`CACHE ENTRIES — ${input.namespace}`);
      console.log("=".repeat(40 + input.namespace.length));
      if (entries.length === 0) {
        console.log("(no entries)");
      } else {
        for (const e of entries) {
          console.log(
            `${e.cacheStatus.padEnd(12)} ${e.cacheKey.padEnd(48)} tenant=${(e.tenantId ?? "-").padEnd(20)} expiresAt=${e.expiresAt}`,
          );
        }
        console.log("");
        console.log(`Total: ${entries.length}`);
      }
    }

    return { ok: true, command: "cache-list", rendered: true, entries, warnings: [], errors: [] };
  }
}
