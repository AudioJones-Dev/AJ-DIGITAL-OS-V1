import type { ControlAction, RunControlState } from "./run-control-types.js";
import { APPROVAL_REQUIRED_ACTIONS } from "./run-control-types.js";
import { getControlRun, updateControlState } from "./run-control-store.js";
import { logAuditEvent } from "./run-audit-log.js";

type ActionResult = {
  success: boolean;
  newState?: RunControlState;
  error?: string;
  requiresApproval?: boolean;
};

const ACTION_TRANSITIONS: Partial<Record<ControlAction, RunControlState>> = {
  rerun: "queued",
  pause: "waiting_for_approval",
  resume: "running",
  cancel: "cancelled",
  approve: "running",
  reject: "failed",
  escalate: "escalated",
};

export async function executeControlAction(
  runId: string,
  action: ControlAction,
  performedBy: string,
  reason?: string,
): Promise<ActionResult> {
  const run = getControlRun(runId);
  if (!run) return { success: false, error: `Run not found: ${runId}` };

  if (APPROVAL_REQUIRED_ACTIONS.includes(action) && performedBy !== "system") {
    return { success: false, requiresApproval: true };
  }

  const fromState = run.controlState;

  if (action === "inspect") {
    logAuditEvent({
      runId,
      agentId: run.agentId,
      action,
      fromState,
      toState: fromState,
      performedBy,
      ...(reason ? { metadata: { reason } } : {}),
    });
    return { success: true, newState: fromState };
  }

  const toState = ACTION_TRANSITIONS[action];
  if (!toState) return { success: false, error: `Unknown action: ${action}` };

  try {
    const updated = updateControlState(runId, toState, reason ? { reason } : undefined);
    logAuditEvent({
      runId,
      agentId: run.agentId,
      action,
      fromState,
      toState,
      performedBy,
      ...(reason ? { metadata: { reason } } : {}),
    });
    return { success: true, newState: updated.controlState };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
