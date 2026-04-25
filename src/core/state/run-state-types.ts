/**
 * Operating Core — Run State Machine v1
 *
 * Canonical run-lifecycle states shared across all modules
 * (Control Plane, BEL, DAG, Hermes, etc).
 */

export type RunState =
  | "queued"
  | "planning"
  | "running"
  | "waiting_for_approval"
  | "retrying"
  | "escalated"
  | "completed"
  | "failed"
  | "cancelled";

export type StateTransitionAction =
  | "plan"
  | "start"
  | "wait_for_approval"
  | "retry"
  | "escalate"
  | "complete"
  | "fail"
  | "approve"
  | "reject"
  | "cancel"
  | "resume";

export const TERMINAL_STATES: ReadonlyArray<RunState> = ["completed", "failed", "cancelled"];

/**
 * Strict, canonical transition map for the Operating Core.
 * Sub-systems (Control Plane, BEL) MAY relax this with `force=true`.
 */
export const VALID_RUN_STATE_TRANSITIONS: Record<RunState, RunState[]> = {
  queued: ["planning"],
  planning: ["running"],
  running: ["waiting_for_approval", "retrying", "escalated", "completed", "failed"],
  waiting_for_approval: ["running", "cancelled"],
  retrying: ["running"],
  escalated: ["running", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

export interface RunStateTransition {
  runId: string;
  fromState: RunState;
  toState: RunState;
  reason?: string;
  forced?: boolean;
  actorId?: string;
  actorType?: "user" | "admin" | "system" | "agent" | "client";
  timestamp: string;
}

export interface StateValidationResult {
  valid: boolean;
  reason?: string;
}
