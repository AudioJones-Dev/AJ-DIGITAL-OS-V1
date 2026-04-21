import type { RoutingConstraints, TaskType } from "../model-routing/result-shape.js";
import type { MemoryPolicy } from "../memory-runtime/types.js";

// ── Agent Roles ────────────────────────────────────────────────────

export type AgentRole = "planner" | "executor" | "validator" | "monitor";

export interface RoleModelMapping {
  planner: TaskType;
  executor: TaskType;
  validator: TaskType;
  monitor: TaskType;
}

/**
 * Default mapping from agent role → model routing task type.
 *
 * planner   → openai (high IQ)
 * executor  → local / cheap model
 * validator → deterministic rules
 * monitor   → local / lightweight
 */
export const DEFAULT_ROLE_ROUTES: RoleModelMapping = {
  planner: "planner",
  executor: "transform",
  validator: "format",
  monitor: "local_agent",
};

/**
 * Default routing constraints per role.
 * Keeps costs down for executor/monitor, strict format for validator.
 */
export const DEFAULT_ROLE_CONSTRAINTS: Record<AgentRole, RoutingConstraints> = {
  planner: {},
  executor: { maxCostTier: 1 },
  validator: { strictFormat: true },
  monitor: { maxCostTier: 1 },
};

// ── Role Step ──────────────────────────────────────────────────────

export interface RoleStepConfig {
  role: AgentRole;
  name: string;
  instruction: string;
  /** Override the default task type routing for this step. */
  taskTypeOverride?: TaskType | undefined;
  /** Override routing constraints for this step. */
  constraintOverride?: RoutingConstraints | undefined;
  /** If true, a validation failure causes the pipeline to halt. */
  required?: boolean | undefined;
  /** Max retries before declaring failure. */
  maxRetries?: number | undefined;
  /**
   * Validator step only: deterministic validation function.
   * Receives the previous step's output and returns pass/fail + reasons.
   */
  validate?: ((input: unknown) => ValidationDecision) | undefined;
}

export interface ValidationDecision {
  pass: boolean;
  reasons: string[];
}

// ── Pipeline Definition ────────────────────────────────────────────

export interface AgentPipeline {
  id: string;
  description: string;
  steps: RoleStepConfig[];
  memoryPolicy?: MemoryPolicy | undefined;
}

// ── Step Result ────────────────────────────────────────────────────

export interface RoleStepResult {
  stepName: string;
  role: AgentRole;
  ok: boolean;
  output: unknown;
  durationMs: number;
  provider: string | null;
  model: string | null;
  retries: number;
  error?: string | undefined;
  validationReasons?: string[] | undefined;
}

// ── Pipeline Result ────────────────────────────────────────────────

export interface PipelineResult {
  pipelineId: string;
  ok: boolean;
  stepsCompleted: number;
  totalSteps: number;
  stepResults: RoleStepResult[];
  finalOutput: unknown;
  durationMs: number;
  warnings: string[];
  error?: string | undefined;
}
