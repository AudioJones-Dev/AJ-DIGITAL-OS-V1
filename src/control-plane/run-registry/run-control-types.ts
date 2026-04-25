export type RunControlState =
  | "queued" | "planning" | "running" | "waiting_for_approval"
  | "retrying" | "escalated" | "completed" | "failed" | "cancelled";

export type ControlAction =
  | "rerun" | "pause" | "resume" | "cancel"
  | "approve" | "reject" | "escalate" | "inspect";

export interface ControlRunRecord {
  runId: string;
  agentId: string;
  controlState: RunControlState;
  previousState?: RunControlState;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  cancelledBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent {
  eventId: string;
  runId: string;
  agentId: string;
  action: ControlAction;
  fromState: RunControlState;
  toState: RunControlState;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export const VALID_TRANSITIONS: Record<RunControlState, RunControlState[]> = {
  queued: ["planning", "cancelled"],
  planning: ["running", "waiting_for_approval", "failed", "cancelled"],
  running: ["completed", "failed", "retrying", "escalated", "waiting_for_approval", "cancelled"],
  waiting_for_approval: ["running", "cancelled", "failed"],
  retrying: ["running", "failed", "escalated", "cancelled"],
  escalated: ["running", "cancelled", "failed"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

export const ACTION_RISK: Record<ControlAction, "low" | "medium" | "high"> = {
  inspect: "low",
  approve: "medium",
  reject: "medium",
  pause: "medium",
  resume: "medium",
  rerun: "high",
  escalate: "high",
  cancel: "high",
};

export const APPROVAL_REQUIRED_ACTIONS: ControlAction[] = ["rerun", "escalate", "cancel"];
