import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  __resetCacheStore,
  hashInput,
  invalidateCache,
  listCacheEntries,
  lookupCache,
  writeCache,
} from "../../src/cache/cache-store.js";
import { evaluateCachePolicy } from "../../src/cache/cache-policy-engine.js";
import { getCacheAuditEvents, logCacheAuditEvent } from "../../src/cache/cache-audit-log.js";
import { emitCacheAttributionEvent } from "../../src/cache/cache-attribution.js";
import { scoreOpportunityCached } from "../../src/cache/cache-aeo-integration.js";
import { planExecutionCached } from "../../src/cache/cache-bel-integration.js";
import type {
  CacheEntry,
  CacheLookupRequest,
  CacheLookupResult,
  CacheNamespace,
  CacheRiskLevel,
} from "../../src/cache/cache-types.js";

const CACHE_DIR = join(process.cwd(), "runtime", "cache");
const AUDIT_PATH = join(CACHE_DIR, "cache-audit.jsonl");
const POLICY_VERSION = "cache-policy-v1";

const NAMESPACES: CacheNamespace[] = [
  "context-cache",
  "plan-cache",
  "score-cache",
  "report-cache",
  "response-cache",
];

function clearAudit(): void {
  try {
    if (existsSync(AUDIT_PATH)) rmSync(AUDIT_PATH);
  } catch {
    // ignore
  }
}

beforeEach(() => {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  __resetCacheStore();
  clearAudit();
});

afterEach(() => {
  __resetCacheStore();
  clearAudit();
});

describe("cache-store — lookup decisions", () => {
  it("returns miss when no entry exists", () => {
    const result = lookupCache({
      namespace: "context-cache",
      cacheKey: "missing-key",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(result.decision).toBe("miss");
    expect(result.entry).toBeUndefined();
  });

  it("returns hit when an active, matching entry exists", () => {
    writeCache({
      namespace: "context-cache",
      cacheKey: "ctx-1",
      tenantId: "tenant-a",
      inputHash: hashInput("ctx-1"),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { hello: "world" },
    });

    const result = lookupCache<{ hello: string }>({
      namespace: "context-cache",
      cacheKey: "ctx-1",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(result.decision).toBe("hit");
    expect(result.entry?.data).toEqual({ hello: "world" });
  });

  it("returns stale when an entry has expired", () => {
    writeCache({
      namespace: "context-cache",
      cacheKey: "ctx-stale",
      tenantId: "tenant-a",
      inputHash: hashInput("stale"),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 1,
      createdBy: "test",
      data: { stale: true },
    });

    // advance time well past TTL
    vi.setSystemTime(new Date(Date.now() + 5_000));

    const result = lookupCache({
      namespace: "context-cache",
      cacheKey: "ctx-stale",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(result.decision).toBe("stale");
  });

  it("blocks tenant mismatch", () => {
    writeCache({
      namespace: "context-cache",
      cacheKey: "ctx-tenant",
      tenantId: "tenant-a",
      inputHash: hashInput("tenant"),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { secret: "tenant-a-only" },
    });

    const result = lookupCache({
      namespace: "context-cache",
      cacheKey: "ctx-tenant",
      tenantId: "tenant-b",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(result.decision).toBe("blocked");
    expect(result.reason).toContain("cross-tenant");
  });

  it("blocks production lookups missing tenantId", () => {
    const req: CacheLookupRequest = {
      namespace: "context-cache",
      cacheKey: "ctx-prod",
      environment: "production",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    };
    const result = lookupCache(req);
    expect(result.decision).toBe("blocked");
    expect(result.reason).toContain("tenantId");
  });

  it("blocks policyVersion mismatch", () => {
    writeCache({
      namespace: "context-cache",
      cacheKey: "ctx-policy",
      tenantId: "tenant-a",
      inputHash: hashInput("policy"),
      policyVersion: "cache-policy-v0",
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { v: 0 },
    });

    const result = lookupCache({
      namespace: "context-cache",
      cacheKey: "ctx-policy",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(result.decision).toBe("blocked");
    expect(result.reason).toContain("policyVersion");
  });

  it("blocks formulaVersion mismatch", () => {
    writeCache({
      namespace: "score-cache",
      cacheKey: "score-formula",
      tenantId: "tenant-a",
      inputHash: hashInput("score"),
      formulaVersion: "v1",
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { score: 42 },
    });

    const result = lookupCache({
      namespace: "score-cache",
      cacheKey: "score-formula",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      formulaVersion: "v2",
      riskLevel: "low",
    });
    expect(result.decision).toBe("blocked");
    expect(result.reason).toContain("formulaVersion");
  });

  it("bypasses cache for high-risk requests without approval", () => {
    writeCache({
      namespace: "response-cache",
      cacheKey: "rc-high",
      tenantId: "tenant-a",
      inputHash: hashInput("hi"),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { ok: true },
    });

    const req: CacheLookupRequest = {
      namespace: "response-cache",
      cacheKey: "rc-high",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "high" as CacheRiskLevel,
    };
    const result = lookupCache(req);
    expect(result.decision).toBe("bypass");
  });
});

describe("cache-audit-log", () => {
  it("writes a cache audit event for a lookup", () => {
    lookupCache({
      namespace: "context-cache",
      cacheKey: "audit-test",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });

    const events = getCacheAuditEvents({ namespace: "context-cache", limit: 10 });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]!.eventType).toBe("cache_miss");
  });

  it("logCacheAuditEvent persists an event and returns it", () => {
    const ev = logCacheAuditEvent({
      eventType: "cache_hit",
      namespace: "score-cache",
      cacheKey: "k",
      decision: "hit",
    });
    expect(ev.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(ev.eventType).toBe("cache_hit");
  });
});

describe("cache-attribution — fire-and-forget", () => {
  it("does not throw on cache_hit", () => {
    expect(() =>
      emitCacheAttributionEvent({
        eventType: "cache_hit",
        namespace: "context-cache",
        cacheKey: "fa-1",
        tenantId: "tenant-a",
      }),
    ).not.toThrow();
  });

  it("does not throw on cache_miss", () => {
    expect(() =>
      emitCacheAttributionEvent({
        eventType: "cache_miss",
        namespace: "context-cache",
        cacheKey: "fa-2",
        tenantId: "tenant-a",
      }),
    ).not.toThrow();
  });
});

describe("AEO integration — score-cache reuse", () => {
  it("reuses a cached score on the second call", () => {
    const params = {
      keyword: "digital marketing agency",
      signals: { searchVolume: 80, difficulty: 40, intent: 70, localRelevance: 60, aeoReadiness: 50 },
      tenantId: "tenant-a",
      market: "us",
    };

    const first = scoreOpportunityCached(params);
    expect(first.fromCache).toBe(false);
    expect(first.score.score).toBe(67);

    const second = scoreOpportunityCached(params);
    expect(second.fromCache).toBe(true);
    expect(second.score.scoreId).toBe(first.score.scoreId);
  });
});

describe("BEL integration — plan-cache reuse for safe plans", () => {
  it("reuses a cached plan on the second call (read-only filesystem)", () => {
    const req = {
      request: {
        taskId: "task-1",
        agentId: "agent-1",
        task: "read project README",
        tool: "filesystem" as const,
        params: { filePath: "README.md" },
      },
      tenantId: "tenant-a",
    };

    const first = planExecutionCached(req);
    expect(first.fromCache).toBe(false);

    const second = planExecutionCached(req);
    expect(second.fromCache).toBe(true);
    expect(second.plan.planId).toBe(first.plan.planId);
  });
});

describe("cache invalidation", () => {
  it("marks an entry invalidated", () => {
    writeCache({
      namespace: "report-cache",
      cacheKey: "rep-1",
      tenantId: "tenant-a",
      inputHash: hashInput("rep"),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { ok: true },
    });

    const count = invalidateCache({
      namespace: "report-cache",
      cacheKey: "rep-1",
      reason: "test invalidation",
      performedBy: "test",
    });
    expect(count).toBe(1);

    const entries = listCacheEntries("report-cache");
    expect(entries.find((e) => e.cacheKey === "rep-1")?.cacheStatus).toBe("invalidated");

    const lookup = lookupCache({
      namespace: "report-cache",
      cacheKey: "rep-1",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(lookup.decision).toBe("miss");
  });
});

describe("dashboard client cache types — type compile check", () => {
  it("imports dashboard cache types without error", async () => {
    const mod = await import("../../dashboard/lib/types.ts");
    // Spot check exported runtime — these are types but the module should resolve.
    expect(mod).toBeDefined();
  });
});

describe("evaluateCachePolicy — direct decisions", () => {
  it("returns miss with no entry", () => {
    const decision = evaluateCachePolicy(undefined, {
      namespace: "context-cache",
      cacheKey: "k",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    expect(decision.decision).toBe("miss");
  });
});

// Sanity: pre-populate one entry to ensure listing works for every namespace.
describe("cache-store — listing per namespace", () => {
  it.each(NAMESPACES)("lists entries for %s", (ns) => {
    writeCache({
      namespace: ns,
      cacheKey: `k-${ns}`,
      tenantId: "tenant-a",
      inputHash: hashInput(ns),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { ns },
    });
    const entries = listCacheEntries(ns);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.namespace).toBe(ns);
  });
});

// Confirm the lookup result type carries the expected shape.
describe("CacheLookupResult typing", () => {
  it("has decision and optional entry/reason", () => {
    const r: CacheLookupResult<{ a: number }> = { decision: "miss" };
    expect(r.decision).toBe("miss");
  });
});

// Quick compile/ref check that CacheEntry generics flow.
describe("CacheEntry generic typing", () => {
  it("preserves data type on entry", () => {
    writeCache<{ value: number }>({
      namespace: "score-cache",
      cacheKey: "typed",
      tenantId: "tenant-a",
      inputHash: hashInput("typed"),
      policyVersion: POLICY_VERSION,
      environment: "development",
      riskLevel: "low",
      ttlSeconds: 3600,
      createdBy: "test",
      data: { value: 42 },
    });
    const lookup = lookupCache<{ value: number }>({
      namespace: "score-cache",
      cacheKey: "typed",
      tenantId: "tenant-a",
      environment: "development",
      policyVersion: POLICY_VERSION,
      riskLevel: "low",
    });
    const entry: CacheEntry<{ value: number }> | undefined = lookup.entry;
    expect(entry?.data.value).toBe(42);
  });
});
