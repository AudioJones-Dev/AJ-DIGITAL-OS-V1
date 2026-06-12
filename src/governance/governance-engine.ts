/**
 * Governance Engine — Single entry point for L10 governance checks.
 *
 * Runs each governance sub-policy that is relevant to the request, then
 * synthesizes an overall outcome. The engine is read-only: it never
 * mutates input or persists state. Attribution is emitted fire-and-forget.
 */

import { evaluateAgentAction } from "./agent-behavior/agent-behavior-policy.js";
import { evaluateBrandVoice } from "./brand-voice/brand-voice-policy.js";
import { loadClientOverrides } from "./client-rules/client-rule-engine.js";
import { emitGovernanceEvent } from "./governance-attribution.js";
import type {
  GovernanceOutcome,
  GovernanceRequest,
  GovernanceResult,
} from "./governance-types.js";
import { evaluateLegalCompliance } from "./legal/legal-policy.js";
import { evaluateOffer } from "./offer/offer-policy.js";
import { validateWorkflowSteps } from "./sop/sop-policy.js";

function deriveOverall(result: Omit<GovernanceResult, "overall">): GovernanceOutcome {
  if (result.blockedReasons.length > 0) return "block";
  if (result.requiresApproval) return "approval_required";
  if (result.warnings.length > 0) return "warn";
  return "pass";
}

export function evaluateGovernance(request: GovernanceRequest): GovernanceResult {
  const overrides = request.tenantId ? loadClientOverrides(request.tenantId) : null;
  const blockedReasons: string[] = [];
  const warnings: string[] = [];
  let requiresApproval = false;

  const partial: Omit<GovernanceResult, "overall"> = {
    requiresApproval: false,
    blockedReasons,
    warnings,
  };

  if (request.content !== undefined) {
    const brandOpts: Parameters<typeof evaluateBrandVoice>[1] = {};
    if (request.contentCategory) brandOpts.category = request.contentCategory;
    if (overrides) brandOpts.overrides = overrides;
    const brand = evaluateBrandVoice(request.content, brandOpts);
    partial.brandVoice = brand;
    if (!brand.compliant) {
      for (const v of brand.violations) {
        blockedReasons.push(`brand_voice:${v.type}:${v.text}`);
      }
    }
    warnings.push(...brand.warnings);
  }

  if (request.content !== undefined && request.contentCategory) {
    const legal = evaluateLegalCompliance(request.content, request.contentCategory);
    partial.legal = legal;
    if (!legal.compliant) {
      for (const v of legal.violations.filter((x) => x.severity === "block")) {
        blockedReasons.push(`legal:${v.pattern}`);
      }
    }
    for (const v of legal.violations.filter((x) => x.severity === "warn" || x.severity === "flag")) {
      warnings.push(`legal:${v.severity}:${v.pattern}`);
    }
    if (legal.requiresApproval) requiresApproval = true;
    if (legal.requiresReview) warnings.push(`legal:requires_review:${request.contentCategory}`);
  }

  if (request.workflowType && request.workflowSteps) {
    const sop = validateWorkflowSteps(request.workflowType, request.workflowSteps);
    partial.sop = sop;
    if (!sop.valid) {
      for (const e of sop.errors) blockedReasons.push(`sop:${e}`);
    }
  }

  if (request.offer) {
    const offer = evaluateOffer(request.offer);
    partial.offer = offer;
    if (!offer.compliant) {
      for (const v of offer.violations.filter((x) => x.severity === "block")) {
        blockedReasons.push(`offer:${v.field}:${v.reason}`);
      }
    }
    for (const v of offer.violations.filter((x) => x.severity === "warn")) {
      warnings.push(`offer:warn:${v.field}:${v.reason}`);
    }
    if (offer.requiresApproval) requiresApproval = true;
    warnings.push(...offer.warnings.map((w) => `offer:${w}`));
  }

  if (request.agentRole && request.action) {
    const agentOpts: Parameters<typeof evaluateAgentAction>[3] = {};
    if (overrides) agentOpts.overrides = overrides;
    const agent = evaluateAgentAction(
      request.agentRole,
      request.action,
      request.tools ?? [],
      agentOpts,
    );
    partial.agentBehavior = agent;
    if (!agent.allowed) {
      for (const v of agent.violations) {
        blockedReasons.push(`agent_behavior:${v}`);
      }
    }
    if (agent.requiresApproval) requiresApproval = true;
  }

  partial.requiresApproval = requiresApproval;

  const result: GovernanceResult = {
    ...partial,
    overall: deriveOverall(partial),
  };

  emitGovernanceEvent(request, result);

  return result;
}
