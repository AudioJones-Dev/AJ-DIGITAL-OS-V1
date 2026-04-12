import type { ModelProvider } from "../providers/model-provider.js";

export interface WorkflowContext {
  runId: string;
  taskType: string;
  objective: string;
  clientId: string;
  brandDNA: Record<string, unknown>;
  sourceMaterials: Array<Record<string, unknown>>;
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface WorkflowAsset {
  type:
    | "title"
    | "outline"
    | "blog_draft"
    | "cta"
    | "seo_notes"
    | "hook_set"
    | "caption_set";
  value: string;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  taskType: string;
  status: "draft_complete" | "needs_revision" | "failed";
  summary: string;
  assets: WorkflowAsset[];
  warnings: string[];
}

export type WorkflowModelExecutionEventType =
  | "model_execution_attempted"
  | "model_execution_succeeded"
  | "model_execution_parse_failed"
  | "model_execution_fallback_used"
  | "model_execution_failed";

export interface WorkflowModelExecutionEvent {
  type: WorkflowModelExecutionEventType;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowModelRuntime {
  provider: ModelProvider;
  providerName: string;
  model: string;
  system: string;
  user: string;
  metadata?: Record<string, unknown>;
  onEvent?(event: WorkflowModelExecutionEvent): Promise<void>;
}

export interface WorkflowDefinition {
  id: string;
  supportedTaskTypes: string[];
  execute(context: WorkflowContext, modelRuntime?: WorkflowModelRuntime): Promise<WorkflowExecutionResult>;
}
