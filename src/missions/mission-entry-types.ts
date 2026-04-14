import type { MissionRole } from "../agent-roles/mission-types.js";

// ── Supported Mission Types ────────────────────────────────────────

/**
 * The bounded set of mission types Hermes may invoke.
 * New types require explicit opt-in — no arbitrary internals exposed.
 */
export type MissionTypeName =
  | "build_and_review"
  | "extract_normalize_store"
  | "repair_failed_workflow"
  | "monitor_only";

export const ALLOWED_MISSION_TYPES: readonly MissionTypeName[] = [
  "build_and_review",
  "extract_normalize_store",
  "repair_failed_workflow",
  "monitor_only",
] as const;

// ── Priority ───────────────────────────────────────────────────────

export type MissionPriority = "low" | "normal" | "high" | "critical";

// ── Inbound Envelope (Hermes → AJ OS) ─────────────────────────────

export interface MissionEnvelope {
  /** One of the allowed mission type identifiers. */
  mission_type: MissionTypeName;
  /** Human-readable objective for the mission. */
  objective: string;
  /** Arbitrary input payload — passed as context to the mission. */
  input: Record<string, unknown>;
  /** Execution priority. Defaults to "normal". */
  priority?: MissionPriority | undefined;
  /** Who/what requested this mission. */
  requested_by?: string | undefined;
  /** Scheduling context from the caller. */
  schedule_context?: ScheduleContext | undefined;
}

export interface ScheduleContext {
  trigger_type: string;
  trigger_time?: string | undefined;
  recurrence?: string | undefined;
}

// ── Outbound Result (AJ OS → Hermes) ──────────────────────────────

export interface MissionResultEnvelope {
  ok: boolean;
  mission_id: string;
  mission_type: MissionTypeName;
  status: "completed" | "failed";
  summary: string;
  /** Paths to artifacts produced (files, configs, reports). */
  artifacts: string[];
  /** Human-readable alerts. */
  alerts: string[];
  metrics: MissionMetrics;
  /** On failure, reference to the stored failure record. */
  failure_ref: string | null;
}

export interface MissionMetrics {
  durationMs: number;
  steps: number;
  rolesUsed: MissionRole[];
  escalations: number;
}

// ── Validation ─────────────────────────────────────────────────────

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an inbound mission envelope before execution.
 * Returns structured errors — never throws.
 */
export function validateMissionEnvelope(
  envelope: unknown,
): EnvelopeValidationResult {
  const errors: string[] = [];

  if (envelope === null || envelope === undefined || typeof envelope !== "object") {
    return { valid: false, errors: ["Envelope must be a non-null object."] };
  }

  const env = envelope as Record<string, unknown>;

  // mission_type
  if (typeof env["mission_type"] !== "string") {
    errors.push("mission_type is required and must be a string.");
  } else if (!ALLOWED_MISSION_TYPES.includes(env["mission_type"] as MissionTypeName)) {
    errors.push(
      `mission_type "${env["mission_type"]}" is not allowed. Allowed: ${ALLOWED_MISSION_TYPES.join(", ")}`,
    );
  }

  // objective
  if (typeof env["objective"] !== "string" || env["objective"].trim().length === 0) {
    errors.push("objective is required and must be a non-empty string.");
  }

  // input
  if (env["input"] === null || env["input"] === undefined || typeof env["input"] !== "object" || Array.isArray(env["input"])) {
    errors.push("input is required and must be a plain object.");
  }

  // priority (optional)
  if (env["priority"] !== undefined) {
    const allowed = ["low", "normal", "high", "critical"];
    if (typeof env["priority"] !== "string" || !allowed.includes(env["priority"])) {
      errors.push(`priority must be one of: ${allowed.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
