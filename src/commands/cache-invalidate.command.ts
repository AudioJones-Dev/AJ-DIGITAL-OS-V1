import { invalidateCache } from "../cache/cache-store.js";
import type { CacheNamespace } from "../cache/cache-types.js";

export interface CacheInvalidateCommandInput {
  namespace?: string;
  cacheKey?: string;
  tenantId?: string;
  reason?: string;
  performedBy?: string;
  json?: boolean;
}

export interface CacheInvalidateCommandResult {
  ok: boolean;
  command: "cache-invalidate";
  rendered: boolean;
  invalidated: number;
  warnings: string[];
  errors: string[];
}

export class CacheInvalidateCommand {
  async run(input: CacheInvalidateCommandInput = {}): Promise<CacheInvalidateCommandResult> {
    if (!input.namespace) {
      return {
        ok: false,
        command: "cache-invalidate",
        rendered: false,
        invalidated: 0,
        warnings: [],
        errors: ["namespace is required"],
      };
    }

    const count = invalidateCache({
      namespace: input.namespace as CacheNamespace,
      ...(input.cacheKey !== undefined ? { cacheKey: input.cacheKey } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      reason: input.reason ?? "manual invalidation",
      performedBy: input.performedBy ?? "cli",
    });

    if (input.json) {
      console.log(JSON.stringify({ ok: true, invalidated: count }, null, 2));
    } else {
      console.log(`Invalidated ${count} entr${count === 1 ? "y" : "ies"} in ${input.namespace}.`);
    }

    return {
      ok: true,
      command: "cache-invalidate",
      rendered: true,
      invalidated: count,
      warnings: [],
      errors: [],
    };
  }
}
