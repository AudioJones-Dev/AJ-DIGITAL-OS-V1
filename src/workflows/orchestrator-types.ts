import type { WorkflowJobDefinition, WorkflowResult } from "../browser-agent/workflow-types.js";
import type { LocalAgentTaskInput, LocalAgentResult } from "../local-agent/local-agent.js";
import type { ValidationRule } from "../local-agent/validators.js";
import type { MemoryPolicy, RunContext } from "../memory-runtime/types.js";

// ── Step Types (discriminated union) ───────────────────────────────

export interface BrowserExtractStep {
  type: "browser-extract";
  name: string;
  job: WorkflowJobDefinition;
}

export interface NormalizeConfigStep {
  type: "normalize-config";
  name: string;
  task: string;
  outputTargets: string[];
  allowedPaths?: string[] | undefined;
  inputFiles?: string[] | undefined;
  context?: Record<string, unknown> | undefined;
}

export interface ValidateStep {
  type: "validate";
  name: string;
  target: string;
  rules: ValidationRule[];
}

export interface StoreMemoryStep {
  type: "store-memory";
  name: string;
  /** Key under which to write extracted data into memory context. */
  key: string;
  /** Static content — if omitted, uses the previous step's output. */
  content?: string | undefined;
  tags?: string[] | undefined;
}

export type OrchestratorStep =
  | BrowserExtractStep
  | NormalizeConfigStep
  | ValidateStep
  | StoreMemoryStep;

// ── Workflow Definition ────────────────────────────────────────────

export interface OrchestratorWorkflow {
  id: string;
  description: string;
  steps: OrchestratorStep[];
  memoryPolicy?: MemoryPolicy | undefined;
}

// ── Step Result ────────────────────────────────────────────────────

export interface StepResult {
  stepName: string;
  stepType: OrchestratorStep["type"];
  ok: boolean;
  durationMs: number;
  output: unknown;
  error?: string | undefined;
}

// ── Orchestrator Result ────────────────────────────────────────────

export interface OrchestratorResult {
  workflowId: string;
  ok: boolean;
  stepsCompleted: number;
  totalSteps: number;
  stepResults: StepResult[];
  durationMs: number;
  runContext?: RunContext | undefined;
  warnings: string[];
  error?: string | undefined;
}
