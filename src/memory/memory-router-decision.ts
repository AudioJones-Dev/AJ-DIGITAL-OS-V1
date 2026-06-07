import { randomUUID } from "node:crypto";

import type { MemoryApprovalStatus, MemoryRouterDecision, MemoryType } from "./memory-types.js";

export interface CreateMemoryRouterDecisionInput {
  requestId: string;
  allowed: boolean;
  policyId: string;
  policyName: string;
  reasons: string[];
  warnings?: string[];
  requestedTypes: MemoryType[];
  allowedTypes: MemoryType[];
  blockedTypes: MemoryType[];
  tenantIsolationRequired: boolean;
  tenantIsolationPassed: boolean;
  citationRequired: boolean;
  tokenBudgetRequested: number;
  tokenBudgetApplied: number;
  recordsConsidered: number;
  recordsReturned: number;
  createdAt?: string;
}

export function createMemoryRouterDecision(input: CreateMemoryRouterDecisionInput): MemoryRouterDecision {
  const reason = input.reasons.length > 0 ? input.reasons.join("; ") : input.allowed ? "Memory request allowed." : "Memory request denied.";
  const approvalStatus: MemoryApprovalStatus = input.allowed ? "approved" : "rejected";

  return {
    decisionId: randomUUID(),
    requestId: input.requestId,
    approved: input.allowed,
    allowed: input.allowed,
    action: input.allowed ? "retrieve" : "deny",
    reason,
    reasons: input.reasons,
    policyId: input.policyId,
    policyName: input.policyName,
    requestedTypes: input.requestedTypes,
    allowedTypes: input.allowedTypes,
    deniedTypes: input.blockedTypes,
    blockedTypes: input.blockedTypes,
    requiresHumanApproval: false,
    approvalStatus,
    tenantIsolationRequired: input.tenantIsolationRequired,
    tenantIsolationPassed: input.tenantIsolationPassed,
    citationRequired: input.citationRequired,
    tokenBudgetRequested: input.tokenBudgetRequested,
    tokenBudgetApplied: input.tokenBudgetApplied,
    recordsConsidered: input.recordsConsidered,
    recordsReturned: input.recordsReturned,
    warnings: input.warnings ?? [],
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
