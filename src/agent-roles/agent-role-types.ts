import type { RoutingConstraints, ModelRoutingResult } from "../model-routing/result-shape.js";
import type { RunContext } from "../memory-runtime/types.js";

// ── Agent Roles ────────────────────────────────────────────────────

export type AgentRoleKind = "planner" | "executor" | "validator" | "monitor";

/** Model intelligence tier — maps roles to provider selection. */
export type IntelligenceTier = "high" | "low" | "deterministic";

/** Role-specific configuration. */
export interface AgentRoleConfig {
  kind: AgentRoleKind;
  intelligenceTier: IntelligenceTier;
  /** Routing constraints applied when this role dispatches to model-routing. */
  routingConstraints: RoutingConstraints;
  /** Maximum retries before this role yields control. */
  maxRetries: number;
  /** Timeout in ms. 0 = no timeout. */
  timeoutMs: number;
}

/** Default configurations per role kind. */
export const ROLE_DEFAULTS: Record<AgentRoleKind, AgentRoleConfig> = {
  planner: {
    kind: "planner",
    intelligenceTier: "high",
    routingConstraints: { executionMode: "interactive" },
    maxRetries: 1,
    timeoutMs: 30_000,
  },
  executor: {
    kind: "executor",
    intelligenceTier: "low",
    routingConstraints: { executionMode: "interactive", maxCostTier: 1 },
    maxRetries: 2,
    timeoutMs: 60_000,
  },
  validator: {
    kind: "validator",
    intelligenceTier: "deterministic",
    routingConstraints: { executionMode: "interactive", strictFormat: true },
    maxRetries: 0,
    timeoutMs: 10_000,
  },
  monitor: {
    kind: "monitor",
    intelligenceTier: "low",
    routingConstraints: { executionMode: "interactive", maxCostTier: 1 },
    maxRetries: 1,
    timeoutMs: 15_000,
  },
};

// ── Role Step IO ───────────────────────────────────────────────────

/** Input to a single role execution within a pipeline. */
export interface RoleStepInput<T = unknown> {
  task: string;
  payload: T;
  /** Output from the preceding role (undefined for first role). */
  previousOutput?: unknown | undefined;
  runContext?: RunContext | undefined;
}

/** Output from a single role execution. */
export interface RoleStepOutput<T = unknown> {
  ok: boolean;
  role: AgentRoleKind;
  output: T | null;
  durationMs: number;
  retries: number;
  warnings: string[];
  error: string | null;
}

// ── Role Handler ───────────────────────────────────────────────────

/**
 * A role handler performs the actual work for a specific role.
 * Implementations are injected into the pipeline — this keeps the
 * orchestrator decoupled from specific tools / providers.
 */
export interface RoleHandler<TIn = unknown, TOut = unknown> {
  role: AgentRoleKind;
  execute(input: RoleStepInput<TIn>): Promise<RoleStepOutput<TOut>>;
}

// ── Pipeline Definition ────────────────────────────────────────────

/** A single stage in a role pipeline. */
export interface PipelineStage<TIn = unknown, TOut = unknown> {
  role: AgentRoleKind;
  handler: RoleHandler<TIn, TOut>;
  /** Override default config for this stage. */
  config?: Partial<AgentRoleConfig> | undefined;
}

/** Definition for a complete role pipeline. */
export interface AgentPipelineDefinition {
  id: string;
  description: string;
  stages: PipelineStage[];
  /** If true, validator rejection re-runs executor (up to executor maxRetries). */
  validatorCanReject: boolean;
}

// ── Pipeline Result ────────────────────────────────────────────────

export interface AgentPipelineResult {
  pipelineId: string;
  ok: boolean;
  stagesCompleted: number;
  totalStages: number;
  stageResults: RoleStepOutput[];
  finalOutput: unknown;
  durationMs: number;
  rejections: number;
  warnings: string[];
  error: string | null;
}
