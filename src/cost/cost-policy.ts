/**
 * G2 — Cost-ceiling policy loader.
 *
 * Loads runtime/policies/cost-ceiling.policy.json via the shared policy loader.
 * Falls back to safe defaults if the file is missing/malformed (never throws).
 */

import { loadPolicy } from "../core/policy/policy-loader.js";

import type { CostCeilingPolicy } from "./cost-types.js";

const POLICY_FILE = "cost-ceiling.policy.json";

export const DEFAULT_COST_CEILING_POLICY: CostCeilingPolicy = {
  perRunUsd: { hard: 5.0, softRatio: 0.8 },
  perTenantUsd: { hard: 50.0, softRatio: 0.8 },
};

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function loadCostCeilingPolicy(): CostCeilingPolicy {
  try {
    const doc = loadPolicy(POLICY_FILE);
    const rules = doc.rules as Record<string, unknown>;
    const perRun = (rules["perRunUsd"] ?? {}) as Record<string, unknown>;
    const perTenant = (rules["perTenantUsd"] ?? {}) as Record<string, unknown>;
    return {
      perRunUsd: {
        hard: num(perRun["hard"], DEFAULT_COST_CEILING_POLICY.perRunUsd.hard),
        softRatio: num(perRun["softRatio"], DEFAULT_COST_CEILING_POLICY.perRunUsd.softRatio),
      },
      perTenantUsd: {
        hard: num(perTenant["hard"], DEFAULT_COST_CEILING_POLICY.perTenantUsd.hard),
        softRatio: num(perTenant["softRatio"], DEFAULT_COST_CEILING_POLICY.perTenantUsd.softRatio),
      },
    };
  } catch {
    return DEFAULT_COST_CEILING_POLICY;
  }
}
