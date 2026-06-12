/**
 * Governance Layer — shared types.
 *
 * Single home for all governance result/violation interfaces so callers do
 * not need to import from individual sub-modules unless they want to.
 */

export type ClaimStrength = "factual" | "qualified" | "strong";

export type GovernanceOutcome = "pass" | "warn" | "block" | "approval_required";

// ── Brand voice ─────────────────────────────────────────────────────────

export type BrandVoiceViolationType =
  | "forbidden_phrase"
  | "missing_disclaimer"
  | "claim_too_strong"
  | "incorrect_brand_name";

export interface BrandVoiceViolation {
  type: BrandVoiceViolationType;
  text: string;
  suggestion?: string;
}

export interface BrandVoiceResult {
  compliant: boolean;
  violations: BrandVoiceViolation[];
  warnings: string[];
}

// ── Legal ──────────────────────────────────────────────────────────────

export type LegalSeverity = "block" | "warn" | "flag";

export interface LegalViolation {
  pattern: string;
  match: string;
  severity: LegalSeverity;
}

export interface LegalComplianceResult {
  compliant: boolean;
  requiresReview: boolean;
  requiresApproval: boolean;
  violations: LegalViolation[];
  requiredDisclaimers: string[];
}

// ── SOP ────────────────────────────────────────────────────────────────

export interface SOPDefinition {
  workflowType: string;
  requiredSteps: string[];
  forbiddenSteps: string[];
  requiredApprovals: string[];
  maxRetries: number;
  timeoutSeconds: number;
}

export interface SOPValidationResult {
  valid: boolean;
  missingSteps: string[];
  forbiddenStepsFound: string[];
  errors: string[];
}

// ── Offer ──────────────────────────────────────────────────────────────

export interface OfferInput {
  title: string;
  type: string;
  price: number;
  currency: string;
  deliverables: string[];
  guarantees?: string[];
  discountPercent?: number;
  timeline?: string;
}

export interface OfferViolation {
  field: string;
  reason: string;
  severity: "block" | "warn" | "approval";
}

export interface OfferGovernanceResult {
  compliant: boolean;
  requiresApproval: boolean;
  violations: OfferViolation[];
  warnings: string[];
}

// ── Agent behavior ─────────────────────────────────────────────────────

export interface AgentRolePolicy {
  role: string;
  allowedTools: string[];
  forbiddenActions: string[];
  memoryScope: string;
  maxConcurrentRuns: number;
  requiredApprovals: string[];
}

export interface AgentBehaviorResult {
  allowed: boolean;
  requiresApproval: boolean;
  forbiddenTools: string[];
  violations: string[];
}

// ── Client overrides ───────────────────────────────────────────────────

export interface ClientOverrides {
  tenantId: string;
  additionalForbiddenPhrases: string[];
  additionalRequiredDisclaimers: Record<string, string>;
  maxClaimStrength?: ClaimStrength;
  approvalOverrides: Record<string, "always_required" | "never_required">;
}

// ── Governance engine ──────────────────────────────────────────────────

export interface GovernanceRequest {
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

export interface GovernanceResult {
  overall: GovernanceOutcome;
  brandVoice?: BrandVoiceResult;
  legal?: LegalComplianceResult;
  sop?: SOPValidationResult;
  offer?: OfferGovernanceResult;
  agentBehavior?: AgentBehaviorResult;
  requiresApproval: boolean;
  blockedReasons: string[];
  warnings: string[];
}
