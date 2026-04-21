import type { ToolCapabilityDefinition } from "./tool-capability-types.js";
import type { McpToolAdapterDefinition } from "./mcp-tool-adapter-types.js";
import type { ToolProviderDefinition } from "./tool-provider-types.js";

export type ToolImplementationKind = "native" | "mcp";
export type ToolPermissionClassification =
  | "read_only"
  | "local_mutation"
  | "external_api"
  | "approval_required";
export type ToolApprovalClassification = "none" | "guarded" | "explicit_approval";

// ── Input Schema ───────────────────────────────────────────────────

export type ToolInputFieldType = "string" | "number" | "boolean" | "object" | "array";

export interface ToolInputField {
  type: ToolInputFieldType;
  description?: string | undefined;
  required?: boolean | undefined;
  default?: unknown;
}

export type ToolInputSchema = Record<string, ToolInputField>;

export interface ToolInvocationMetadata {
  invocationId?: string | undefined;
  runId?: string | undefined;
  sessionId?: string | undefined;
  clientId?: string | undefined;
  brandId?: string | undefined;
  source?: string | undefined;
  requestedBy?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ToolExecutionContext {
  allowedToolNames?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
  invocation?: ToolInvocationMetadata | undefined;
}

export interface ToolDefinition<TPayload = unknown, TResult = unknown> {
  name: string;
  description?: string;
  displayName?: string;
  inputSchema?: ToolInputSchema | undefined;
  providerId?: string | undefined;
  kind?: ToolImplementationKind | undefined;
  capabilityIds?: string[] | undefined;
  permissionClassification?: ToolPermissionClassification | undefined;
  approvalClassification?: ToolApprovalClassification | undefined;
  enabled?: boolean | undefined;
  execute(payload: TPayload, context: ToolExecutionContext): Promise<TResult> | TResult;
}

export interface ToolPermissionDecision {
  allowed: boolean;
  toolName: string;
  reasons: string[];
}

export interface ToolExecutionResult<TResult = unknown> {
  ok: boolean;
  toolName: string;
  invocationId: string;
  result?: TResult;
  durationMs: number;
  warnings: string[];
  errors: string[];
}

export interface ToolDescriptor {
  name: string;
  displayName: string;
  description?: string | undefined;
  inputSchema?: ToolInputSchema | undefined;
  providerId?: string | undefined;
  kind: ToolImplementationKind;
  capabilityIds: string[];
  permissionClassification: ToolPermissionClassification;
  approvalClassification: ToolApprovalClassification;
  enabled: boolean;
}

export interface ToolRegistrySnapshot {
  providers: ToolProviderDefinition[];
  capabilities: ToolCapabilityDefinition[];
  mcpAdapters: McpToolAdapterDefinition[];
  tools: ToolDescriptor[];
}
