/**
 * Governance — Client Rule Override Engine
 *
 * Loads per-tenant override files from `runtime/policies/client-overrides/`
 * and merges them into the base policy view. Overrides are additive
 * (stricter only) — a client cannot loosen a base restriction.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { policiesDir } from "../../core/policy/policy-loader.js";
import type { ClaimStrength, ClientOverrides } from "../governance-types.js";

function rankClaimStrength(s: ClaimStrength): number {
  return s === "factual" ? 0 : s === "qualified" ? 1 : 2;
}

function clientOverrideFile(tenantId: string): string {
  return join(policiesDir(), "client-overrides", `${tenantId}.policy.json`);
}

export function loadClientOverrides(tenantId: string): ClientOverrides | null {
  const file = clientOverrideFile(tenantId);
  if (!existsSync(file)) return null;
  let parsed: { rules?: Record<string, unknown> };
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8")) as { rules?: Record<string, unknown> };
  } catch {
    return null;
  }
  const rules = parsed.rules ?? {};
  const additionalForbiddenPhrases = Array.isArray(rules["additionalForbiddenPhrases"])
    ? (rules["additionalForbiddenPhrases"] as string[])
    : [];
  const additionalRequiredDisclaimers =
    (rules["additionalRequiredDisclaimers"] as Record<string, string> | undefined) ?? {};
  const maxClaimStrengthRaw = rules["maxClaimStrength"];
  const approvalOverrides =
    (rules["approvalOverrides"] as Record<string, "always_required" | "never_required"> | undefined) ?? {};

  const overrides: ClientOverrides = {
    tenantId,
    additionalForbiddenPhrases,
    additionalRequiredDisclaimers,
    approvalOverrides,
  };
  if (
    maxClaimStrengthRaw === "factual" ||
    maxClaimStrengthRaw === "qualified" ||
    maxClaimStrengthRaw === "strong"
  ) {
    overrides.maxClaimStrength = maxClaimStrengthRaw;
  }
  return overrides;
}

/**
 * Merge a base policy object with client overrides. Generic over policy
 * shape — only known additive fields are merged. The function is
 * deliberately conservative: if a base value is stricter, it wins.
 */
export function mergeWithClientOverrides<T extends Record<string, unknown>>(
  basePolicy: T,
  overrides: ClientOverrides,
  policyType: string,
): T {
  if (policyType === "brand-voice") {
    const baseForbidden = Array.isArray(basePolicy["forbiddenPhrases"])
      ? (basePolicy["forbiddenPhrases"] as string[])
      : [];
    const baseDisclaimers =
      (basePolicy["requiredDisclaimers"] as Record<string, string> | undefined) ?? {};
    const baseStrength = (basePolicy["maxClaimStrength"] as ClaimStrength | undefined) ?? "qualified";
    const merged: Record<string, unknown> = {
      ...basePolicy,
      forbiddenPhrases: Array.from(
        new Set([...baseForbidden, ...overrides.additionalForbiddenPhrases]),
      ),
      requiredDisclaimers: {
        ...baseDisclaimers,
        ...overrides.additionalRequiredDisclaimers,
      },
      maxClaimStrength:
        overrides.maxClaimStrength &&
        rankClaimStrength(overrides.maxClaimStrength) < rankClaimStrength(baseStrength)
          ? overrides.maxClaimStrength
          : baseStrength,
    };
    return merged as T;
  }

  if (policyType === "agent-behavior") {
    return {
      ...basePolicy,
      approvalOverrides: overrides.approvalOverrides,
    } as T;
  }

  return basePolicy;
}
