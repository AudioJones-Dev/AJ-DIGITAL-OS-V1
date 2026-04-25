/**
 * Cache Policy Engine — decides whether a cache lookup is a hit, miss,
 * stale, blocked, or bypass.
 *
 * Rules (in order):
 * 1. tenantId matches when tenant scope is required
 * 2. environment matches
 * 3. policyVersion matches
 * 4. formulaVersion matches when applicable
 * 5. cache has not expired
 * 6. riskLevel is allowed (high → bypass unless explicitly approved)
 * 7. production requests require tenantId
 * 8. cross-tenant cache reads are blocked
 */

import type {
  CacheDecision,
  CacheEntry,
  CacheLookupRequest,
  CachePolicy,
} from "./cache-types.js";
import { DEFAULT_CACHE_POLICY } from "./cache-types.js";

export interface CachePolicyDecision {
  decision: CacheDecision;
  reason?: string;
}

function isExpired(entry: CacheEntry, now: Date): boolean {
  return new Date(entry.expiresAt).getTime() <= now.getTime();
}

export function evaluateCachePolicy(
  entry: CacheEntry | undefined,
  request: CacheLookupRequest,
  policy: CachePolicy = DEFAULT_CACHE_POLICY,
  now: Date = new Date(),
): CachePolicyDecision {
  // Production requires tenantId before we even consider cached data.
  if (
    request.environment === "production" &&
    !policy.allowAnonymousInProduction &&
    !request.tenantId
  ) {
    return {
      decision: "blocked",
      reason: "production requests require tenantId",
    };
  }

  // High-risk (or otherwise bypass-listed) requests skip cache unless explicit approval was granted.
  if (policy.bypassRiskLevels.includes(request.riskLevel) && request.approvalGranted !== true) {
    return {
      decision: "bypass",
      reason: `risk level "${request.riskLevel}" bypasses cache`,
    };
  }

  if (!entry) {
    return { decision: "miss" };
  }

  if (entry.cacheStatus === "invalidated") {
    return { decision: "miss", reason: "cache entry invalidated" };
  }

  // Cross-tenant reads are always blocked, regardless of policy flags.
  if (entry.tenantId !== undefined && request.tenantId !== undefined && entry.tenantId !== request.tenantId) {
    return {
      decision: "blocked",
      reason: "cross-tenant cache read blocked",
    };
  }

  if (policy.tenantScoped && entry.tenantId !== request.tenantId) {
    return {
      decision: "blocked",
      reason: "tenantId mismatch",
    };
  }

  if (policy.environmentScoped && entry.environment !== request.environment) {
    return {
      decision: "blocked",
      reason: "environment mismatch",
    };
  }

  if (policy.policyVersionScoped && entry.policyVersion !== request.policyVersion) {
    return {
      decision: "blocked",
      reason: "policyVersion mismatch",
    };
  }

  if (
    policy.formulaVersionScoped &&
    request.formulaVersion !== undefined &&
    entry.formulaVersion !== request.formulaVersion
  ) {
    return {
      decision: "blocked",
      reason: "formulaVersion mismatch",
    };
  }

  if (
    request.capabilityVersion !== undefined &&
    entry.capabilityVersion !== undefined &&
    entry.capabilityVersion !== request.capabilityVersion
  ) {
    return {
      decision: "blocked",
      reason: "capabilityVersion mismatch",
    };
  }

  if (entry.cacheStatus === "stale" || isExpired(entry, now)) {
    return { decision: "stale", reason: "cache entry expired" };
  }

  return { decision: "hit" };
}
