/**
 * Cache Augmentation Layer (CAL v1) — shared types.
 *
 * The CAL sits between Control Plane Enforcement and downstream
 * BEL / AEO / Attribution / RAG / LLM providers, allowing AJ Digital OS
 * to reuse safe, tenant-scoped, policy-governed context, plans, scores,
 * reports, and generated outputs before invoking retrieval or generation.
 */

export type CacheNamespace =
  | "context-cache"
  | "plan-cache"
  | "score-cache"
  | "report-cache"
  | "response-cache";

export type CacheDecision = "hit" | "miss" | "stale" | "blocked" | "bypass";

export type CacheRiskLevel = "low" | "medium" | "high";

export type CacheStatus = "active" | "stale" | "invalidated";

export type CacheEnvironment = "production" | "staging" | "development" | "test";

export interface CacheEntry<T = unknown> {
  cacheKey: string;
  tenantId?: string | undefined;
  namespace: CacheNamespace;
  inputHash: string;
  outputHash: string;
  sourceRefs: string[];
  formulaVersion?: string | undefined;
  policyVersion: string;
  capabilityVersion?: string | undefined;
  environment: CacheEnvironment;
  riskLevel: CacheRiskLevel;
  ttlSeconds: number;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  cacheStatus: CacheStatus;
  data: T;
}

export interface CachePolicy {
  /** Require tenantId match. */
  tenantScoped: boolean;
  /** Require environment match. */
  environmentScoped: boolean;
  /** Require policyVersion match. */
  policyVersionScoped: boolean;
  /** Require formulaVersion match (when present). */
  formulaVersionScoped: boolean;
  /** Bypass cache for this risk level (e.g. "high"). */
  bypassRiskLevels: CacheRiskLevel[];
  /** Whether to allow caching when no tenantId is supplied (false in production). */
  allowAnonymousInProduction: boolean;
}

export interface CacheLookupRequest {
  namespace: CacheNamespace;
  cacheKey: string;
  tenantId?: string | undefined;
  environment: CacheEnvironment;
  policyVersion: string;
  formulaVersion?: string | undefined;
  capabilityVersion?: string | undefined;
  riskLevel: CacheRiskLevel;
  approvalGranted?: boolean | undefined;
}

export interface CacheLookupResult<T = unknown> {
  decision: CacheDecision;
  entry?: CacheEntry<T> | undefined;
  reason?: string | undefined;
}

export interface CacheWriteRequest<T = unknown> {
  namespace: CacheNamespace;
  cacheKey: string;
  tenantId?: string | undefined;
  inputHash: string;
  outputHash?: string | undefined;
  sourceRefs?: string[] | undefined;
  formulaVersion?: string | undefined;
  policyVersion: string;
  capabilityVersion?: string | undefined;
  environment: CacheEnvironment;
  riskLevel: CacheRiskLevel;
  ttlSeconds: number;
  createdBy: string;
  data: T;
}

export interface CacheInvalidationRequest {
  namespace: CacheNamespace;
  cacheKey?: string | undefined;
  tenantId?: string | undefined;
  reason: string;
  performedBy: string;
}

export interface CacheStats {
  namespace: CacheNamespace;
  totalEntries: number;
  activeEntries: number;
  staleEntries: number;
  invalidatedEntries: number;
}

/**
 * Default cache policy applied when callers do not supply one.
 * High risk bypasses cache; cross-tenant reads are always blocked at the
 * policy engine level regardless of this struct.
 */
export const DEFAULT_CACHE_POLICY: CachePolicy = {
  tenantScoped: true,
  environmentScoped: true,
  policyVersionScoped: true,
  formulaVersionScoped: true,
  bypassRiskLevels: ["high"],
  allowAnonymousInProduction: false,
};
