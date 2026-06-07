import type {
  AgentMemoryRequest,
  MemoryConfidence,
  MemoryRecord,
  MemoryRetrievalPolicy,
  MemoryType,
  RetrievedMemoryBundle,
  RetrievedMemoryItem,
} from "./memory-types.js";

export interface BuildRetrievedMemoryBundleInput {
  request: AgentMemoryRequest;
  policy: MemoryRetrievalPolicy;
  records: MemoryRecord[];
  now?: Date;
}

export interface BuildRetrievedMemoryBundleResult {
  bundle: RetrievedMemoryBundle;
  recordsConsidered: number;
  recordsReturned: number;
  tokenBudgetApplied: number;
  truncated: boolean;
  warnings: string[];
}

const CONFIDENCE_RANK: Record<MemoryConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return Math.ceil(text.length / 4);
}

export function buildRetrievedMemoryBundle(input: BuildRetrievedMemoryBundleInput): BuildRetrievedMemoryBundleResult {
  const now = input.now ?? new Date();
  const warnings: string[] = [];
  const requestedTypes = new Set(input.request.requestedTypes);
  const allowedTypes = new Set(input.policy.allowedTypes);
  const selectedTypes = new Set(input.request.requestedTypes.filter((type) => allowedTypes.has(type)));

  const eligibleRecords = input.records
    .filter((record) => selectedTypes.has(record.type))
    .filter((record) => isRecordReadableForTenant(record, input.request, input.policy))
    .filter((record) => isRecordReadableForProject(record, input.request))
    .filter((record) => isRecordReadableForAgent(record, input.request))
    .filter((record) => isRecordReadableForSession(record, input.request))
    .filter((record) => isRecordActive(record, now, warnings))
    .filter((record) => meetsConfidence(record.confidence, input.policy.minimumConfidence))
    .filter((record) => isFreshEnough(record, input.policy, now, warnings))
    .filter((record) => hasRequiredCitation(record, input.policy, warnings))
    .sort((left, right) => compareRecords(left, right, input.policy, input.request.query));

  const selectedItems: RetrievedMemoryItem[] = [];
  let tokenBudgetApplied = 0;
  let truncated = false;
  const tokensByType = new Map<MemoryType, number>();

  for (const record of eligibleRecords) {
    if (!requestedTypes.has(record.type)) {
      continue;
    }

    const text = getRecordContent(record);
    const tokenEstimate = estimateTokens(text);
    const remainingTotal = input.policy.maxTotalTokens - tokenBudgetApplied;
    const currentTypeTokens = tokensByType.get(record.type) ?? 0;
    const maxTokensForType = input.policy.maxTokensPerMemoryType[record.type] ?? input.policy.maxTotalTokens;
    const remainingType = maxTokensForType - currentTypeTokens;

    if (tokenEstimate > remainingTotal || tokenEstimate > remainingType) {
      truncated = true;
      warnings.push(`Record '${record.id}' was skipped because it exceeded the remaining token budget.`);
      continue;
    }

    tokenBudgetApplied += tokenEstimate;
    tokensByType.set(record.type, currentTypeTokens + tokenEstimate);
    selectedItems.push({
      record,
      relevanceScore: scoreRecord(record, input.request.query),
      tokenEstimate,
      citation: buildCitation(record) ?? `uncited:${record.id}`,
      reasonSelected: `Selected ${record.type} memory within policy '${input.policy.policyId}'.`,
    });
  }

  const bundle: RetrievedMemoryBundle = {
    requestId: input.request.requestId,
    policyId: input.policy.policyId,
    ...(input.request.tenantId ? { tenantId: input.request.tenantId } : {}),
    ...(input.request.projectId ? { projectId: input.request.projectId } : {}),
    items: selectedItems,
    totalTokenEstimate: tokenBudgetApplied,
    truncated,
    warnings,
    createdAt: now.toISOString(),
  };

  return {
    bundle,
    recordsConsidered: input.records.length,
    recordsReturned: selectedItems.length,
    tokenBudgetApplied,
    truncated,
    warnings,
  };
}

export function buildCitation(record: MemoryRecord): string | undefined {
  const sourceUri = record.sourceUrl ?? record.source.uri;
  if (!sourceUri) {
    return undefined;
  }

  return [
    record.id,
    record.title,
    record.source.kind,
    sourceUri,
  ].join(" | ");
}

function getRecordContent(record: MemoryRecord): string {
  return record.content ?? record.body;
}

function isRecordReadableForTenant(
  record: MemoryRecord,
  request: AgentMemoryRequest,
  policy: MemoryRetrievalPolicy,
): boolean {
  if (!policy.tenantIsolationRequired) {
    return true;
  }

  if (!record.tenantId) {
    return true;
  }

  return record.tenantId === request.tenantId;
}

function isRecordReadableForProject(record: MemoryRecord, request: AgentMemoryRequest): boolean {
  if (!request.projectId || !record.projectId) {
    return true;
  }

  return record.projectId === request.projectId;
}

function isRecordReadableForAgent(record: MemoryRecord, request: AgentMemoryRequest): boolean {
  if (!record.agentId) {
    return true;
  }

  return record.agentId === request.agentId;
}

function isRecordReadableForSession(record: MemoryRecord, request: AgentMemoryRequest): boolean {
  if (!record.sessionId) {
    return true;
  }

  return record.sessionId === request.sessionId;
}

function isRecordActive(record: MemoryRecord, now: Date, warnings: string[]): boolean {
  if (record.status === "deprecated" || record.deprecatedAt) {
    warnings.push(`Record '${record.id}' was excluded because it is deprecated.`);
    return false;
  }

  if (record.validFrom && new Date(record.validFrom) > now) {
    warnings.push(`Record '${record.id}' was excluded because it is not valid yet.`);
    return false;
  }

  if (record.validTo && new Date(record.validTo) < now) {
    warnings.push(`Record '${record.id}' was excluded because it is no longer valid.`);
    return false;
  }

  return true;
}

function meetsConfidence(recordConfidence: MemoryConfidence, minimumConfidence: MemoryConfidence): boolean {
  return CONFIDENCE_RANK[recordConfidence] >= CONFIDENCE_RANK[minimumConfidence];
}

function isFreshEnough(
  record: MemoryRecord,
  policy: MemoryRetrievalPolicy,
  now: Date,
  warnings: string[],
): boolean {
  if (policy.freshnessCutoffDays === undefined) {
    return true;
  }

  const updatedAt = new Date(record.updatedAt || record.createdAt);
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - policy.freshnessCutoffDays);

  if (updatedAt < cutoff) {
    warnings.push(`Record '${record.id}' was excluded because it is outside the freshness window.`);
    return false;
  }

  return true;
}

function hasRequiredCitation(record: MemoryRecord, policy: MemoryRetrievalPolicy, warnings: string[]): boolean {
  if (!policy.citationsRequired) {
    return true;
  }

  if (buildCitation(record)) {
    return true;
  }

  warnings.push(`Record '${record.id}' was excluded because policy '${policy.policyId}' requires citations.`);
  return false;
}

function compareRecords(
  left: MemoryRecord,
  right: MemoryRecord,
  policy: MemoryRetrievalPolicy,
  query: string,
): number {
  const leftOrder = policy.retrievalOrder.indexOf(left.type);
  const rightOrder = policy.retrievalOrder.indexOf(right.type);
  const normalizedLeftOrder = leftOrder === -1 ? policy.retrievalOrder.length : leftOrder;
  const normalizedRightOrder = rightOrder === -1 ? policy.retrievalOrder.length : rightOrder;

  if (normalizedLeftOrder !== normalizedRightOrder) {
    return normalizedLeftOrder - normalizedRightOrder;
  }

  const scoreDelta = scoreRecord(right, query) - scoreRecord(left, query);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function scoreRecord(record: MemoryRecord, query: string): number {
  const haystack = `${record.title}\n${getRecordContent(record)}\n${record.tags.join(" ")}`.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  if (terms.length === 0) {
    return 0;
  }

  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}
