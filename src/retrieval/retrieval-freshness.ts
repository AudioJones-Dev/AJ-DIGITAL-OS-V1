/**
 * G3 — Memory integrity: freshness/decay scoring.
 *
 * Pure function. Exponential half-life decay weights recall by document age so
 * stale context is demoted (not dropped). Floored so old-but-relevant context
 * never fully vanishes. Unknown/undatable age is treated as fresh — we never
 * penalize what we cannot date.
 */

import { DEFAULT_FRESHNESS_POLICY } from "./retrieval-policy.js";
import type { FreshnessInfo, FreshnessPolicy } from "./retrieval-types.js";

const MS_PER_DAY = 86_400_000;

export function computeFreshness(
  updatedAt: string | undefined,
  nowMs: number,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): FreshnessInfo {
  if (!updatedAt) return { ageDays: 0, decayFactor: 1, stale: false };
  const updatedMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedMs)) return { ageDays: 0, decayFactor: 1, stale: false };

  const ageDays = Math.max(0, (nowMs - updatedMs) / MS_PER_DAY);
  const raw = Math.pow(0.5, ageDays / policy.halfLifeDays);
  const decayFactor = Math.max(policy.decayFloor, Number(raw.toFixed(6)));
  const stale = ageDays > policy.staleAfterDays;

  return { ageDays: Number(ageDays.toFixed(4)), decayFactor, stale };
}
