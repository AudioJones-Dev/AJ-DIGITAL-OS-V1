export interface MemoryReference {
  path: string;
  description?: string;
}

export interface MemoryIndex {
  title: string;
  references: MemoryReference[];
  raw: string;
}

export interface MemorySummary {
  objective: string;
  summary: string;
  references: MemoryReference[];
}

export interface SemanticMemorySummaryReference extends MemoryReference {
  score?: number | undefined;
  kind?: string | undefined;
}

export interface SemanticMemorySummary extends MemorySummary {
  resultCount?: number | undefined;
}

export type MemoryType =
  | "working_context"
  | "run_log"
  | "decision"
  | "sop"
  | "client_profile"
  | "project"
  | "mistake"
  | "research"
  | "agent_profile"
  | "brand_memory"
  | "retrieval_policy"
  | "write_policy";

export type MemoryScope = "system" | "tenant" | "project" | "agent" | "run";

export type MemoryApprovalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "deprecated";

export type MemoryConfidence = "low" | "medium" | "high";

export type MemorySourceKind =
  | "operator_supplied"
  | "operator_decision"
  | "agent_generated"
  | "run_observation"
  | "validated_workflow"
  | "research_source"
  | "obsidian_export"
  | "system_event";

export interface MemorySource {
  kind: MemorySourceKind;
  uri?: string | undefined;
  title?: string | undefined;
  capturedAt?: string | undefined;
  capturedBy?: string | undefined;
  hash?: string | undefined;
}

export interface MemoryRecord {
  id: string;
  type: MemoryType;
  status: MemoryApprovalStatus;
  version: number;
  scope: MemoryScope;
  title: string;
  body: string;
  content?: string | undefined;
  tenantId?: string | undefined;
  projectId?: string | undefined;
  agentId?: string | undefined;
  runId?: string | undefined;
  sessionId?: string | undefined;
  source: MemorySource;
  confidence: MemoryConfidence;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  contentHash?: string | undefined;
  validFrom?: string | undefined;
  validTo?: string | undefined;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  deprecatedAt?: string | undefined;
  requiresApproval?: boolean | undefined;
  sourceUrl?: string | undefined;
  embeddingId?: string | undefined;
  graphEntityId?: string | undefined;
}

export interface MemoryWritePolicy {
  policyId: string;
  actorId: string;
  actorType: "human" | "agent" | "service";
  allowedTypes: MemoryType[];
  allowedScopes: MemoryScope[];
  requiresApproval: boolean;
  requireTenantId: boolean;
  requireSource: boolean;
  requireCitation: boolean;
  maxBodyCharacters: number;
  deniedTags: string[];
}

export interface MemoryRetrievalPolicy {
  policyId: string;
  allowedTypes: MemoryType[];
  maxTotalTokens: number;
  maxTokensPerMemoryType: Partial<Record<MemoryType, number>>;
  freshnessCutoffDays?: number | undefined;
  minimumConfidence: MemoryConfidence;
  citationsRequired: boolean;
  tenantIsolationRequired: boolean;
  retrievalOrder: MemoryType[];
}

export interface AgentMemoryRequest {
  requestId: string;
  agentId: string;
  sessionId?: string | undefined;
  agentClient?: string | undefined;
  task: string;
  taskType?: string | undefined;
  purpose: "planning" | "implementation" | "review" | "handoff" | "runtime";
  tenantId?: string | undefined;
  projectId?: string | undefined;
  runId?: string | undefined;
  requestedTypes: MemoryType[];
  query: string;
  maxTokens?: number | undefined;
  requireCitations?: boolean | undefined;
  structuredFilters?: Record<string, unknown> | undefined;
  retrievalPolicyId: string;
  writePolicyId?: string | undefined;
  createdAt: string;
}

export interface RetrievedMemoryItem {
  record: MemoryRecord;
  relevanceScore: number;
  tokenEstimate: number;
  citation: string;
  reasonSelected: string;
}

export interface RetrievedMemoryBundle {
  requestId: string;
  policyId: string;
  tenantId?: string | undefined;
  projectId?: string | undefined;
  items: RetrievedMemoryItem[];
  totalTokenEstimate: number;
  truncated: boolean;
  warnings: string[];
  createdAt: string;
}

export interface MemoryRouterDecision {
  decisionId: string;
  requestId: string;
  approved: boolean;
  allowed?: boolean | undefined;
  action: "retrieve" | "write" | "queue_for_approval" | "deny";
  reason: string;
  reasons?: string[] | undefined;
  policyId: string;
  policyName?: string | undefined;
  requestedTypes?: MemoryType[] | undefined;
  allowedTypes: MemoryType[];
  deniedTypes: MemoryType[];
  blockedTypes?: MemoryType[] | undefined;
  requiresHumanApproval: boolean;
  approvalStatus: MemoryApprovalStatus;
  tenantIsolationRequired?: boolean | undefined;
  tenantIsolationPassed?: boolean | undefined;
  citationRequired?: boolean | undefined;
  tokenBudgetRequested?: number | undefined;
  tokenBudgetApplied?: number | undefined;
  recordsConsidered?: number | undefined;
  recordsReturned?: number | undefined;
  warnings: string[];
  createdAt: string;
}
