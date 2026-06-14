/**
 * G2 — Cost meter: record real model spend + evaluate the cumulative ceiling.
 *
 * recordModelSpend captures a real provider `usage` payload, computes USD via
 * the EXISTING token-governance cost math (recordTokenUsage), persists it to the
 * cost ledger, increments a global metric, and emits a "model_spend" event into
 * the system ledger. checkCostCeiling evaluates accumulated per-run/per-tenant
 * spend against the cost-ceiling policy (soft-warn then hard-stop).
 *
 * Both functions are total — they never throw into the caller (a metering or
 * ceiling failure must never break a model call; the ceiling fails OPEN).
 */

import { randomUUID } from "node:crypto";

import { appendSystemEvent } from "../core/events/event-ledger.js";
import type { EventEnvironment } from "../core/events/event-types.js";
import { incrementMetric } from "../core/observability/metrics-store.js";

import { loadCostCeilingPolicy } from "./cost-policy.js";
import { appendCostEvent, summarizeByRun, summarizeByTenant } from "./cost-store.js";
import type { CostCeilingVerdict, CostDecision, CostEvent, ModelUsage } from "./cost-types.js";

// Blended USD per 1K tokens by model (v1 estimate). Falls back to DEFAULT_RATE.
const RATE_PER_1K: Record<string, number> = {
  "gpt-4o-mini": 0.0006,
  "gpt-4o": 0.005,
  sonar: 0.001,
};
const DEFAULT_RATE_PER_1K = 0.01;

function rateFor(model: string): number {
  return RATE_PER_1K[model] ?? DEFAULT_RATE_PER_1K;
}

export interface RecordModelSpendInput {
  provider: string;
  model: string;
  usage: ModelUsage;
  runId?: string | undefined;
  tenantId?: string | undefined;
  environment?: EventEnvironment | undefined;
}

export function recordModelSpend(input: RecordModelSpendInput): CostEvent {
  // Cost off the provider's authoritative total when present (captures
  // reasoning/cached tokens that prompt+completion alone would miss — the exact
  // DN42 under-billing risk). USD = rate-per-1k x total tokens / 1000.
  const totalTokens =
    input.usage.totalTokens > 0
      ? input.usage.totalTokens
      : input.usage.promptTokens + input.usage.completionTokens;
  const costUsd = Number(((totalTokens / 1000) * rateFor(input.model)).toFixed(6));

  const event: CostEvent = {
    eventId: randomUUID(),
    ts: new Date().toISOString(),
    source: "model",
    provider: input.provider,
    model: input.model,
    ...(input.runId !== undefined ? { runId: input.runId } : {}),
    ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    promptTokens: input.usage.promptTokens,
    completionTokens: input.usage.completionTokens,
    totalTokens,
    costUsd,
  };

  try {
    appendCostEvent(event);
  } catch {
    // The ledger is the enforcement source of truth — a dropped write silently
    // under-counts spend. Signal it so degraded enforcement is observable.
    try {
      incrementMetric("cost_ledger_write_errors");
    } catch {
      /* ignore */
    }
  }
  try {
    incrementMetric("cost_usd_total", event.costUsd);
  } catch {
    /* best-effort */
  }
  try {
    appendSystemEvent({
      eventType: "model_spend",
      category: "tool",
      ...(input.runId !== undefined ? { runId: input.runId } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      environment: input.environment ?? "local",
      payload: {
        provider: input.provider,
        model: input.model,
        costUsd: event.costUsd,
        totalTokens: event.totalTokens,
      },
    });
  } catch {
    /* best-effort */
  }

  return event;
}

export interface CheckCostCeilingInput {
  runId?: string | undefined;
  tenantId?: string | undefined;
}

/**
 * Evaluate cumulative spend against the cost-ceiling policy. A no-op (allow)
 * when neither runId nor tenantId is supplied — spend cannot be scoped without a
 * key, so unscoped callers are never gated. Fails OPEN on any error.
 *
 * Semantics: the check is pre-dispatch and spend is metered post-success, so a
 * breach blocks the NEXT scoped call — a "stop after breach" guard, not a
 * per-call hard cap (a single call may overshoot the ceiling once).
 */
export function checkCostCeiling(input: CheckCostCeilingInput): CostCeilingVerdict {
  try {
    const policy = loadCostCeilingPolicy();
    const reasons: string[] = [];
    const warnings: string[] = [];
    let decision: CostDecision = "allow";
    let scope: "run" | "tenant" | undefined;
    let spentUsd = 0;

    if (input.runId !== undefined) {
      const spent = summarizeByRun(input.runId).totalUsd;
      const { hard, softRatio } = policy.perRunUsd;
      if (spent >= hard) {
        decision = "block";
        scope = "run";
        spentUsd = spent;
        reasons.push(`per-run spend $${spent.toFixed(4)} >= ceiling $${hard.toFixed(2)}`);
      } else if (spent >= hard * softRatio) {
        decision = "warn";
        scope = "run";
        spentUsd = spent;
        warnings.push(`per-run spend $${spent.toFixed(4)} >= soft $${(hard * softRatio).toFixed(2)}`);
      }
    }

    if (decision !== "block" && input.tenantId !== undefined) {
      const spent = summarizeByTenant(input.tenantId).totalUsd;
      const { hard, softRatio } = policy.perTenantUsd;
      if (spent >= hard) {
        decision = "block";
        scope = "tenant";
        spentUsd = spent;
        reasons.push(`per-tenant spend $${spent.toFixed(4)} >= ceiling $${hard.toFixed(2)}`);
      } else if (spent >= hard * softRatio && decision === "allow") {
        decision = "warn";
        scope = "tenant";
        spentUsd = spent;
        warnings.push(`per-tenant spend $${spent.toFixed(4)} >= soft $${(hard * softRatio).toFixed(2)}`);
      }
    }

    return {
      allowed: decision !== "block",
      decision,
      ...(scope !== undefined ? { scope } : {}),
      spentUsd,
      reasons,
      warnings,
    };
  } catch {
    // Never block a model call on a metering failure.
    return { allowed: true, decision: "allow", spentUsd: 0, reasons: [], warnings: [] };
  }
}
