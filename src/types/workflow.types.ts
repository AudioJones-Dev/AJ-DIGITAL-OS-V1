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

export interface WorkflowDefinition {
  id: string;
  supportedTaskTypes: string[];
  execute(context: WorkflowContext): Promise<WorkflowExecutionResult>;
}
