import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evaluateBrandVoice } from "../../src/governance/brand-voice/brand-voice-policy.js";
import { evaluateLegalCompliance } from "../../src/governance/legal/legal-policy.js";
import { validateWorkflowSteps } from "../../src/governance/sop/sop-policy.js";
import { evaluateOffer } from "../../src/governance/offer/offer-policy.js";
import { evaluateAgentAction } from "../../src/governance/agent-behavior/agent-behavior-policy.js";
import { loadClientOverrides } from "../../src/governance/client-rules/client-rule-engine.js";
import { evaluateGovernance } from "../../src/governance/governance-engine.js";
import { clearPolicyCache } from "../../src/core/policy/policy-loader.js";
import { emitGovernanceEvent } from "../../src/governance/governance-attribution.js";
import type { OfferInput } from "../../src/governance/governance-types.js";

const ORIGINAL_CWD = process.cwd();
let sandboxDir: string;

const POLICY_FILES = [
  "action-risk.policy.json",
  "tenant-boundary.policy.json",
  "environment.policy.json",
  "approval-gates.policy.json",
  "cache-access.policy.json",
  "retrieval-access.policy.json",
  "brand-voice.policy.json",
  "legal-constraints.policy.json",
  "sop-constraints.policy.json",
  "offer-governance.policy.json",
  "agent-behavior.policy.json",
];

function copyPoliciesInto(targetRuntime: string): void {
  const policiesDir = join(targetRuntime, "policies");
  mkdirSync(policiesDir, { recursive: true });
  const sourceDir = join(ORIGINAL_CWD, "runtime", "policies");
  for (const name of POLICY_FILES) {
    const src = join(sourceDir, name);
    if (existsSync(src)) {
      copyFileSync(src, join(policiesDir, name));
    }
  }
  const overridesDir = join(policiesDir, "client-overrides");
  mkdirSync(overridesDir, { recursive: true });
  const srcOverrides = join(sourceDir, "client-overrides");
  if (existsSync(srcOverrides)) {
    for (const f of readdirSync(srcOverrides)) {
      copyFileSync(join(srcOverrides, f), join(overridesDir, f));
    }
  }
}

beforeEach(() => {
  sandboxDir = mkdtempSync(join(tmpdir(), "governance-"));
  const runtimeDir = join(sandboxDir, "runtime");
  mkdirSync(runtimeDir, { recursive: true });
  copyPoliciesInto(runtimeDir);
  vi.spyOn(process, "cwd").mockReturnValue(sandboxDir);
  clearPolicyCache();
});

describe("Governance — Brand Voice", () => {
  it("1. brand voice detects forbidden phrase", () => {
    const r = evaluateBrandVoice("Our revolutionary platform is a game changer.");
    expect(r.compliant).toBe(false);
    const types = r.violations.map((v) => v.type);
    expect(types).toContain("forbidden_phrase");
    expect(r.violations.some((v) => v.text.toLowerCase() === "revolutionary")).toBe(true);
    expect(r.violations.some((v) => v.text.toLowerCase() === "game changer")).toBe(true);
  });

  it("2. brand voice detects incorrect brand name", () => {
    const r = evaluateBrandVoice("Try AJD today for clean automation.");
    expect(r.compliant).toBe(false);
    expect(r.violations.some((v) => v.type === "incorrect_brand_name")).toBe(true);
  });

  it("3. brand voice passes compliant text", () => {
    const r = evaluateBrandVoice(
      "AJ Digital OS provides governed automation. Results may vary in different environments.",
    );
    expect(r.compliant).toBe(true);
    expect(r.violations).toHaveLength(0);
  });
});

describe("Governance — Legal Compliance", () => {
  it("4. legal compliance blocks earnings guarantee", () => {
    const r = evaluateLegalCompliance(
      "We promise guaranteed results and 100% success for everyone.",
      "earnings_claim",
    );
    expect(r.compliant).toBe(false);
    expect(r.requiresApproval).toBe(true);
    expect(r.violations.some((v) => v.severity === "block")).toBe(true);
  });

  it("5. legal compliance flags content requiring review", () => {
    const r = evaluateLegalCompliance(
      "Information about our consulting services and pricing tiers.",
      "financial_advice",
    );
    expect(r.requiresReview).toBe(true);
    expect(r.requiredDisclaimers.length).toBeGreaterThan(0);
  });

  it("6. legal compliance passes clean content", () => {
    const r = evaluateLegalCompliance(
      "We offer marketing strategy consulting tailored to your business goals.",
      "marketing",
    );
    expect(r.compliant).toBe(true);
    expect(r.violations.filter((v) => v.severity === "block")).toHaveLength(0);
  });
});

describe("Governance — SOP Validation", () => {
  it("7. SOP validation catches missing required step", () => {
    const r = validateWorkflowSteps("content_creation", ["brief_intake", "draft", "publish"]);
    expect(r.valid).toBe(false);
    expect(r.missingSteps).toContain("research");
    expect(r.missingSteps).toContain("review");
  });

  it("8. SOP validation catches forbidden step", () => {
    const r = validateWorkflowSteps("content_creation", [
      "brief_intake",
      "research",
      "draft",
      "review",
      "skip_review",
      "publish",
    ]);
    expect(r.valid).toBe(false);
    expect(r.forbiddenStepsFound).toContain("skip_review");
  });

  it("9. SOP validation passes valid steps", () => {
    const r = validateWorkflowSteps("content_creation", [
      "brief_intake",
      "research",
      "draft",
      "review",
      "publish",
    ]);
    expect(r.valid).toBe(true);
    expect(r.missingSteps).toHaveLength(0);
    expect(r.forbiddenStepsFound).toHaveLength(0);
  });
});

describe("Governance — Offer Governance", () => {
  const baseOffer: OfferInput = {
    title: "Strategy Audit",
    type: "audit",
    price: 1500,
    currency: "USD",
    deliverables: ["audit report", "recommendations"],
    timeline: "2 weeks",
  };

  it("10. offer governance blocks price below floor", () => {
    const r = evaluateOffer({ ...baseOffer, price: 100 });
    expect(r.compliant).toBe(false);
    expect(r.violations.some((v) => v.field === "price" && v.severity === "block")).toBe(true);
  });

  it("11. offer governance flags discount requiring approval", () => {
    const r = evaluateOffer({ ...baseOffer, discountPercent: 25 });
    expect(r.requiresApproval).toBe(true);
    expect(r.violations.some((v) => v.field === "discountPercent" && v.severity === "approval")).toBe(true);
  });

  it("12. offer governance passes compliant offer", () => {
    const r = evaluateOffer(baseOffer);
    expect(r.compliant).toBe(true);
    expect(r.violations.filter((v) => v.severity === "block")).toHaveLength(0);
  });
});

describe("Governance — Agent Behavior", () => {
  it("13. agent behavior blocks forbidden tool", () => {
    const r = evaluateAgentAction("researcher", "search", ["read", "deploy"]);
    expect(r.allowed).toBe(false);
    expect(r.forbiddenTools).toContain("deploy");
  });

  it("14. agent behavior requires approval for restricted action", () => {
    const r = evaluateAgentAction("publisher", "publish", ["read", "publish"]);
    expect(r.allowed).toBe(true);
    expect(r.requiresApproval).toBe(true);
  });
});

describe("Governance — Client Overrides", () => {
  it("15. client override adds additional forbidden phrases", () => {
    const overrides = loadClientOverrides("example-tenant");
    expect(overrides).not.toBeNull();
    expect(overrides!.additionalForbiddenPhrases).toContain("disrupt");

    const baseline = evaluateBrandVoice("We disrupt the market with our service.");
    expect(baseline.compliant).toBe(true);

    const withOverride = evaluateBrandVoice("We disrupt the market with our service.", {
      overrides: overrides!,
    });
    expect(withOverride.compliant).toBe(false);
    expect(withOverride.violations.some((v) => v.text === "disrupt")).toBe(true);
  });
});

describe("Governance — Engine", () => {
  it("16. governance engine returns overall block on any violation", () => {
    const r = evaluateGovernance({
      content: "Our revolutionary platform guarantees 100% results.",
      contentCategory: "marketing",
    });
    expect(r.overall).toBe("block");
    expect(r.blockedReasons.length).toBeGreaterThan(0);
  });

  it("17. governance engine returns approval_required when any check flags it", () => {
    const r = evaluateGovernance({
      offer: {
        title: "Implementation Plan",
        type: "implementation",
        price: 5000,
        currency: "USD",
        deliverables: ["plan", "execution"],
        timeline: "3 months",
        discountPercent: 25,
      },
    });
    expect(r.overall).toBe("approval_required");
    expect(r.requiresApproval).toBe(true);
    expect(r.blockedReasons).toHaveLength(0);
  });

  it("18. governance engine passes clean request", () => {
    const r = evaluateGovernance({
      content:
        "AJ Digital OS provides governed automation for accountable teams. Individual results may vary.",
      contentCategory: "marketing",
      workflowType: "content_creation",
      workflowSteps: ["brief_intake", "research", "draft", "review", "publish"],
      agentRole: "researcher",
      action: "search",
      tools: ["read", "search"],
    });
    expect(r.overall).toBe("pass");
    expect(r.blockedReasons).toHaveLength(0);
    expect(r.requiresApproval).toBe(false);
  });

  it("19. attribution emits after governance check (fire-and-forget, no throw)", () => {
    expect(() =>
      emitGovernanceEvent(
        { content: "test" },
        {
          overall: "pass",
          requiresApproval: false,
          blockedReasons: [],
          warnings: [],
        },
      ),
    ).not.toThrow();

    expect(() =>
      evaluateGovernance({
        content: "AJ Digital OS provides governed automation.",
        contentCategory: "marketing",
      }),
    ).not.toThrow();
  });
});
