/**
 * Execution Logger — structured mission execution logging to Neon.
 *
 * Captures the full lifecycle of a mission run:
 *   run start → step-by-step logging → observations → failures → run complete
 *
 * All writes go to Neon (execution data layer).
 * Supabase run status is updated via mission-db-hooks (control layer).
 */

import type { AgentPipelineResult, RoleStepOutput } from "../agent-roles/agent-role-types.js";
import type { MissionResult } from "../agent-roles/mission-types.js";
import type { MissionEnvelope, MissionResultEnvelope } from "../missions/mission-entry-types.js";
import * as neon from "./neon-client.js";
import type { NeonConfig } from "./neon-client.js";

// ── Configuration ──────────────────────────────────────────────────

export interface ExecutionLoggerConfig {
  neon?: Partial<NeonConfig> | undefined;
  /** If true, skip all writes (testing). */
  dryRun?: boolean | undefined;
}

// ── Run Lifecycle ──────────────────────────────────────────────────

/**
 * Log the start of a mission run.
 * Creates the run record in Neon. Returns the Neon run ID.
 */
export async function logRunStart(
  runRef: string,
  envelope: MissionEnvelope,
  config?: ExecutionLoggerConfig,
): Promise<number | null> {
  if (config?.dryRun) return null;

  const result = await neon.createRun({
    run_ref: runRef,
    mission_type: envelope.mission_type,
    objective: envelope.objective,
    input_payload: envelope.input,
    status: "running",
    ok: null,
    summary: null,
    error: null,
    roles_used: [],
    escalation_count: 0,
    duration_ms: null,
  }, config?.neon);

  if (!result.ok || !result.data) {
    console.error(`[EXEC-LOGGER] Failed to create run: ${result.error}`);
    return null;
  }

  return result.data.id;
}

/**
 * Log the completion of a mission run.
 * Updates the run record with final status, metrics, and summary.
 */
export async function logRunComplete(
  runRef: string,
  resultEnvelope: MissionResultEnvelope,
  config?: ExecutionLoggerConfig,
): Promise<void> {
  if (config?.dryRun) return;

  await neon.completeRun(runRef, {
    status: resultEnvelope.ok ? "completed" : "failed",
    ok: resultEnvelope.ok,
    summary: resultEnvelope.summary,
    error: resultEnvelope.ok ? null : resultEnvelope.failure_ref,
    roles_used: resultEnvelope.metrics.rolesUsed,
    escalation_count: resultEnvelope.metrics.escalations,
    duration_ms: resultEnvelope.metrics.durationMs,
  }, config?.neon);
}

// ── Step Logging ───────────────────────────────────────────────────

/**
 * Log all pipeline steps from a mission result.
 * Each stage in each pipeline gets a step record.
 */
export async function logPipelineSteps(
  neonRunId: number,
  missionResult: MissionResult,
  config?: ExecutionLoggerConfig,
): Promise<void> {
  if (config?.dryRun) return;

  let stepIndex = 0;

  for (const pipeline of missionResult.pipelineResults) {
    for (const stage of pipeline.stageResults) {
      await neon.insertStep({
        run_id: neonRunId,
        step_index: stepIndex,
        role: stage.role,
        pipeline_id: pipeline.pipelineId,
        ok: stage.ok,
        input_snapshot: null, // Input not captured by RoleStepOutput — could be extended
        output_snapshot: stage.output,
        error: stage.error,
        duration_ms: stage.durationMs,
        retries: stage.retries,
        warnings: stage.warnings,
      }, config?.neon);

      stepIndex++;
    }
  }
}

// ── Observation Logging ────────────────────────────────────────────

/**
 * Log sentinel observations from a mission result.
 */
export async function logObservations(
  neonRunId: number,
  missionResult: MissionResult,
  config?: ExecutionLoggerConfig,
): Promise<void> {
  if (config?.dryRun) return;

  for (const pipeline of missionResult.pipelineResults) {
    for (const stage of pipeline.stageResults) {
      if (stage.role !== "monitor" || !stage.output) continue;

      const obs = stage.output as Record<string, unknown>;
      await neon.insertObservation({
        run_id: neonRunId,
        source: "sentinel",
        healthy: obs["healthy"] === true,
        summary: String(obs["summary"] ?? "No summary"),
        checks: Array.isArray(obs["checks"]) ? obs["checks"] as unknown[] : [],
        snapshot_label: typeof obs["snapshotLabel"] === "string" ? obs["snapshotLabel"] : null,
      }, config?.neon);
    }
  }
}

// ── Failure Logging ────────────────────────────────────────────────

/**
 * Log failures from a mission result.
 * Records failed pipeline stages and escalation records.
 */
export async function logFailures(
  neonRunId: number,
  missionResult: MissionResult,
  config?: ExecutionLoggerConfig,
): Promise<void> {
  if (config?.dryRun) return;

  // Log pipeline stage failures
  for (const pipeline of missionResult.pipelineResults) {
    for (const stage of pipeline.stageResults) {
      if (stage.ok) continue;

      await neon.insertFailure({
        run_id: neonRunId,
        step_id: null,
        role: stage.role,
        error: stage.error ?? "Unknown failure",
        input_snapshot: null,
        stack_trace: null,
        escalated: missionResult.escalationCount > 0,
        resolved: missionResult.ok,
        resolution: missionResult.ok ? "Recovered after escalation" : null,
      }, config?.neon);
    }
  }
}

// ── Full Mission Log ───────────────────────────────────────────────

/**
 * Log an entire mission execution in one call.
 * Convenience wrapper for the full lifecycle.
 */
export async function logFullMissionExecution(
  runRef: string,
  envelope: MissionEnvelope,
  missionResult: MissionResult,
  resultEnvelope: MissionResultEnvelope,
  config?: ExecutionLoggerConfig,
): Promise<void> {
  if (config?.dryRun) return;

  const neonRunId = await logRunStart(runRef, envelope, config);
  if (neonRunId === null) return;

  await Promise.all([
    logPipelineSteps(neonRunId, missionResult, config),
    logObservations(neonRunId, missionResult, config),
    logFailures(neonRunId, missionResult, config),
  ]);

  await logRunComplete(runRef, resultEnvelope, config);
}
