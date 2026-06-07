import {
  buildRetrievedMemoryBundle,
  type BuildRetrievedMemoryBundleResult,
} from "./context-bundle-builder.js";
import { createMemoryRouterDecision } from "./memory-router-decision.js";
import { createMockMemoryRecords } from "./mock-memory-store.js";
import { loadRetrievalPolicy } from "./policy-loader.js";
import type {
  AgentMemoryRequest,
  MemoryRecord,
  MemoryRetrievalPolicy,
  MemoryRouterDecision,
  MemoryType,
  RetrievedMemoryBundle,
} from "./memory-types.js";

export interface RouteMemoryRequestOptions {
  policyName?: string;
  policyDirectory?: string;
  policy?: MemoryRetrievalPolicy;
  records?: MemoryRecord[];
  now?: Date;
}

export interface RouteMemoryRequestResult {
  decision: MemoryRouterDecision;
  bundle: RetrievedMemoryBundle | null;
}

export function routeMemoryRequest(
  request: AgentMemoryRequest,
  options: RouteMemoryRequestOptions = {},
): RouteMemoryRequestResult {
  const policyName = options.policyName ?? request.retrievalPolicyId;
  const policy = options.policy ?? loadRetrievalPolicy(
    policyName,
    options.policyDirectory ? { policyDirectory: options.policyDirectory } : {},
  );
  const records = options.records ?? createMockMemoryRecords();
  const requestedTypes = uniqueMemoryTypes(request.requestedTypes);
  const allowedRequestedTypes = requestedTypes.filter((type) => policy.allowedTypes.includes(type));
  const blockedTypes = requestedTypes.filter((type) => !policy.allowedTypes.includes(type));
  const tenantIsolationPassed = !policy.tenantIsolationRequired || Boolean(request.tenantId?.trim());
  const validationReasons = validateRequest(request, blockedTypes, policy, tenantIsolationPassed);
  const now = options.now ?? new Date();

  if (validationReasons.length > 0) {
    return {
      decision: createMemoryRouterDecision({
        requestId: request.requestId,
        allowed: false,
        policyId: policy.policyId,
        policyName,
        reasons: validationReasons,
        requestedTypes,
        allowedTypes: allowedRequestedTypes,
        blockedTypes,
        tenantIsolationRequired: policy.tenantIsolationRequired,
        tenantIsolationPassed,
        citationRequired: policy.citationsRequired,
        tokenBudgetRequested: policy.maxTotalTokens,
        tokenBudgetApplied: 0,
        recordsConsidered: 0,
        recordsReturned: 0,
        createdAt: now.toISOString(),
      }),
      bundle: null,
    };
  }

  const buildResult = buildRetrievedMemoryBundle({
    request,
    policy,
    records,
    now,
  });

  return {
    decision: createAllowedDecision({
      request,
      policy,
      policyName,
      requestedTypes,
      allowedRequestedTypes,
      blockedTypes,
      tenantIsolationPassed,
      buildResult,
      now,
    }),
    bundle: buildResult.bundle,
  };
}

function validateRequest(
  request: AgentMemoryRequest,
  blockedTypes: MemoryType[],
  policy: MemoryRetrievalPolicy,
  tenantIsolationPassed: boolean,
): string[] {
  const reasons: string[] = [];

  if (!request.agentId?.trim()) {
    reasons.push("agentId is required.");
  }

  if (!request.sessionId?.trim()) {
    reasons.push("sessionId is required for read-only Memory Router v0.");
  }

  if (request.requestedTypes.length === 0) {
    reasons.push("At least one requested memory type is required.");
  }

  if (blockedTypes.length > 0) {
    reasons.push(`Requested memory types are not allowed by policy '${policy.policyId}': ${blockedTypes.join(", ")}.`);
  }

  if (!tenantIsolationPassed) {
    reasons.push(`Policy '${policy.policyId}' requires tenantId for tenant isolation.`);
  }

  return reasons;
}

function createAllowedDecision(input: {
  request: AgentMemoryRequest;
  policy: MemoryRetrievalPolicy;
  policyName: string;
  requestedTypes: MemoryType[];
  allowedRequestedTypes: MemoryType[];
  blockedTypes: MemoryType[];
  tenantIsolationPassed: boolean;
  buildResult: BuildRetrievedMemoryBundleResult;
  now: Date;
}): MemoryRouterDecision {
  const reasons = ["Memory request allowed by read-only policy."];
  const warnings = [...input.buildResult.warnings];

  if (input.buildResult.truncated) {
    warnings.push(`Memory bundle was truncated to stay within ${input.policy.maxTotalTokens} tokens.`);
  }

  return createMemoryRouterDecision({
    requestId: input.request.requestId,
    allowed: true,
    policyId: input.policy.policyId,
    policyName: input.policyName,
    reasons,
    warnings,
    requestedTypes: input.requestedTypes,
    allowedTypes: input.allowedRequestedTypes,
    blockedTypes: input.blockedTypes,
    tenantIsolationRequired: input.policy.tenantIsolationRequired,
    tenantIsolationPassed: input.tenantIsolationPassed,
    citationRequired: input.policy.citationsRequired,
    tokenBudgetRequested: input.policy.maxTotalTokens,
    tokenBudgetApplied: input.buildResult.tokenBudgetApplied,
    recordsConsidered: input.buildResult.recordsConsidered,
    recordsReturned: input.buildResult.recordsReturned,
    createdAt: input.now.toISOString(),
  });
}

function uniqueMemoryTypes(types: MemoryType[]): MemoryType[] {
  return [...new Set(types)];
}
