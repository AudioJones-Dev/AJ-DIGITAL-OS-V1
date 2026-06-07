/**
 * Normalized result shape returned by every model routing call.
 * All providers must conform to this envelope.
 */
export interface ModelRoutingResult<T = unknown> {
  ok: boolean;
  provider: string | null;
  model: string | null;
  decisionReason?: string;
  taskType: TaskType;
  output: T | null;
  escalated: boolean;
  warnings: string[];
  error: string | null;
}

export type TaskType =
  | "planner"
  | "transform"
  | "format"
  | "local_agent"
  | "retrieval_augmented_answer"
  | "research"
  | "validation"
  | "structured_output"
  | "low_priority";

export type ExecutionMode =
  | "interactive"
  | "background_job"
  | "production_workflow"
  | "client_facing_automation";

export interface RoutingConstraints {
  offline?: boolean | undefined;
  privacySensitive?: boolean | undefined;
  mustBeLocal?: boolean | undefined;
  strictFormat?: boolean | undefined;
  maxCostTier?: number | undefined;
  executionMode?: ExecutionMode | undefined;
  apiBillingAllowed?: boolean | undefined;
  apiBillingReason?: string | undefined;
}

export interface ModelTaskRequest<T = unknown> {
  taskType: TaskType;
  task: string;
  context: T;
  constraints?: RoutingConstraints | undefined;
  preferredProvider?: string | undefined;
  allowEscalation?: boolean | undefined;
  /** Retrieved memory context — passed through to prompt builder. */
  retrievedContext?: import("../memory-runtime/retrieval.js").RetrievedContext | undefined;
}

export function createResult<T>(
  partial: Partial<ModelRoutingResult<T>> & Pick<ModelRoutingResult<T>, "taskType">,
): ModelRoutingResult<T> {
  return {
    ok: partial.ok ?? false,
    provider: partial.provider ?? null,
    model: partial.model ?? null,
    ...(partial.decisionReason !== undefined ? { decisionReason: partial.decisionReason } : {}),
    taskType: partial.taskType,
    output: partial.output ?? null,
    escalated: partial.escalated ?? false,
    warnings: partial.warnings ?? [],
    error: partial.error ?? null,
  };
}
