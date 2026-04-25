/**
 * BEL Plan Cache Integration.
 *
 * Wraps the BEL execution planner with plan-cache lookups keyed by
 * tenantId + goalHash + capabilitySetVersion + policyVersion + environment.
 *
 * Destructive results (shell, browser write actions) are never cached by
 * default — only read-mode plans qualify for safe reuse.
 */

import { createExecutionPlan } from "../bel/bel-execution-planner.js";
import type { BelExecutionPlan, BelTaskRequest } from "../bel/bel-types.js";

import { hashInput, lookupCache, writeCache } from "./cache-store.js";
import { emitCacheAttributionEvent } from "./cache-attribution.js";
import type { CacheEnvironment } from "./cache-types.js";

export const BEL_CAPABILITY_VERSION = "bel-v1";
export const BEL_POLICY_VERSION = "cache-policy-v1";
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour — plans drift fast

export interface CachedPlanRequest {
  request: BelTaskRequest;
  tenantId?: string | undefined;
  environment?: CacheEnvironment;
  capabilityVersion?: string;
  policyVersion?: string;
  ttlSeconds?: number;
  /** When true, callers explicitly opt to skip the cache. */
  bypass?: boolean;
}

export interface CachedPlanResult {
  plan: BelExecutionPlan;
  fromCache: boolean;
  cacheKey: string;
  decision: "hit" | "miss" | "stale" | "blocked" | "bypass";
}

function buildGoalHash(req: BelTaskRequest): string {
  return hashInput({
    task: req.task,
    tool: req.tool ?? null,
    params: req.params ?? null,
  });
}

function buildCacheKey(req: CachedPlanRequest, goalHash: string): string {
  const tenant = req.tenantId ?? "anon";
  const capability = req.capabilityVersion ?? BEL_CAPABILITY_VERSION;
  const env = req.environment ?? "development";
  return `bel:${tenant}:${env}:${capability}:${goalHash}`;
}

/**
 * Plans destructive (shell or browser) tasks are not cached by default.
 * Filesystem read/list operations are safe to reuse.
 */
function isPlanCacheable(plan: BelExecutionPlan): boolean {
  if (plan.requiresApproval) return false;
  return plan.steps.every(
    (s) =>
      s.tool === "filesystem" &&
      (s.operation === "read_file" || s.operation === "list_directory"),
  );
}

export function planExecutionCached(req: CachedPlanRequest): CachedPlanResult {
  const policyVersion = req.policyVersion ?? BEL_POLICY_VERSION;
  const capabilityVersion = req.capabilityVersion ?? BEL_CAPABILITY_VERSION;
  const environment = req.environment ?? "development";
  const goalHash = buildGoalHash(req.request);
  const cacheKey = buildCacheKey(req, goalHash);

  if (req.bypass !== true) {
    const lookup = lookupCache<BelExecutionPlan>({
      namespace: "plan-cache",
      cacheKey,
      ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
      environment,
      policyVersion,
      capabilityVersion,
      riskLevel: "low",
    });

    if (lookup.decision === "hit" && lookup.entry) {
      emitCacheAttributionEvent({
        eventType: "cache_hit",
        namespace: "plan-cache",
        cacheKey,
        ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
        decision: "hit",
      });
      return {
        plan: lookup.entry.data,
        fromCache: true,
        cacheKey,
        decision: "hit",
      };
    }
  }

  const plan = createExecutionPlan(req.request);

  if (isPlanCacheable(plan)) {
    writeCache<BelExecutionPlan>({
      namespace: "plan-cache",
      cacheKey,
      ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
      inputHash: goalHash,
      capabilityVersion,
      policyVersion,
      environment,
      riskLevel: "low",
      ttlSeconds: req.ttlSeconds ?? DEFAULT_TTL_SECONDS,
      createdBy: "bel-planner",
      data: plan,
    });
  }

  emitCacheAttributionEvent({
    eventType: "cache_miss",
    namespace: "plan-cache",
    cacheKey,
    ...(req.tenantId !== undefined ? { tenantId: req.tenantId } : {}),
    decision: "miss",
  });

  return { plan, fromCache: false, cacheKey, decision: "miss" };
}

// ── Cache hooks for BEL runtime ─────────────────────────────────────
// These are intentionally stubs — they expose the integration surface
// without altering existing BEL execution behavior. A future runtime
// can call them around node execution to record observation events.

export function beforeNodeExecute(_plan: BelExecutionPlan, _stepIndex: number): void {
  // Stub — reserved for future per-node cache lookups.
}

export function afterNodeComplete(_plan: BelExecutionPlan, _stepIndex: number): void {
  // Stub — reserved for future per-node cache writes.
}
