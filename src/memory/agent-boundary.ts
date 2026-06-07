import {
  type AgentBoundaryRequestInput,
  type AgentClientType,
  type AgentContextBundle,
  type BoundedAgentContextResult,
  DEFAULT_AGENT_RETRIEVAL_POLICY,
} from "./agent-context-contracts.js";
import { normalizeBoundaryMemoryRequest } from "./agent-request-adapters.js";
import { routeMemoryRequest } from "./memory-router.js";
import { loadRetrievalPolicy } from "./policy-loader.js";
import type {
  AgentMemoryRequest,
  MemoryRecord,
  MemoryRetrievalPolicy,
  RetrievedMemoryBundle,
  RetrievedMemoryItem,
} from "./memory-types.js";

export interface RequestBoundedAgentContextOptions {
  records?: MemoryRecord[];
  now?: Date;
  policyDirectory?: string;
  policyNameByAgent?: Partial<Record<AgentClientType, string>>;
}

export function requestBoundedAgentContext(
  input: AgentBoundaryRequestInput,
  options: RequestBoundedAgentContextOptions = {},
): BoundedAgentContextResult {
  const policyName = options.policyNameByAgent?.[input.agentClient]
    ?? DEFAULT_AGENT_RETRIEVAL_POLICY[input.agentClient];
  const normalizedRequest = normalizeBoundaryMemoryRequest(input, policyName);
  const basePolicy = loadRetrievalPolicy(
    policyName,
    options.policyDirectory ? { policyDirectory: options.policyDirectory } : {},
  );
  const effectivePolicy = applyRequestPolicyFloor(basePolicy, normalizedRequest);
  const routeResult = routeMemoryRequest(normalizedRequest, {
    policyName,
    policy: effectivePolicy,
    ...(options.records ? { records: options.records } : {}),
    ...(options.now ? { now: options.now } : {}),
  });

  return {
    normalizedRequest,
    decision: routeResult.decision,
    bundle: sanitizeBundle(routeResult.bundle),
  };
}

function applyRequestPolicyFloor(
  policy: MemoryRetrievalPolicy,
  request: AgentMemoryRequest,
): MemoryRetrievalPolicy {
  const requestedBudget = request.maxTokens;
  const maxTotalTokens = requestedBudget === undefined
    ? policy.maxTotalTokens
    : Math.min(policy.maxTotalTokens, Math.max(0, requestedBudget));

  return {
    ...policy,
    maxTotalTokens,
    citationsRequired: request.requireCitations ? true : policy.citationsRequired,
  };
}

function sanitizeBundle(bundle: RetrievedMemoryBundle | null): AgentContextBundle | null {
  if (!bundle) {
    return null;
  }

  return {
    requestId: bundle.requestId,
    policyId: bundle.policyId,
    ...(bundle.tenantId ? { tenantId: bundle.tenantId } : {}),
    ...(bundle.projectId ? { projectId: bundle.projectId } : {}),
    items: bundle.items.map(sanitizeItem),
    totalTokenEstimate: bundle.totalTokenEstimate,
    truncated: bundle.truncated,
    warnings: [...bundle.warnings],
    createdAt: bundle.createdAt,
  };
}

function sanitizeItem(item: RetrievedMemoryItem): AgentContextBundle["items"][number] {
  const record = item.record;

  return {
    record: {
      id: record.id,
      type: record.type,
      status: record.status,
      scope: record.scope,
      title: record.title,
      body: record.body,
      ...(record.content ? { content: record.content } : {}),
      ...(record.tenantId ? { tenantId: record.tenantId } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      source: {
        kind: record.source.kind,
        ...(record.source.title ? { title: record.source.title } : {}),
        ...(record.source.capturedAt ? { capturedAt: record.source.capturedAt } : {}),
        ...(record.source.uri ? { uri: record.source.uri } : {}),
      },
      confidence: record.confidence,
      tags: [...record.tags],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    relevanceScore: item.relevanceScore,
    tokenEstimate: item.tokenEstimate,
    citation: item.citation,
    reasonSelected: item.reasonSelected,
  };
}
