import type { Mission } from "./mission-types.js";
import { DEFAULT_RETRY_POLICY, DEFAULT_MONITOR_POLICY } from "./mission-types.js";

/**
 * Build a full mission: Architect → Operator → Auditor → Sentinel.
 *
 * The canonical four-role pipeline with escalation support.
 */
export function buildFullMission(
  id: string,
  objective: string,
  context: Record<string, unknown>,
  options?: {
    successCriteria?: string[] | undefined;
    tags?: string[] | undefined;
    maxOperatorRetries?: number | undefined;
    maxEscalations?: number | undefined;
  },
): Mission {
  return {
    id,
    objective,
    roles: ["architect", "operator", "auditor", "sentinel"],
    context,
    successCriteria: options?.successCriteria ?? ["output exists", "output is valid"],
    retryPolicy: {
      ...DEFAULT_RETRY_POLICY,
      ...(options?.maxOperatorRetries !== undefined
        ? { maxOperatorRetries: options.maxOperatorRetries }
        : {}),
      ...(options?.maxEscalations !== undefined
        ? { maxEscalations: options.maxEscalations }
        : {}),
    },
    monitorPolicy: { ...DEFAULT_MONITOR_POLICY },
    tags: options?.tags,
  };
}

/**
 * Build a review mission: Architect → Operator → Auditor.
 *
 * Three-role pipeline — plans, executes, validates. No monitoring.
 */
export function buildReviewMission(
  id: string,
  objective: string,
  context: Record<string, unknown>,
  options?: {
    successCriteria?: string[] | undefined;
    tags?: string[] | undefined;
  },
): Mission {
  return {
    id,
    objective,
    roles: ["architect", "operator", "auditor"],
    context,
    successCriteria: options?.successCriteria ?? ["output exists"],
    retryPolicy: { ...DEFAULT_RETRY_POLICY },
    monitorPolicy: { enabled: false },
    tags: options?.tags,
  };
}

/**
 * Build an execute-and-validate mission: Operator → Auditor.
 *
 * Skip planning — go straight to execution and validation.
 * No escalation (no architect to escalate to).
 */
export function buildExecValidateMission(
  id: string,
  objective: string,
  context: Record<string, unknown>,
  options?: {
    successCriteria?: string[] | undefined;
    tags?: string[] | undefined;
  },
): Mission {
  return {
    id,
    objective,
    roles: ["operator", "auditor"],
    context,
    successCriteria: options?.successCriteria ?? ["output exists"],
    retryPolicy: {
      maxOperatorRetries: 2,
      escalateOnFailure: false,
      maxEscalations: 0,
    },
    monitorPolicy: { enabled: false },
    tags: options?.tags,
  };
}

/**
 * Build a repair mission: Sentinel → Architect → Operator → Auditor.
 *
 * Self-healing pattern — sentinel detects issue, architect plans fix,
 * operator executes, auditor validates.
 */
export function buildRepairMission(
  id: string,
  objective: string,
  context: Record<string, unknown>,
  options?: {
    successCriteria?: string[] | undefined;
    tags?: string[] | undefined;
  },
): Mission {
  return {
    id,
    objective,
    roles: ["sentinel", "architect", "operator", "auditor"],
    context,
    successCriteria: options?.successCriteria ?? ["repair verified"],
    retryPolicy: { ...DEFAULT_RETRY_POLICY, maxEscalations: 2 },
    monitorPolicy: { enabled: false },
    tags: options?.tags ?? ["self-healing"],
  };
}

/**
 * Build a monitor-only mission: Sentinel.
 *
 * Observation / health-check — no planning, execution, or validation.
 */
export function buildMonitorMission(
  id: string,
  objective: string,
  context: Record<string, unknown>,
  options?: {
    snapshotLabel?: string | undefined;
    tags?: string[] | undefined;
  },
): Mission {
  return {
    id,
    objective,
    roles: ["sentinel"],
    context,
    successCriteria: [],
    retryPolicy: {
      maxOperatorRetries: 0,
      escalateOnFailure: false,
      maxEscalations: 0,
    },
    monitorPolicy: {
      enabled: true,
      snapshotLabel: options?.snapshotLabel,
    },
    tags: options?.tags ?? ["monitoring"],
  };
}
