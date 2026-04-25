/**
 * File-backed cache store for CAL v1.
 *
 * Persists each namespace into runtime/cache/<namespace>.json. Interfaces
 * are kept small so a Redis/Neon-backed CacheStore can drop in later
 * without changing callers.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import type {
  CacheEntry,
  CacheInvalidationRequest,
  CacheLookupRequest,
  CacheLookupResult,
  CacheNamespace,
  CachePolicy,
  CacheStats,
  CacheWriteRequest,
} from "./cache-types.js";
import { evaluateCachePolicy } from "./cache-policy-engine.js";
import { logCacheAuditEvent } from "./cache-audit-log.js";

const CACHE_DIR = join(process.cwd(), "runtime", "cache");

const FILE_FOR_NAMESPACE: Record<CacheNamespace, string> = {
  "context-cache": "context-cache.json",
  "plan-cache": "plan-cache.json",
  "score-cache": "score-cache.json",
  "report-cache": "report-cache.json",
  "response-cache": "response-cache.json",
};

export interface CacheStore {
  lookupCache<T = unknown>(req: CacheLookupRequest, policy?: CachePolicy): CacheLookupResult<T>;
  writeCache<T = unknown>(req: CacheWriteRequest<T>): CacheEntry<T>;
  invalidateCache(req: CacheInvalidationRequest): number;
  listCacheEntries(namespace: CacheNamespace, tenantId?: string): CacheEntry[];
  getCacheStats(namespace?: CacheNamespace): CacheStats[];
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function pathFor(namespace: CacheNamespace): string {
  return join(CACHE_DIR, FILE_FOR_NAMESPACE[namespace]);
}

function loadEntries(namespace: CacheNamespace): CacheEntry[] {
  ensureCacheDir();
  const path = pathFor(namespace);
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as CacheEntry[];
  } catch {
    return [];
  }
}

function saveEntries(namespace: CacheNamespace, entries: CacheEntry[]): void {
  ensureCacheDir();
  writeFileSync(pathFor(namespace), JSON.stringify(entries, null, 2), "utf-8");
}

export function hashInput(input: unknown): string {
  const stable = typeof input === "string" ? input : JSON.stringify(input);
  return createHash("sha256").update(stable).digest("hex").slice(0, 32);
}

export function lookupCache<T = unknown>(
  req: CacheLookupRequest,
  policy?: CachePolicy,
): CacheLookupResult<T> {
  const all = loadEntries(req.namespace);
  const candidate = all.find(
    (e) => e.cacheKey === req.cacheKey && e.namespace === req.namespace,
  ) as CacheEntry<T> | undefined;

  const decision = evaluateCachePolicy(candidate, req, policy);

  // Side effect: audit + return
  const auditPayload: Parameters<typeof logCacheAuditEvent>[0] = {
    eventType:
      decision.decision === "hit"
        ? "cache_hit"
        : decision.decision === "miss"
          ? "cache_miss"
          : decision.decision === "stale"
            ? "cache_stale"
            : decision.decision === "bypass"
              ? "cache_bypass_high_risk"
              : decision.reason === "cross-tenant cache read blocked"
                ? "cache_blocked_cross_tenant"
                : "cache_blocked_policy_mismatch",
    namespace: req.namespace,
    cacheKey: req.cacheKey,
    decision: decision.decision,
    ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
    ...(decision.reason !== undefined ? { reason: decision.reason } : {}),
  };
  try {
    logCacheAuditEvent(auditPayload);
  } catch {
    // never throw from a cache lookup
  }

  if (decision.decision === "hit" && candidate) {
    return { decision: "hit", entry: candidate };
  }

  if (decision.decision === "stale" && candidate) {
    return {
      decision: "stale",
      entry: candidate,
      ...(decision.reason !== undefined ? { reason: decision.reason } : {}),
    };
  }

  return {
    decision: decision.decision,
    ...(decision.reason !== undefined ? { reason: decision.reason } : {}),
  };
}

export function writeCache<T = unknown>(req: CacheWriteRequest<T>): CacheEntry<T> {
  const now = new Date();
  const expires = new Date(now.getTime() + req.ttlSeconds * 1000);

  const outputHash = req.outputHash ?? hashInput(req.data);
  const entry: CacheEntry<T> = {
    cacheKey: req.cacheKey,
    namespace: req.namespace,
    inputHash: req.inputHash,
    outputHash,
    sourceRefs: req.sourceRefs ?? [],
    policyVersion: req.policyVersion,
    environment: req.environment,
    riskLevel: req.riskLevel,
    ttlSeconds: req.ttlSeconds,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    createdBy: req.createdBy,
    cacheStatus: "active",
    data: req.data,
    ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
    ...(req.formulaVersion !== undefined ? { formulaVersion: req.formulaVersion } : {}),
    ...(req.capabilityVersion !== undefined ? { capabilityVersion: req.capabilityVersion } : {}),
  };

  const all = loadEntries(req.namespace);
  const idx = all.findIndex((e) => e.cacheKey === entry.cacheKey);
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  saveEntries(req.namespace, all);

  try {
    logCacheAuditEvent({
      eventType: "cache_write",
      namespace: req.namespace,
      cacheKey: req.cacheKey,
      decision: "miss",
      ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
      reason: "cache write",
    });
  } catch {
    // never throw
  }

  return entry;
}

export function invalidateCache(req: CacheInvalidationRequest): number {
  const all = loadEntries(req.namespace);
  let count = 0;
  const updated = all.map((e) => {
    const matchesKey = req.cacheKey === undefined || e.cacheKey === req.cacheKey;
    const matchesTenant = req.tenantId === undefined || e.tenantId === req.tenantId;
    if (matchesKey && matchesTenant && e.cacheStatus !== "invalidated") {
      count++;
      return { ...e, cacheStatus: "invalidated" as const };
    }
    return e;
  });
  saveEntries(req.namespace, updated);

  try {
    logCacheAuditEvent({
      eventType: "cache_invalidated",
      namespace: req.namespace,
      decision: "miss",
      reason: req.reason,
      ...(req.cacheKey !== undefined ? { cacheKey: req.cacheKey } : {}),
      ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
      performedBy: req.performedBy,
    });
  } catch {
    // never throw
  }

  return count;
}

export function listCacheEntries(
  namespace: CacheNamespace,
  tenantId?: string,
): CacheEntry[] {
  const all = loadEntries(namespace);
  if (tenantId === undefined) return all;
  return all.filter((e) => e.tenantId === tenantId);
}

export function getCacheStats(namespace?: CacheNamespace): CacheStats[] {
  const namespaces: CacheNamespace[] = namespace
    ? [namespace]
    : (Object.keys(FILE_FOR_NAMESPACE) as CacheNamespace[]);

  return namespaces.map((ns) => {
    const all = loadEntries(ns);
    return {
      namespace: ns,
      totalEntries: all.length,
      activeEntries: all.filter((e) => e.cacheStatus === "active").length,
      staleEntries: all.filter((e) => e.cacheStatus === "stale").length,
      invalidatedEntries: all.filter((e) => e.cacheStatus === "invalidated").length,
    };
  });
}

/**
 * Utility used by tests to clear the file-backed store between cases.
 * NOT exported to the package surface — only for internal/test use.
 */
export function __resetCacheStore(): void {
  for (const ns of Object.keys(FILE_FOR_NAMESPACE) as CacheNamespace[]) {
    saveEntries(ns, []);
  }
}
