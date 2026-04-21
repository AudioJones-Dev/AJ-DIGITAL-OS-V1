import type { AgentRoleKind, AgentPipelineResult, RoleStepOutput } from "./agent-role-types.js";

// ── Mission Roles ──────────────────────────────────────────────────

/**
 * Named mission roles — human-readable aliases for agent role kinds.
 * Architect = planner, Operator = executor, Auditor = validator, Sentinel = monitor.
 */
export type MissionRole = "architect" | "operator" | "auditor" | "sentinel";

/** Map mission roles to underlying pipeline role kinds. */
export const MISSION_ROLE_MAP: Record<MissionRole, AgentRoleKind> = {
  architect: "planner",
  operator: "executor",
  auditor: "validator",
  sentinel: "monitor",
} as const;

/** Reverse map: pipeline role → mission role. */
export const ROLE_TO_MISSION: Record<AgentRoleKind, MissionRole> = {
  planner: "architect",
  executor: "operator",
  validator: "auditor",
  monitor: "sentinel",
} as const;

// ── Retry & Monitor Policies ───────────────────────────────────────

export interface MissionRetryPolicy {
  /** Maximum times the operator can retry before escalation. */
  maxOperatorRetries: number;
  /** If true, failures escalate back to architect for re-planning. */
  escalateOnFailure: boolean;
  /** Maximum escalation rounds (architect re-plans). 0 = no escalation limit. */
  maxEscalations: number;
}

export interface MissionMonitorPolicy {
  /** Whether sentinel observation runs after the pipeline completes. */
  enabled: boolean;
  /** If provided, sentinel captures a snapshot label. */
  snapshotLabel?: string | undefined;
}

export const DEFAULT_RETRY_POLICY: MissionRetryPolicy = {
  maxOperatorRetries: 2,
  escalateOnFailure: true,
  maxEscalations: 1,
};

export const DEFAULT_MONITOR_POLICY: MissionMonitorPolicy = {
  enabled: true,
};

// ── Mission Definition ─────────────────────────────────────────────

export interface Mission {
  id: string;
  objective: string;
  /** Ordered role sequence. Determines pipeline shape. */
  roles: MissionRole[];
  /** Arbitrary context passed as initial payload. */
  context: Record<string, unknown>;
  /** Plain-text success criteria used by auditor. */
  successCriteria: string[];
  retryPolicy: MissionRetryPolicy;
  monitorPolicy: MissionMonitorPolicy;
  /** Optional tags for memory categorisation. */
  tags?: string[] | undefined;
}

// ── Mission State (shared mutable state) ───────────────────────────

export type MissionStatus =
  | "pending"
  | "planning"
  | "executing"
  | "validating"
  | "monitoring"
  | "escalating"
  | "completed"
  | "failed";

export interface MissionState {
  missionId: string;
  status: MissionStatus;
  /** Output from the architect (plan). */
  plan: unknown;
  /** Output from the operator (execution result). */
  executionOutput: unknown;
  /** Output from the auditor (validation). */
  validationResult: unknown;
  /** Alerts raised by sentinel. */
  alerts: MissionAlert[];
  /** Escalation history. */
  escalations: EscalationRecord[];
  /** References to memory records written during this mission. */
  memoryRefs: string[];
  /** Arbitrary shared data that roles can read/write. */
  sharedData: Record<string, unknown>;
}

export interface MissionAlert {
  timestamp: string;
  source: MissionRole;
  level: "info" | "warn" | "error";
  message: string;
}

export interface EscalationRecord {
  round: number;
  reason: string;
  architectOutput: unknown;
  operatorRetryOutput: unknown;
  resolved: boolean;
}

// ── Mission Result ─────────────────────────────────────────────────

export interface MissionResult {
  missionId: string;
  objective: string;
  ok: boolean;
  status: MissionStatus;
  state: MissionState;
  pipelineResults: AgentPipelineResult[];
  durationMs: number;
  escalationCount: number;
  warnings: string[];
  error: string | null;
}
