/**
 * Governance — CLI command surface.
 */

import { evaluateBrandVoice } from "../governance/brand-voice/brand-voice-policy.js";
import { evaluateLegalCompliance } from "../governance/legal/legal-policy.js";
import { validateWorkflowSteps } from "../governance/sop/sop-policy.js";
import { evaluateOffer } from "../governance/offer/offer-policy.js";
import { evaluateGovernance } from "../governance/governance-engine.js";
import type {
  BrandVoiceResult,
  GovernanceResult,
  LegalComplianceResult,
  OfferGovernanceResult,
  OfferInput,
  SOPValidationResult,
} from "../governance/governance-types.js";

interface BaseInput {
  json?: boolean;
}

interface BaseResult {
  ok: boolean;
  error?: string;
}

function emitJson(input: BaseInput, payload: unknown): void {
  if (input.json) console.log(JSON.stringify(payload, null, 2));
}

// ── governance-brand-check ─────────────────────────────────────────────

export interface GovernanceBrandCheckInput extends BaseInput {
  text: string;
  category?: string;
  tenantId?: string;
}

export interface GovernanceBrandCheckResult extends BaseResult {
  result: BrandVoiceResult;
}

export class GovernanceBrandCheckCommand {
  async run(input: GovernanceBrandCheckInput): Promise<GovernanceBrandCheckResult> {
    if (!input.text) {
      return { ok: false, error: "text is required", result: { compliant: false, violations: [], warnings: [] } };
    }
    const opts: Parameters<typeof evaluateBrandVoice>[1] = {};
    if (input.category) opts.category = input.category;
    const result = evaluateBrandVoice(input.text, opts);
    if (input.json) {
      emitJson(input, { ok: true, result });
    } else {
      console.log(`Brand voice: ${result.compliant ? "compliant" : "violations found"}`);
      for (const v of result.violations) {
        console.log(`  - [${v.type}] ${v.text}${v.suggestion ? ` (${v.suggestion})` : ""}`);
      }
      for (const w of result.warnings) console.log(`  ! ${w}`);
    }
    return { ok: true, result };
  }
}

// ── governance-legal-check ─────────────────────────────────────────────

export interface GovernanceLegalCheckInput extends BaseInput {
  content: string;
  category: string;
}

export interface GovernanceLegalCheckResult extends BaseResult {
  result: LegalComplianceResult;
}

export class GovernanceLegalCheckCommand {
  async run(input: GovernanceLegalCheckInput): Promise<GovernanceLegalCheckResult> {
    if (!input.content || !input.category) {
      return {
        ok: false,
        error: "content and category are required",
        result: {
          compliant: false,
          requiresReview: false,
          requiresApproval: false,
          violations: [],
          requiredDisclaimers: [],
        },
      };
    }
    const result = evaluateLegalCompliance(input.content, input.category);
    if (input.json) {
      emitJson(input, { ok: true, result });
    } else {
      console.log(`Legal: ${result.compliant ? "compliant" : "violations"}`);
      console.log(`  requires review:   ${result.requiresReview}`);
      console.log(`  requires approval: ${result.requiresApproval}`);
      for (const v of result.violations) {
        console.log(`  - [${v.severity}] ${v.pattern} → ${v.match}`);
      }
      for (const d of result.requiredDisclaimers) {
        console.log(`  disclaimer: ${d}`);
      }
    }
    return { ok: true, result };
  }
}

// ── governance-sop-validate ────────────────────────────────────────────

export interface GovernanceSopValidateInput extends BaseInput {
  workflowType: string;
  steps: string[];
}

export interface GovernanceSopValidateResult extends BaseResult {
  result: SOPValidationResult;
}

export class GovernanceSopValidateCommand {
  async run(input: GovernanceSopValidateInput): Promise<GovernanceSopValidateResult> {
    if (!input.workflowType) {
      return {
        ok: false,
        error: "workflowType is required",
        result: { valid: false, missingSteps: [], forbiddenStepsFound: [], errors: ["workflowType is required"] },
      };
    }
    const result = validateWorkflowSteps(input.workflowType, input.steps ?? []);
    if (input.json) {
      emitJson(input, { ok: true, result });
    } else {
      console.log(`SOP ${input.workflowType}: ${result.valid ? "valid" : "invalid"}`);
      if (result.missingSteps.length > 0) console.log(`  missing: ${result.missingSteps.join(", ")}`);
      if (result.forbiddenStepsFound.length > 0)
        console.log(`  forbidden: ${result.forbiddenStepsFound.join(", ")}`);
      for (const e of result.errors) console.log(`  ! ${e}`);
    }
    return { ok: true, result };
  }
}

// ── governance-offer-check ─────────────────────────────────────────────

export interface GovernanceOfferCheckInput extends BaseInput {
  offer: OfferInput;
}

export interface GovernanceOfferCheckResult extends BaseResult {
  result: OfferGovernanceResult;
}

export class GovernanceOfferCheckCommand {
  async run(input: GovernanceOfferCheckInput): Promise<GovernanceOfferCheckResult> {
    if (!input.offer || !input.offer.title || !input.offer.type) {
      return {
        ok: false,
        error: "offer with title and type is required",
        result: { compliant: false, requiresApproval: false, violations: [], warnings: [] },
      };
    }
    const result = evaluateOffer(input.offer);
    if (input.json) {
      emitJson(input, { ok: true, result });
    } else {
      console.log(`Offer: ${result.compliant ? "compliant" : "violations"}`);
      console.log(`  requires approval: ${result.requiresApproval}`);
      for (const v of result.violations) {
        console.log(`  - [${v.severity}] ${v.field}: ${v.reason}`);
      }
      for (const w of result.warnings) console.log(`  ! ${w}`);
    }
    return { ok: true, result };
  }
}

// ── governance-evaluate ────────────────────────────────────────────────

export interface GovernanceEvaluateInput extends BaseInput {
  content?: string;
  contentCategory?: string;
  workflowType?: string;
  workflowSteps?: string[];
  agentRole?: string;
  action?: string;
  tools?: string[];
  offer?: OfferInput;
  tenantId?: string;
}

export interface GovernanceEvaluateResult extends BaseResult {
  result: GovernanceResult;
}

export class GovernanceEvaluateCommand {
  async run(input: GovernanceEvaluateInput): Promise<GovernanceEvaluateResult> {
    const req: Parameters<typeof evaluateGovernance>[0] = {};
    if (input.content !== undefined) req.content = input.content;
    if (input.contentCategory !== undefined) req.contentCategory = input.contentCategory;
    if (input.workflowType !== undefined) req.workflowType = input.workflowType;
    if (input.workflowSteps !== undefined) req.workflowSteps = input.workflowSteps;
    if (input.agentRole !== undefined) req.agentRole = input.agentRole;
    if (input.action !== undefined) req.action = input.action;
    if (input.tools !== undefined) req.tools = input.tools;
    if (input.offer !== undefined) req.offer = input.offer;
    if (input.tenantId !== undefined) req.tenantId = input.tenantId;

    const result = evaluateGovernance(req);
    if (input.json) {
      emitJson(input, { ok: true, result });
    } else {
      console.log(`Governance: ${result.overall}`);
      console.log(`  requires approval: ${result.requiresApproval}`);
      for (const r of result.blockedReasons) console.log(`  blocked: ${r}`);
      for (const w of result.warnings) console.log(`  warn: ${w}`);
    }
    return { ok: true, result };
  }
}
