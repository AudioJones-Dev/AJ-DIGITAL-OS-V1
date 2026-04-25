/**
 * AEO Score Cache Integration.
 *
 * Wraps the existing scoreOpportunity formula with score-cache lookups
 * keyed by tenantId + keyword + market + formulaVersion + inputHash.
 */

import {
  scoreOpportunity,
  type OpportunityScore,
  type OpportunitySignals,
} from "../intelligence/opportunity-scorer.js";

import { hashInput, lookupCache, writeCache } from "./cache-store.js";
import { emitCacheAttributionEvent } from "./cache-attribution.js";
import type { CacheEnvironment } from "./cache-types.js";

export const AEO_FORMULA_VERSION = "bible-v1";
export const AEO_POLICY_VERSION = "cache-policy-v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface CachedScoringRequest {
  keyword: string;
  signals: OpportunitySignals;
  market?: string;
  tenantId?: string | undefined;
  environment?: CacheEnvironment;
  policyVersion?: string;
  formulaVersion?: string;
  ttlSeconds?: number;
  /** When true, callers explicitly opt to skip the cache. */
  bypass?: boolean;
}

export interface CachedScoringResult {
  score: OpportunityScore;
  fromCache: boolean;
  cacheKey: string;
  decision: "hit" | "miss" | "stale" | "blocked" | "bypass";
}

function buildCacheKey(req: CachedScoringRequest, inputHash: string): string {
  const tenant = req.tenantId ?? "anon";
  const market = req.market ?? "global";
  const formulaVersion = req.formulaVersion ?? AEO_FORMULA_VERSION;
  return `aeo:${tenant}:${market}:${formulaVersion}:${inputHash}`;
}

/**
 * Score an opportunity using the AEO formula, reusing a cached score when
 * tenant + formula + input hash all match.
 */
export function scoreOpportunityCached(req: CachedScoringRequest): CachedScoringResult {
  const formulaVersion = req.formulaVersion ?? AEO_FORMULA_VERSION;
  const policyVersion = req.policyVersion ?? AEO_POLICY_VERSION;
  const environment = req.environment ?? "development";
  const inputHash = hashInput({ keyword: req.keyword, signals: req.signals, market: req.market });
  const cacheKey = buildCacheKey(req, inputHash);

  if (req.bypass !== true) {
    const lookup = lookupCache<OpportunityScore>({
      namespace: "score-cache",
      cacheKey,
      ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
      environment,
      policyVersion,
      formulaVersion,
      riskLevel: "low",
    });

    if (lookup.decision === "hit" && lookup.entry) {
      emitCacheAttributionEvent({
        eventType: "cache_hit",
        namespace: "score-cache",
        cacheKey,
        ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
        decision: "hit",
      });
      return {
        score: lookup.entry.data,
        fromCache: true,
        cacheKey,
        decision: "hit",
      };
    }
  }

  const score = scoreOpportunity(req.keyword, req.signals);

  // Only persist on production-eligible writes; otherwise still cache for reuse.
  writeCache<OpportunityScore>({
    namespace: "score-cache",
    cacheKey,
    ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
    inputHash,
    formulaVersion,
    policyVersion,
    environment,
    riskLevel: "low",
    ttlSeconds: req.ttlSeconds ?? DEFAULT_TTL_SECONDS,
    createdBy: "aeo-scoring",
    data: score,
  });

  emitCacheAttributionEvent({
    eventType: "cache_miss",
    namespace: "score-cache",
    cacheKey,
    ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
    decision: "miss",
  });

  return { score, fromCache: false, cacheKey, decision: "miss" };
}
