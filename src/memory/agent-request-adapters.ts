import type {
  AgentBoundaryRequestInput,
  AgentClientType,
  AgentMemoryAdapterInput,
} from "./agent-context-contracts.js";
import { DEFAULT_AGENT_RETRIEVAL_POLICY } from "./agent-context-contracts.js";
import type { AgentMemoryRequest, MemoryType } from "./memory-types.js";

const MEMORY_TYPES: readonly MemoryType[] = [
  "working_context",
  "run_log",
  "decision",
  "sop",
  "client_profile",
  "project",
  "mistake",
  "research",
  "agent_profile",
  "brand_memory",
  "retrieval_policy",
  "write_policy",
];

export function normalizeClaudeCodeMemoryRequest(
  input: unknown,
  policyName = DEFAULT_AGENT_RETRIEVAL_POLICY.claude_code,
): AgentMemoryRequest {
  return normalizeAgentMemoryRequest(input, "claude_code", policyName);
}

export function normalizeCodexMemoryRequest(
  input: unknown,
  policyName = DEFAULT_AGENT_RETRIEVAL_POLICY.codex,
): AgentMemoryRequest {
  return normalizeAgentMemoryRequest(input, "codex", policyName);
}

export function normalizeHermesMemoryRequest(
  input: unknown,
  policyName = DEFAULT_AGENT_RETRIEVAL_POLICY.hermes,
): AgentMemoryRequest {
  return normalizeAgentMemoryRequest(input, "hermes", policyName);
}

export function normalizeOpenClawMemoryRequest(
  input: unknown,
  policyName = DEFAULT_AGENT_RETRIEVAL_POLICY.openclaw,
): AgentMemoryRequest {
  return normalizeAgentMemoryRequest(input, "openclaw", policyName);
}

export function normalizeLocalAgentMemoryRequest(
  input: unknown,
  policyName = DEFAULT_AGENT_RETRIEVAL_POLICY.local_agent,
): AgentMemoryRequest {
  return normalizeAgentMemoryRequest(input, "local_agent", policyName);
}

export function normalizeBoundaryMemoryRequest(
  input: AgentBoundaryRequestInput,
  policyName = DEFAULT_AGENT_RETRIEVAL_POLICY[input.agentClient],
): AgentMemoryRequest {
  switch (input.agentClient) {
    case "claude_code":
      return normalizeClaudeCodeMemoryRequest(input, policyName);
    case "codex":
      return normalizeCodexMemoryRequest(input, policyName);
    case "hermes":
      return normalizeHermesMemoryRequest(input, policyName);
    case "openclaw":
      return normalizeOpenClawMemoryRequest(input, policyName);
    case "local_agent":
      return normalizeLocalAgentMemoryRequest(input, policyName);
  }
}

function normalizeAgentMemoryRequest(
  input: unknown,
  agentClient: AgentClientType,
  policyName: string,
): AgentMemoryRequest {
  const record = toAdapterInput(input);
  const taskType = getString(record, "taskType", "task_type") ?? "memory_context";
  const query = getString(record, "queryText", "query_text", "query") ?? "";
  const sessionId = getString(record, "sessionId", "session_id");
  const tenantId = getString(record, "tenantId", "tenant_id");
  const projectId = getString(record, "projectId", "project_id");
  const maxTokens = getNumber(record, "maxTokens", "max_tokens");
  const requireCitations = getBoolean(record, "requireCitations", "require_citations");
  const structuredFilters = getRecordValue(record, "structuredFilters", "structured_filters");
  const createdAt = getString(record, "createdAt", "created_at") ?? "2026-06-06T00:00:00.000Z";
  const requestId = getString(record, "requestId", "request_id")
    ?? `${agentClient}:${sessionId ?? "missing-session"}:${taskType}`;

  return {
    requestId,
    agentId: getString(record, "agentId", "agent_id") ?? "",
    ...(sessionId ? { sessionId } : {}),
    agentClient,
    task: getString(record, "task") ?? taskType,
    taskType,
    purpose: mapTaskTypeToPurpose(taskType),
    ...(tenantId ? { tenantId } : {}),
    ...(projectId ? { projectId } : {}),
    requestedTypes: getMemoryTypes(record),
    query,
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(requireCitations === undefined ? {} : { requireCitations }),
    ...(structuredFilters ? { structuredFilters } : {}),
    retrievalPolicyId: policyName,
    createdAt,
  };
}

function mapTaskTypeToPurpose(taskType: string): AgentMemoryRequest["purpose"] {
  switch (taskType) {
    case "implementation":
    case "local_automation":
      return "implementation";
    case "code_review":
    case "repo_analysis":
      return "review";
    case "daily_digest":
      return "runtime";
    case "handoff":
      return "handoff";
    default:
      return "planning";
  }
}

function getMemoryTypes(record: AgentMemoryAdapterInput): MemoryType[] {
  const value = record.requestedTypes ?? record.requested_types;
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter(isMemoryType))];
}

function toAdapterInput(input: unknown): AgentMemoryAdapterInput {
  if (isRecord(input)) {
    return input as AgentMemoryAdapterInput;
  }

  return {};
}

function getString(record: AgentMemoryAdapterInput, ...keys: Array<keyof AgentMemoryAdapterInput>): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

function getNumber(record: AgentMemoryAdapterInput, ...keys: Array<keyof AgentMemoryAdapterInput>): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function getBoolean(record: AgentMemoryAdapterInput, ...keys: Array<keyof AgentMemoryAdapterInput>): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function getRecordValue(
  record: AgentMemoryAdapterInput,
  ...keys: Array<keyof AgentMemoryAdapterInput>
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function isMemoryType(value: unknown): value is MemoryType {
  return typeof value === "string" && MEMORY_TYPES.includes(value as MemoryType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
