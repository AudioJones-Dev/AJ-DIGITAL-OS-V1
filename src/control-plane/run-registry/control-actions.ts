import type { ControlAction, RunControlState } from "./run-control-types.js";
import { APPROVAL_REQUIRED_ACTIONS } from "./run-control-types.js";
import { getControlRun, updateControlState, isValidTransition } from "./run-control-store.js";
import { logAuditEvent } from "./run-audit-log.js";

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
  approvalGranted?: boolean,
): Promise<{ success: boolean; newState?: RunControlState; error?: string; requiresApproval?: boolean }> {
  const record = getControlRun(runId);
  if (!record) {
    return { success: false, error: `Run not found: ${runId}` };
  }

  if (APPROVAL_REQUIRED_ACTIONS.includes(action) && !approvalGranted) {
    return { success: false, requiresApproval: true, error: `Action '${action}' requires prior approval` };
  }

  if (action === "inspect") {
    logAuditEvent({
      runId,
      agentId: record.agentId,
      action,
      fromState: record.controlState,
      toState: record.controlState,
      performedBy,
      ...(reason !== undefined ? { metadata: { reason } } : {}),
    });
    return { success: true, newState: record.controlState };
  }

  const targetState = ACTION_TRANSITIONS[action];
  if (!targetState) {
    return { success: false, error: `Unknown action: ${action}` };
  }

  if (!isValidTransition(record.controlState, targetState)) {
    return {
      success: false,
      error: `Cannot transition from '${record.controlState}' to '${targetState}' via action '${action}'`,
    };
  }

  const meta: Record<string, unknown> = {};
  if (reason !== undefined) meta["reason"] = reason;
  if (action === "approve") meta["approvedBy"] = performedBy;
  if (action === "cancel") meta["cancelledBy"] = performedBy;

  const updated = updateControlState(runId, targetState, meta);

  logAuditEvent({
    runId,
    agentId: record.agentId,
    action,
    fromState: record.controlState,
    toState: targetState,
    performedBy,
    ...(Object.keys(meta).length > 0 ? { metadata: meta } : {}),
  });

  return { success: true, newState: updated.controlState };
}
