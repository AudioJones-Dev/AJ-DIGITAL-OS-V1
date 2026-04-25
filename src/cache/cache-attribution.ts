/**
 * Cache Attribution — emits MAP attribution events for every cache decision.
 *
 * Fire-and-forget: must NEVER throw. Wraps emitEvent and swallows any error.
 */

import { emitEvent } from "../attribution/attribution-tracker.js";
import type { AttributionChannel } from "../attribution/attribution-types.js";
import type { CacheDecision, CacheNamespace } from "./cache-types.js";

export type CacheAttributionEventType =
  | "cache_hit"
  | "cache_miss"
  | "cache_saved"
  | "cache_invalidated"
  | "cache_blocked";

export interface CacheAttributionParams {
  eventType: CacheAttributionEventType;
  namespace: CacheNamespace;
  cacheKey: string;
  tenantId?: string | undefined;
  agentId?: string | undefined;
  decision?: CacheDecision | undefined;
  reason?: string | undefined;
}

const CACHE_AGENT_DEFAULT = "cache-augmentation-layer";
const CACHE_CHANNEL: AttributionChannel = "unknown";

/**
 * Emit a MAP attribution event for a cache event. Fire-and-forget — never throws.
 */
export function emitCacheAttributionEvent(params: CacheAttributionParams): void {
  // Schedule asynchronously so we don't block the cache caller and so we
  // can swallow any rejection without leaking it.
  Promise.resolve()
    .then(() =>
      emitEvent({
        eventType: "run_completed",
        runId: `cache:${params.namespace}:${params.cacheKey}`,
        agentId: params.agentId ?? CACHE_AGENT_DEFAULT,
        channel: CACHE_CHANNEL,
        ...(params.tenantId !== undefined ? { clientId: params.tenantId } : {}),
        contentType: "cache",
        contentId: params.cacheKey,
        metadata: {
          cacheEventType: params.eventType,
          namespace: params.namespace,
          ...(params.decision !== undefined ? { decision: params.decision } : {}),
          ...(params.reason !== undefined ? { reason: params.reason } : {}),
        },
      }),
    )
    .catch(() => {
      // Fire-and-forget — never propagate.
    });
}
