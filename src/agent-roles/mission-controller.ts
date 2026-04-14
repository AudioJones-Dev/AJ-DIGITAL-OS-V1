import type { AgentPipelineDefinition, AgentPipelineResult, AgentRoleKind, PipelineStage, RoleHandler } from "./agent-role-types.js";
import type {
  Mission,
  MissionResult,
  MissionState,
  MissionStatus,
  MissionAlert,
  EscalationRecord,
  MissionRole,
} from "./mission-types.js";
import { MISSION_ROLE_MAP, ROLE_TO_MISSION } from "./mission-types.js";
import { ROLE_HANDLER_FACTORIES } from "./pipeline-factory.js";
import { runAgentPipeline } from "./pipeline-runner.js";

/** Options for runMission — allows injecting test doubles. */
export interface MissionRunOptions {
  /** Override handler factories for testing / custom handlers. */
  handlerFactories?: Record<AgentRoleKind, () => RoleHandler>;
}

/**
 * Run a Mission end-to-end.
 *
 * Sits above `runAgentPipeline` — translates mission roles to pipeline
 * stages, runs the pipeline, handles escalation (operator failure →
 * architect re-plan → operator retry), and collects shared state.
 */
export async function runMission(
  mission: Mission,
  options?: MissionRunOptions,
): Promise<MissionResult> {
  const factories = options?.handlerFactories ?? ROLE_HANDLER_FACTORIES;
  const start = Date.now();
  const state = createInitialState(mission);
  const pipelineResults: AgentPipelineResult[] = [];
  const warnings: string[] = [];

  try {
    // ── Primary pipeline ────────────────────────────────────────
    const pipeline = buildPipelineFromMission(mission, "primary", factories);
    updateStatus(state, statusForFirstRole(mission.roles));

    const primaryResult = await runAgentPipeline(pipeline);
    pipelineResults.push(primaryResult);
    applyPipelineToState(state, primaryResult, mission.roles);
    warnings.push(...primaryResult.warnings);

    if (primaryResult.ok) {
      if (mission.monitorPolicy.enabled && !mission.roles.includes("sentinel")) {
        // Run a trailing sentinel pass if not already in the pipeline
        const monitorPipeline = buildMonitorOnlyPipeline(mission, state, factories);
        updateStatus(state, "monitoring");
        const monitorResult = await runAgentPipeline(monitorPipeline);
        pipelineResults.push(monitorResult);
        applyMonitorToState(state, monitorResult);
        warnings.push(...monitorResult.warnings);
      }

      updateStatus(state, "completed");
      return buildMissionResult(mission, state, pipelineResults, warnings, start, null);
    }

    // ── Escalation loop ─────────────────────────────────────────
    if (mission.retryPolicy.escalateOnFailure && mission.roles.includes("architect")) {
      const maxEscalations = mission.retryPolicy.maxEscalations || 1;

      for (let round = 1; round <= maxEscalations; round++) {
        updateStatus(state, "escalating");

        const escalationPipeline = buildEscalationPipeline(mission, state, round, factories);
        const escalationResult = await runAgentPipeline(escalationPipeline);
        pipelineResults.push(escalationResult);
        warnings.push(...escalationResult.warnings);

        const record: EscalationRecord = {
          round,
          reason: primaryResult.error ?? "Pipeline failed.",
          architectOutput: escalationResult.stageResults.find((r) => r.role === "planner")?.output ?? null,
          operatorRetryOutput: escalationResult.stageResults.find((r) => r.role === "executor")?.output ?? null,
          resolved: escalationResult.ok,
        };
        state.escalations.push(record);

        if (escalationResult.ok) {
          applyPipelineToState(state, escalationResult, ["architect", "operator", "auditor"]);
          updateStatus(state, "completed");
          return buildMissionResult(mission, state, pipelineResults, warnings, start, null);
        }
      }
    }

    // ── All escalations exhausted ───────────────────────────────
    updateStatus(state, "failed");
    const lastError = pipelineResults.at(-1)?.error ?? "Mission failed after all retries.";
    return buildMissionResult(mission, state, pipelineResults, warnings, start, lastError);
  } catch (err: unknown) {
    updateStatus(state, "failed");
    const message = err instanceof Error ? err.message : String(err);
    return buildMissionResult(mission, state, pipelineResults, warnings, start, message);
  }
}

// ── State Management ───────────────────────────────────────────────

function createInitialState(mission: Mission): MissionState {
  return {
    missionId: mission.id,
    status: "pending",
    plan: null,
    executionOutput: null,
    validationResult: null,
    alerts: [],
    escalations: [],
    memoryRefs: [],
    sharedData: { ...mission.context },
  };
}

function updateStatus(state: MissionState, status: MissionStatus): void {
  state.status = status;
}

function statusForFirstRole(roles: MissionRole[]): MissionStatus {
  const first = roles[0];
  if (!first) return "executing";
  const map: Partial<Record<MissionRole, MissionStatus>> = {
    architect: "planning",
    operator: "executing",
    auditor: "validating",
    sentinel: "monitoring",
  };
  return map[first] ?? "executing";
}

function applyPipelineToState(
  state: MissionState,
  result: AgentPipelineResult,
  roles: MissionRole[],
): void {
  for (const stageResult of result.stageResults) {
    const missionRole = ROLE_TO_MISSION[stageResult.role];
    if (!missionRole) continue;

    switch (missionRole) {
      case "architect":
        state.plan = stageResult.output;
        break;
      case "operator":
        state.executionOutput = stageResult.output;
        break;
      case "auditor":
        state.validationResult = stageResult.output;
        break;
      case "sentinel":
        if (stageResult.output && typeof stageResult.output === "object") {
          const obs = stageResult.output as Record<string, unknown>;
          if (obs["healthy"] === false) {
            state.alerts.push({
              timestamp: new Date().toISOString(),
              source: "sentinel",
              level: "warn",
              message: String(obs["summary"] ?? "Unhealthy observation"),
            });
          }
        }
        break;
    }
  }
}

function applyMonitorToState(state: MissionState, result: AgentPipelineResult): void {
  for (const stageResult of result.stageResults) {
    if (stageResult.role !== "monitor") continue;
    if (stageResult.output && typeof stageResult.output === "object") {
      const obs = stageResult.output as Record<string, unknown>;
      if (obs["healthy"] === false) {
        state.alerts.push({
          timestamp: new Date().toISOString(),
          source: "sentinel",
          level: "warn",
          message: String(obs["summary"] ?? "Post-mission unhealthy observation"),
        });
      }
    }
  }
}

// ── Pipeline Builders ──────────────────────────────────────────────

type HandlerFactories = Record<AgentRoleKind, () => RoleHandler>;

function buildPipelineFromMission(
  mission: Mission,
  suffix: string,
  factories: HandlerFactories,
): AgentPipelineDefinition {
  const stages: PipelineStage[] = mission.roles.map((role) => {
    const agentRole = MISSION_ROLE_MAP[role];
    const factory = factories[agentRole];
    return { role: agentRole, handler: factory() };
  });

  const hasValidator = mission.roles.includes("auditor");
  const hasExecutor = mission.roles.includes("operator");

  return {
    id: `${mission.id}__${suffix}`,
    description: mission.objective,
    stages,
    validatorCanReject: hasValidator && hasExecutor,
  };
}

function buildEscalationPipeline(
  mission: Mission,
  state: MissionState,
  round: number,
  factories: HandlerFactories,
): AgentPipelineDefinition {
  // Escalation: architect re-plans → operator retries → auditor validates
  const stages: PipelineStage[] = [
    { role: "planner", handler: factories.planner() },
    { role: "executor", handler: factories.executor() },
    { role: "validator", handler: factories.validator() },
  ];

  return {
    id: `${mission.id}__escalation_${round}`,
    description: `Escalation round ${round}: re-plan and retry for "${mission.objective}"`,
    stages,
    validatorCanReject: true,
  };
}

function buildMonitorOnlyPipeline(
  mission: Mission,
  state: MissionState,
  factories: HandlerFactories,
): AgentPipelineDefinition {
  return {
    id: `${mission.id}__monitor`,
    description: `Post-mission monitoring for "${mission.objective}"`,
    stages: [{ role: "monitor", handler: factories.monitor() }],
    validatorCanReject: false,
  };
}

// ── Result Builder ─────────────────────────────────────────────────

function buildMissionResult(
  mission: Mission,
  state: MissionState,
  pipelineResults: AgentPipelineResult[],
  warnings: string[],
  start: number,
  error: string | null,
): MissionResult {
  return {
    missionId: mission.id,
    objective: mission.objective,
    ok: state.status === "completed",
    status: state.status,
    state,
    pipelineResults,
    durationMs: Date.now() - start,
    escalationCount: state.escalations.length,
    warnings,
    error,
  };
}
