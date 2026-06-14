/**
 * G4 — Claims/legal gate for outbound content (L10 wired into the publish path).
 *
 * Reuses the EXISTING governance engine (evaluateGovernance + the legal policy
 * already loaded from runtime/policies/legal-constraints.policy.json) — no new
 * policy is authored here. It blocks outbound content on legal block-severity
 * claim violations (e.g. "guaranteed results") and reports every decision into
 * the SAME enforcement audit ledger that executeWithEnforcement writes
 * (logs/security/agent-action-audit.jsonl + defaultAuditStore).
 *
 * Scope notes:
 * - Blocks on LEGAL claim PATTERNS only (category-independent). Brand-voice /
 *   SOP / offer findings flow through as warnings — they must not silently
 *   block benign content here.
 * - contentCategory is the deliverable/task type, which does NOT match the legal
 *   policy's claim-domain categories (financial_advice, earnings_claim, ...).
 *   The prohibited-PATTERN scan (the dangerous-claim block) fires regardless of
 *   category, but category-driven disclaimer/approval rules are inert through
 *   this caller — a claim-type classifier is a documented follow-up.
 * - Total function: never throws into the caller. A governance-infra failure
 *   (e.g. a missing policy file) fails OPEN but is audited — the gate is
 *   additive defense-in-depth; the publisher still enforces write_file via
 *   executeWithEnforcement.
 */

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { logAgentActionAudit } from "../security/permissions/audit-logger.js";
import type {
  ActionCategory,
  ActionRisk,
  ApprovalStatus,
  EnforcementDecision,
} from "../security/permissions/permission-levels.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

import { evaluateGovernance } from "./governance-engine.js";

const MAX_FILES = 12;
const MAX_BYTES_PER_FILE = 200_000;
const CLAIMS_CHECK_AGENT_ID = "governance-claims-check";
const CLAIMS_CHECK_PERMISSION_LEVEL = 3;
const CLAIMS_CHECK_CATEGORY: ActionCategory = "WRITE";

export interface ClaimsContext {
  /** Identifier recorded as the audit target (deliverableId or runId). */
  id: string;
  clientId?: string | null | undefined;
  /** Passed to the governance engine as contentCategory; defaults to "custom". */
  contentCategory?: string | undefined;
}

export interface ClaimsCheckResult {
  /** True when the content carries a legal block-severity claim violation. */
  blocked: boolean;
  /** True when the legal check flags the content for approval. */
  approvalRequired: boolean;
  /** Block patterns when blocked, otherwise governance warnings. */
  reasons: string[];
  warnings: string[];
  /** False when the governance engine could not run (fail-open). */
  evaluated: boolean;
}

/**
 * Core claims/legal check over arbitrary outbound content. Total — never throws.
 */
export async function evaluateClaims(
  content: string,
  ctx: ClaimsContext,
): Promise<ClaimsCheckResult> {
  try {
    const governance = evaluateGovernance({
      content,
      contentCategory: ctx.contentCategory || "custom",
      ...(ctx.clientId ? { tenantId: ctx.clientId } : {}),
    });

    const legalBlocks = (governance.legal?.violations ?? []).filter((v) => v.severity === "block");
    const blocked = legalBlocks.length > 0;
    const approvalRequired = governance.legal?.requiresApproval ?? false;
    const blockPatterns = legalBlocks.map((v) => `legal:${v.pattern}`);
    const decision: EnforcementDecision = blocked
      ? "block"
      : approvalRequired
        ? "require_approval"
        : "allow";

    await reportToAuditLedger(ctx, decision, approvalRequired, blockPatterns, governance.warnings.length);

    return {
      blocked,
      approvalRequired,
      reasons: blocked ? blockPatterns : governance.warnings,
      warnings: governance.warnings,
      evaluated: true,
    };
  } catch {
    // Governance infra failure (e.g. policy file missing / bad cwd). Fail OPEN
    // but audited — never crash the lifecycle/publish path on a governance blip.
    await reportToAuditLedger(ctx, "allow", false, [], 0, "claims_check_unavailable");
    return {
      blocked: false,
      approvalRequired: false,
      reasons: [],
      warnings: ["claims_check_unavailable"],
      evaluated: false,
    };
  }
}

/**
 * Claims check for a DeliverableRecord — builds text from title + summary +
 * best-effort body files, then delegates to evaluateClaims.
 */
export async function evaluateDeliverableClaims(
  deliverable: DeliverableRecord,
  options: { text?: string } = {},
): Promise<ClaimsCheckResult> {
  const content = options.text ?? (await collectDeliverableText(deliverable));
  return evaluateClaims(content, {
    id: deliverable.deliverableId,
    clientId: deliverable.clientId,
    contentCategory: deliverable.deliverableType,
  });
}

async function collectDeliverableText(deliverable: DeliverableRecord): Promise<string> {
  const parts: string[] = [deliverable.title, deliverable.summary];
  const files = [
    ...new Set([
      ...(deliverable.outputPath ? [deliverable.outputPath] : []),
      ...deliverable.outputFiles,
    ]),
  ].slice(0, MAX_FILES);
  for (const file of files) {
    try {
      const fileContent = await readFile(file, "utf-8");
      parts.push(fileContent.slice(0, MAX_BYTES_PER_FILE));
    } catch {
      // best-effort: unreadable / missing / binary files are skipped
    }
  }
  return parts.join("\n\n");
}

async function reportToAuditLedger(
  ctx: ClaimsContext,
  decision: EnforcementDecision,
  approvalRequired: boolean,
  blockPatterns: string[],
  warningCount: number,
  override?: string,
): Promise<void> {
  const approvalStatus: ApprovalStatus =
    decision === "require_approval" || approvalRequired ? "required" : "not_required";
  const risk: ActionRisk =
    decision === "block" ? "high" : decision === "require_approval" ? "medium" : "low";
  const detail =
    override ??
    (blockPatterns.length > 0
      ? blockPatterns.join(",")
      : warningCount > 0
        ? `warnings=${warningCount}`
        : "clean");
  // Audit reason carries policy patterns + counts only — never raw content.
  const reason = `claims_check:${decision}:${detail}`.slice(0, 500);

  try {
    await logAgentActionAudit(
      {
        agentId: CLAIMS_CHECK_AGENT_ID,
        actionType: "content_claims_check",
        target: ctx.id,
        clientId: ctx.clientId ?? null,
      },
      randomUUID(),
      CLAIMS_CHECK_PERMISSION_LEVEL,
      CLAIMS_CHECK_CATEGORY,
      decision,
      approvalStatus,
      risk,
      reason,
    );
  } catch {
    // audit is best-effort — never block on an audit failure
  }
}
