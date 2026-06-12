/**
 * Governance — Legal Constraints Policy
 *
 * Read-only check that scans content for prohibited claim patterns,
 * computes required disclaimers, and flags review/approval requirements
 * based on content category.
 */

import { loadPolicy } from "../../core/policy/policy-loader.js";
import type {
  LegalComplianceResult,
  LegalSeverity,
  LegalViolation,
} from "../governance-types.js";

const POLICY_FILE = "legal-constraints.policy.json";

interface ProhibitedPattern {
  pattern: string;
  severity: LegalSeverity;
}

interface LegalPolicyShape {
  restrictedCategories: string[];
  approvalRequiredCategories: string[];
  prohibitedPatterns: ProhibitedPattern[];
  requiredDisclaimers: Record<string, string>;
}

function readPolicy(): LegalPolicyShape {
  const doc = loadPolicy(POLICY_FILE);
  const r = doc.rules;
  const rawPatterns = Array.isArray(r["prohibitedPatterns"])
    ? (r["prohibitedPatterns"] as Array<Record<string, unknown>>)
    : [];
  const prohibited: ProhibitedPattern[] = rawPatterns
    .map((p) => ({
      pattern: String(p["pattern"] ?? ""),
      severity: ((p["severity"] as LegalSeverity | undefined) ?? "warn") as LegalSeverity,
    }))
    .filter((p) => p.pattern.length > 0);

  return {
    restrictedCategories: Array.isArray(r["restrictedCategories"])
      ? (r["restrictedCategories"] as string[])
      : [],
    approvalRequiredCategories: Array.isArray(r["approvalRequiredCategories"])
      ? (r["approvalRequiredCategories"] as string[])
      : [],
    prohibitedPatterns: prohibited,
    requiredDisclaimers: (r["requiredDisclaimers"] as Record<string, string> | undefined) ?? {},
  };
}

export function getLegalPolicy(): LegalPolicyShape {
  return readPolicy();
}

/**
 * Evaluate content for legal compliance. Scans for prohibited patterns
 * and resolves disclaimers + approval flags by content category.
 */
export function evaluateLegalCompliance(
  content: string,
  category: string,
): LegalComplianceResult {
  const policy = readPolicy();
  const violations: LegalViolation[] = [];

  for (const { pattern, severity } of policy.prohibitedPatterns) {
    let re: RegExp;
    try {
      re = new RegExp(pattern, "i");
    } catch {
      continue;
    }
    const m = re.exec(content);
    if (m) {
      violations.push({ pattern, match: m[0], severity });
    }
  }

  const requiresReview = policy.restrictedCategories.includes(category);
  const requiresApproval =
    policy.approvalRequiredCategories.includes(category) ||
    violations.some((v) => v.severity === "block");

  const requiredDisclaimers: string[] = [];
  const disclaimer = policy.requiredDisclaimers[category];
  if (disclaimer) requiredDisclaimers.push(disclaimer);

  const blocking = violations.some((v) => v.severity === "block");
  const compliant = !blocking && violations.every((v) => v.severity !== "block");

  return {
    compliant,
    requiresReview,
    requiresApproval,
    violations,
    requiredDisclaimers,
  };
}
