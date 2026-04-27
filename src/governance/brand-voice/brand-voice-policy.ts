/**
 * Governance — Brand Voice Policy
 *
 * Read-only scanner over generated text. Returns compliance result without
 * mutating input. Pattern matching is case-insensitive against word
 * boundaries where appropriate.
 */

import { loadPolicy } from "../../core/policy/policy-loader.js";
import type {
  BrandVoiceResult,
  BrandVoiceViolation,
  ClaimStrength,
  ClientOverrides,
} from "../governance-types.js";

const POLICY_FILE = "brand-voice.policy.json";

interface BrandVoicePolicyShape {
  forbiddenPhrases: string[];
  brandNames: string[];
  incorrectBrandNames: string[];
  maxClaimStrength: ClaimStrength;
  requiredDisclaimers: Record<string, string>;
  strongClaimPatterns: string[];
}

function readPolicy(): BrandVoicePolicyShape {
  const doc = loadPolicy(POLICY_FILE);
  const r = doc.rules;
  return {
    forbiddenPhrases: Array.isArray(r["forbiddenPhrases"]) ? (r["forbiddenPhrases"] as string[]) : [],
    brandNames: Array.isArray(r["brandNames"]) ? (r["brandNames"] as string[]) : [],
    incorrectBrandNames: Array.isArray(r["incorrectBrandNames"]) ? (r["incorrectBrandNames"] as string[]) : [],
    maxClaimStrength: (r["maxClaimStrength"] as ClaimStrength | undefined) ?? "qualified",
    requiredDisclaimers: (r["requiredDisclaimers"] as Record<string, string> | undefined) ?? {},
    strongClaimPatterns: Array.isArray(r["strongClaimPatterns"]) ? (r["strongClaimPatterns"] as string[]) : [],
  };
}

export function getBrandVoicePolicy(): BrandVoicePolicyShape {
  return readPolicy();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findForbiddenPhrases(text: string, phrases: string[]): BrandVoiceViolation[] {
  const violations: BrandVoiceViolation[] = [];
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase();
    if (!needle) continue;
    if (lower.includes(needle)) {
      violations.push({
        type: "forbidden_phrase",
        text: phrase,
        suggestion: `Replace "${phrase}" with concrete, specific language`,
      });
    }
  }
  return violations;
}

function findIncorrectBrand(text: string, incorrectNames: string[], allowed: string[]): BrandVoiceViolation[] {
  const violations: BrandVoiceViolation[] = [];
  // Case-sensitive: the point is to flag specific bad casings.
  for (const bad of incorrectNames) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(bad)}([^A-Za-z0-9]|$)`);
    if (re.test(text)) {
      violations.push({
        type: "incorrect_brand_name",
        text: bad,
        suggestion: `Use one of: ${allowed.join(", ")}`,
      });
    }
  }
  return violations;
}

function rankClaimStrength(s: ClaimStrength): number {
  return s === "factual" ? 0 : s === "qualified" ? 1 : 2;
}

function findStrongClaims(text: string, patterns: string[], cap: ClaimStrength): BrandVoiceViolation[] {
  if (rankClaimStrength(cap) >= 2) return [];
  const violations: BrandVoiceViolation[] = [];
  for (const pat of patterns) {
    let re: RegExp;
    try {
      re = new RegExp(pat, "i");
    } catch {
      continue;
    }
    const m = re.exec(text);
    if (m) {
      violations.push({
        type: "claim_too_strong",
        text: m[0],
        suggestion: `Soften to a qualified claim (e.g. "may help", "in many cases")`,
      });
    }
  }
  return violations;
}

function findMissingDisclaimers(
  text: string,
  category: string | undefined,
  required: Record<string, string>,
): BrandVoiceViolation[] {
  if (!category) return [];
  const expected = required[category];
  if (!expected) return [];
  if (text.includes(expected)) return [];
  return [
    {
      type: "missing_disclaimer",
      text: category,
      suggestion: `Append disclaimer: "${expected}"`,
    },
  ];
}

/**
 * Evaluate text against the brand voice policy. Optionally pass a content
 * category (e.g. "financial", "marketing") so category-specific disclaimers
 * are checked, and optional client overrides for additive rules.
 */
export function evaluateBrandVoice(
  text: string,
  options: { category?: string; overrides?: ClientOverrides } = {},
): BrandVoiceResult {
  const policy = readPolicy();
  const overrides = options.overrides;

  const forbiddenPhrases = [
    ...policy.forbiddenPhrases,
    ...(overrides?.additionalForbiddenPhrases ?? []),
  ];
  const requiredDisclaimers = {
    ...policy.requiredDisclaimers,
    ...(overrides?.additionalRequiredDisclaimers ?? {}),
  };
  const cap: ClaimStrength = overrides?.maxClaimStrength
    ? (rankClaimStrength(overrides.maxClaimStrength) <
        rankClaimStrength(policy.maxClaimStrength)
        ? overrides.maxClaimStrength
        : policy.maxClaimStrength)
    : policy.maxClaimStrength;

  const violations: BrandVoiceViolation[] = [
    ...findForbiddenPhrases(text, forbiddenPhrases),
    ...findIncorrectBrand(text, policy.incorrectBrandNames, policy.brandNames),
    ...findStrongClaims(text, policy.strongClaimPatterns, cap),
    ...findMissingDisclaimers(text, options.category, requiredDisclaimers),
  ];

  const warnings: string[] = [];
  if (text.length > 0 && policy.brandNames.length > 0) {
    const mentionsAny = policy.brandNames.some((b) =>
      text.toLowerCase().includes(b.toLowerCase()),
    );
    if (!mentionsAny && /(\b)(our|us|we)(\b)/i.test(text)) {
      warnings.push("Text uses first-person voice without naming the brand explicitly");
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
  };
}
