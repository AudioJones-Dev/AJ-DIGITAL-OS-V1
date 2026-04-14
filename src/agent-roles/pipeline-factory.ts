import type {
  AgentPipelineDefinition,
  PipelineStage,
  AgentRoleKind,
} from "./agent-role-types.js";
import { createPlannerHandler } from "./handlers/planner-handler.js";
import { createExecutorHandler } from "./handlers/executor-handler.js";
import { createValidatorHandler } from "./handlers/validator-handler.js";
import { createMonitorHandler } from "./handlers/monitor-handler.js";
import type { PlannerInput } from "./handlers/planner-handler.js";
import type { ExecutorInput } from "./handlers/executor-handler.js";
import type { ValidatorInput, ValidatorRule } from "./handlers/validator-handler.js";
import type { MonitorInput } from "./handlers/monitor-handler.js";

/**
 * Build a standard pipeline: Planner → Executor → Validator → Monitor
 *
 * This is the canonical AJ Digital OS agent pipeline.
 * Validator rejection re-runs the executor.
 */
export function buildStandardPipeline(
  id: string,
  description: string,
  options?: {
    skipPlanner?: boolean | undefined;
    skipMonitor?: boolean | undefined;
    validatorRules?: ValidatorRule[] | undefined;
    monitorChecks?: MonitorInput["healthChecks"] | undefined;
  },
): AgentPipelineDefinition {
  const stages: PipelineStage[] = [];

  if (!options?.skipPlanner) {
    stages.push({
      role: "planner",
      handler: createPlannerHandler(),
    });
  }

  stages.push({
    role: "executor",
    handler: createExecutorHandler(),
  });

  stages.push({
    role: "validator",
    handler: createValidatorHandler(),
  });

  if (!options?.skipMonitor) {
    stages.push({
      role: "monitor",
      handler: createMonitorHandler(),
    });
  }

  return {
    id,
    description,
    stages,
    validatorCanReject: true,
  };
}

/**
 * Build a minimal execute-and-validate pipeline (no planner, no monitor).
 */
export function buildExecValidatePipeline(
  id: string,
  description: string,
): AgentPipelineDefinition {
  return buildStandardPipeline(id, description, {
    skipPlanner: true,
    skipMonitor: true,
  });
}

/**
 * Build a monitor-only pipeline for scheduled health checks.
 */
export function buildMonitorPipeline(
  id: string,
  description: string,
): AgentPipelineDefinition {
  return {
    id,
    description,
    stages: [
      {
        role: "monitor",
        handler: createMonitorHandler(),
      },
    ],
    validatorCanReject: false,
  };
}

/**
 * Map of role kinds to their default handler factory functions.
 */
export const ROLE_HANDLER_FACTORIES = {
  planner: createPlannerHandler,
  executor: createExecutorHandler,
  validator: createValidatorHandler,
  monitor: createMonitorHandler,
} as const satisfies Record<AgentRoleKind, () => unknown>;
