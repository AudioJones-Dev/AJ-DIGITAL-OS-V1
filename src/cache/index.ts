/**
 * Cache Augmentation Layer (CAL v1) — public surface.
 */

export type {
  CacheNamespace,
  CacheDecision,
  CacheEntry,
  CachePolicy,
  CacheLookupRequest,
  CacheLookupResult,
  CacheWriteRequest,
  CacheInvalidationRequest,
  CacheRiskLevel,
  CacheStatus,
  CacheStats,
  CacheEnvironment,
} from "./cache-types.js";
export { DEFAULT_CACHE_POLICY } from "./cache-types.js";

export { evaluateCachePolicy } from "./cache-policy-engine.js";

export {
  hashInput,
  lookupCache,
  writeCache,
  invalidateCache,
  listCacheEntries,
  getCacheStats,
} from "./cache-store.js";
export type { CacheStore } from "./cache-store.js";

export {
  logCacheAuditEvent,
  getCacheAuditEvents,
} from "./cache-audit-log.js";
export type { CacheAuditEvent, CacheAuditEventType } from "./cache-audit-log.js";

export { emitCacheAttributionEvent } from "./cache-attribution.js";
export type { CacheAttributionEventType, CacheAttributionParams } from "./cache-attribution.js";

export {
  scoreOpportunityCached,
  AEO_FORMULA_VERSION,
  AEO_POLICY_VERSION,
} from "./cache-aeo-integration.js";
export type { CachedScoringRequest, CachedScoringResult } from "./cache-aeo-integration.js";

export {
  planExecutionCached,
  beforeNodeExecute,
  afterNodeComplete,
  BEL_CAPABILITY_VERSION,
  BEL_POLICY_VERSION,
} from "./cache-bel-integration.js";
export type { CachedPlanRequest, CachedPlanResult } from "./cache-bel-integration.js";
