import type {
  AgentMemoryRequest,
  MemoryConfidence,
  MemoryRecord,
  MemoryRouterDecision,
  MemorySource,
  MemoryType,
  RetrievedMemoryBundle,
} from "./memory-types.js";

export type AgentClientType =
  | "claude_code"
  | "codex"
  | "hermes"
  | "openclaw"
  | "local_agent";

export type AgentTaskPurpose = AgentMemoryRequest["purpose"];

export interface AgentMemoryAdapterInput {
  agentClient?: AgentClientType;
  requestId?: string;
  request_id?: string;
  agentId?: string;
  agent_id?: string;
  sessionId?: string;
  session_id?: string;
  tenantId?: string;
  tenant_id?: string;
  projectId?: string;
  project_id?: string;
  taskType?: string;
  task_type?: string;
  task?: string;
  requestedTypes?: MemoryType[];
  requested_types?: MemoryType[];
  maxTokens?: number;
  max_tokens?: number;
  requireCitations?: boolean;
  require_citations?: boolean;
  queryText?: string;
  query_text?: string;
  query?: string;
  structuredFilters?: Record<string, unknown>;
  structured_filters?: Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
}

export interface AgentBoundaryRequestInput extends AgentMemoryAdapterInput {
  agentClient: AgentClientType;
}

export interface AgentContextRecord {
  id: string;
  type: MemoryType;
  status: MemoryRecord["status"];
  scope: MemoryRecord["scope"];
  title: string;
  body: string;
  content?: string | undefined;
  tenantId?: string | undefined;
  projectId?: string | undefined;
  source: Pick<MemorySource, "kind" | "title" | "capturedAt"> & {
    uri?: string | undefined;
  };
  confidence: MemoryConfidence;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentContextItem {
  record: AgentContextRecord;
  relevanceScore: number;
  tokenEstimate: number;
  citation: string;
  reasonSelected: string;
}

export interface AgentContextBundle extends Omit<RetrievedMemoryBundle, "items"> {
  items: AgentContextItem[];
}

export interface BoundedAgentContextResult {
  normalizedRequest: AgentMemoryRequest;
  decision: MemoryRouterDecision;
  bundle: AgentContextBundle | null;
}

export const DEFAULT_AGENT_RETRIEVAL_POLICY: Record<AgentClientType, string> = {
  claude_code: "claude",
  codex: "codex",
  hermes: "hermes",
  openclaw: "agent-default",
  local_agent: "agent-default",
};
