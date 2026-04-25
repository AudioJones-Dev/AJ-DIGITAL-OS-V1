import { randomUUID } from "node:crypto";

import { classifyAgentAction } from "./action-classifier.js";
import { evaluateApprovalGate, type ApprovalContext } from "./approval-gate.js";
import { logAgentActionAudit } from "./audit-logger.js";
import { evaluatePermissionPolicy } from "./permission-policy.js";
import { defaultApprovalService } from "../approvals/approval-service.js";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { ApprovalType } from "../approvals/approval-types.js";
import type {
  ActionCategory,
  ActionClassification,
  AgentActionRequest,
  EnforcementDecision,
  PermissionLevel,
} from "./permission-levels.js";

export interface EnforcementContext {
  permissionLevel: PermissionLevel;
  approval?: ApprovalContext | undefined;
  approvalId?: string | undefined;
  environment?: "local" | "dev" | "staging" | "production";
  approvalService?: ApprovalService | undefined;
}

export interface EnforcementResult {
  decision: EnforcementDecision;
  category: string;
  risk: "low" | "medium" | "high" | "critical";
  reason: string;
  auditId: string;
  approvalId?: string | undefined;
}

function mapApprovalType(
  request: AgentActionRequest,
  classification: ActionClassification,
): ApprovalType {
  const category: ActionCategory = classification.category;
  if (category === "GIT_PUSH") return "git_push";
  if (category === "REMOTE_CHANGE") return "remote_change";
  if (category === "DEPLOYMENT") return "deployment";
  if (category === "SECRET_MODIFY") return "secret_modify";
  if (category === "DESTRUCTIVE_ADMIN" || category === "COMMAND_RESTRICTED") return "destructive_admin";
  if (category === "CLIENT_DATA_ACCESS") return "client_data_export";
  if (category === "MCP_TOOL_CALL") return "mcp_privileged_tool_call";

  if (category === "BROWSER_ACTION") {
    const signal = `${request.browserAction ?? ""} ${request.target ?? ""}`.toLowerCase();
    if (signal.includes("purchase") || signal.includes("checkout") || signal.includes("buy")) {
      return "browser_purchase";
    }
    return "browser_send";
  }

  return "destructive_admin";
}

async function ensureApprovalRequest(
  request: AgentActionRequest,
  context: EnforcementContext,
  classification: ActionClassification,
  reason: string,
  auditId: string,
): Promise<string | undefined> {
  if (context.approvalId) {
    return context.approvalId;
  }

  const service = context.approvalService ?? defaultApprovalService;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString();

  const created = await service.createApprovalRequest({
    approvalType: mapApprovalType(request, classification),
    requestedByAgentId: request.agentId,
    permissionLevel: context.permissionLevel,
    actionCategory: classification.category,
    risk: classification.risk,
    reason,
    expiresAt,
    target: request.target ?? null,
    command: request.command ?? null,
    clientId: request.clientId ?? null,
    environment: context.environment ?? "local",
    auditId,
  });

  return created.approvalId;
}

function mapDecision(policyDecision: "allowed" | "blocked" | "requires_approval", approvalStatus: string): EnforcementDecision {
  if (policyDecision === "blocked") {
    return "block";
  }

  if (policyDecision === "requires_approval") {
    if (approvalStatus === "approved") {
      return "allow";
    }

    if (approvalStatus === "denied") {
      return "block";
    }

    return "require_approval";
  }

  return "allow";
}

export async function enforceAgentAction(
  request: AgentActionRequest,
  context: EnforcementContext,
): Promise<EnforcementResult> {
  const auditId = randomUUID();

  const classification = classifyAgentAction(request);
  const policy = evaluatePermissionPolicy(context.permissionLevel, classification, request);
  const approval = evaluateApprovalGate(policy.decision === "requires_approval", context.approval);

  const decision = mapDecision(policy.decision, approval.status);

  const reason =
    decision === "allow"
      ? `Allowed: ${policy.reason}`
      : decision === "require_approval"
        ? `Approval required: ${approval.reason}`
        : `Blocked: ${policy.reason}`;

  const approvalId = decision === "require_approval"
    ? await ensureApprovalRequest(request, context, classification, reason, auditId)
    : undefined;

  await logAgentActionAudit(
    request,
    auditId,
    context.permissionLevel,
    classification.category,
    decision,
    approval.status,
    classification.risk,
    reason,
  );

  return {
    decision,
    category: classification.category,
    risk: classification.risk,
    reason,
    auditId,
    ...(approvalId !== undefined ? { approvalId } : {}),
  };
}
