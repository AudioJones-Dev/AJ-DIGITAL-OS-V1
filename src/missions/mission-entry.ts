import type { Mission } from "../agent-roles/mission-types.js";
import type { MissionResult } from "../agent-roles/mission-types.js";
import type { MissionRole } from "../agent-roles/mission-types.js";
import { runMission } from "../agent-roles/mission-controller.js";
import type { MissionRunOptions } from "../agent-roles/mission-controller.js";
import {
  buildFullMission,
  buildReviewMission,
  buildRepairMission,
  buildMonitorMission,
} from "../agent-roles/mission-templates.js";
import { writeMissionState, appendSharedLog } from "../agent-roles/shared-memory.js";
import type { SharedMemoryConfig } from "../agent-roles/shared-memory.js";
import type {
  MissionEnvelope,
  MissionResultEnvelope,
  MissionTypeName,
  MissionMetrics,
} from "./mission-entry-types.js";
import { validateMissionEnvelope, ALLOWED_MISSION_TYPES } from "./mission-entry-types.js";

// ── Mission ID Generator ───────────────────────────────────────────

let missionSeq = 0;

function generateMissionId(missionType: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  missionSeq++;
  return `mission_${date}_${String(missionSeq).padStart(3, "0")}_${missionType}`;
}

/** Reset sequence counter (for testing). */
export function resetMissionSeq(): void {
  missionSeq = 0;
}

// ── Options ────────────────────────────────────────────────────────

export interface MissionEntryOptions {
  /** Override handler factories (testing). */
  runOptions?: MissionRunOptions;
  /** Override shared memory root (testing). */
  memoryConfig?: Partial<SharedMemoryConfig>;
  /** If true, skip writing to shared memory. */
  dryRun?: boolean;
}

// ── Entry Point ────────────────────────────────────────────────────

/**
 * Execute a mission from an inbound envelope.
 *
 * This is the single entry point Hermes calls into AJ OS.
 * It validates the envelope, maps mission_type to the correct
 * internal pipeline, runs it, persists results, and returns
 * a clean result envelope.
 */
export async function executeMissionFromEnvelope(
  envelope: MissionEnvelope,
  options?: MissionEntryOptions,
): Promise<MissionResultEnvelope> {
  // ── Validate ──────────────────────────────────────────────────
  const validation = validateMissionEnvelope(envelope);
  if (!validation.valid) {
    return buildFailureEnvelope(
      "invalid_envelope",
      envelope.mission_type ?? ("unknown" as MissionTypeName),
      `Invalid mission envelope: ${validation.errors.join("; ")}`,
    );
  }

  const missionId = generateMissionId(envelope.mission_type);

  // ── Map to internal mission ───────────────────────────────────
  const mission = mapEnvelopeToMission(missionId, envelope);

  // ── Execute ───────────────────────────────────────────────────
  let result: MissionResult;
  try {
    result = await runMission(mission, options?.runOptions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return buildFailureEnvelope(missionId, envelope.mission_type, message);
  }

  // ── Persist ───────────────────────────────────────────────────
  let failureRef: string | null = null;
  if (!options?.dryRun) {
    try {
      await writeMissionState(result.state, options?.memoryConfig);

      if (!result.ok) {
        await appendSharedLog({
          timestamp: new Date().toISOString(),
          missionId,
          role: "operator",
          type: "failure",
          content: result.error ?? "Mission failed.",
          metadata: {
            mission_type: envelope.mission_type,
            requested_by: envelope.requested_by,
            escalations: result.escalationCount,
          },
        }, options?.memoryConfig);
        failureRef = `data/memory/missions/${missionId}/state.json`;
      }
    } catch {
      // Memory write failure should not block result delivery
    }
  }

  // ── Build result envelope ─────────────────────────────────────
  const rolesUsed = extractRolesUsed(result);
  const totalSteps = result.pipelineResults.reduce((sum, p) => sum + p.stagesCompleted, 0);

  const metrics: MissionMetrics = {
    durationMs: result.durationMs,
    steps: totalSteps,
    rolesUsed,
    escalations: result.escalationCount,
  };

  const alerts = result.state.alerts.map((a) => a.message);
  if (result.warnings.length > 0) {
    alerts.push(...result.warnings);
  }

  return {
    ok: result.ok,
    mission_id: missionId,
    mission_type: envelope.mission_type,
    status: result.ok ? "completed" : "failed",
    summary: result.ok
      ? `Mission "${envelope.objective}" completed successfully.`
      : result.error ?? "Mission failed.",
    artifacts: extractArtifacts(result),
    alerts,
    metrics,
    failure_ref: result.ok ? null : (failureRef ?? `data/memory/missions/${missionId}/state.json`),
  };
}

// ── Mission Type → Internal Mission Mapping ────────────────────────

function mapEnvelopeToMission(id: string, envelope: MissionEnvelope): Mission {
  const context: Record<string, unknown> = {
    ...envelope.input,
    requested_by: envelope.requested_by ?? "unknown",
    priority: envelope.priority ?? "normal",
    ...(envelope.schedule_context ? { schedule_context: envelope.schedule_context } : {}),
  };

  switch (envelope.mission_type) {
    case "build_and_review":
      return buildFullMission(id, envelope.objective, context, {
        tags: ["build_and_review", "hermes"],
      });

    case "extract_normalize_store":
      return buildReviewMission(id, envelope.objective, context, {
        successCriteria: ["output exists", "output is valid", "fields extracted"],
        tags: ["extract_normalize_store", "hermes"],
      });

    case "repair_failed_workflow":
      return buildRepairMission(id, envelope.objective, context, {
        tags: ["repair", "self-healing", "hermes"],
      });

    case "monitor_only":
      return buildMonitorMission(id, envelope.objective, context, {
        snapshotLabel: envelope.schedule_context?.trigger_type ?? "manual",
        tags: ["monitoring", "hermes"],
      });

    default: {
      // Type-safe exhaustiveness — should never reach here after validation
      const _exhaustive: never = envelope.mission_type;
      throw new Error(`Unknown mission type: ${String(_exhaustive)}`);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function extractRolesUsed(result: MissionResult): MissionRole[] {
  const roles = new Set<MissionRole>();
  for (const pipeline of result.pipelineResults) {
    for (const stage of pipeline.stageResults) {
      const map: Record<string, MissionRole> = {
        planner: "architect",
        executor: "operator",
        validator: "auditor",
        monitor: "sentinel",
      };
      const role = map[stage.role];
      if (role) roles.add(role);
    }
  }
  return [...roles];
}

function extractArtifacts(result: MissionResult): string[] {
  // Artifacts are files referenced in the execution output, if any
  const output = result.state.executionOutput;
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const files = (output as Record<string, unknown>)["files"];
    if (Array.isArray(files) && files.every((f) => typeof f === "string")) {
      return files as string[];
    }
  }
  return [];
}

function buildFailureEnvelope(
  missionId: string,
  missionType: MissionTypeName,
  error: string,
): MissionResultEnvelope {
  return {
    ok: false,
    mission_id: missionId,
    mission_type: missionType,
    status: "failed",
    summary: error,
    artifacts: [],
    alerts: ["requires human attention"],
    metrics: { durationMs: 0, steps: 0, rolesUsed: [], escalations: 0 },
    failure_ref: `data/memory/missions/${missionId}/state.json`,
  };
}
