Set-Location 'C:\dev\AJ-DIGITAL-OS'

$cacheTypes = @"


// ── Cache Augmentation Layer (CAL v1) ──────────────────────────────
export type CacheNamespace =
  | "context-cache"
  | "plan-cache"
  | "score-cache"
  | "report-cache"
  | "response-cache";

export type CacheDecision = "hit" | "miss" | "stale" | "blocked" | "bypass";

export type CacheRiskLevel = "low" | "medium" | "high";

export type CacheStatus = "active" | "stale" | "invalidated";

export interface CacheEntryMeta {
  cacheKey: string;
  namespace: CacheNamespace;
  tenantId?: string;
  inputHash: string;
  outputHash: string;
  sourceRefs: string[];
  formulaVersion?: string;
  policyVersion: string;
  capabilityVersion?: string;
  environment: string;
  riskLevel: CacheRiskLevel;
  ttlSeconds: number;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  cacheStatus: CacheStatus;
}

export interface CacheLookupResponse {
  ok: boolean;
  decision: CacheDecision;
  entry?: CacheEntryMeta & { data: unknown };
  reason?: string;
}

export interface CacheAuditEvent {
  eventId: string;
  timestamp: string;
  eventType:
    | "cache_hit"
    | "cache_miss"
    | "cache_stale"
    | "cache_invalidated"
    | "cache_write"
    | "cache_blocked_cross_tenant"
    | "cache_blocked_policy_mismatch"
    | "cache_bypass_high_risk";
  namespace: CacheNamespace;
  cacheKey?: string;
  tenantId?: string;
  decision: CacheDecision;
  reason?: string;
  performedBy?: string;
}
"@

Add-Content 'dashboard/lib/types.ts' $cacheTypes
Write-Host "Appended cache types to dashboard/lib/types.ts"
