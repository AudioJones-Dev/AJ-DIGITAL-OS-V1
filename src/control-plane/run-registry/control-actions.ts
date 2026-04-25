import { randomUUID } from "node:crypto";

import {
  executeWithEnforcement,
  EnforcementBlockedError,
} from "../../security/permissions/enforced-execution.js";
import { defaultApprovalService } from "../../security/approvals/approval-service.js";
import { emitEvent } from "../../attribution/attribution-tracker.js";

import type { ControlAction, RunControlState } from "./run-control-types.js";
import { APPROVAL_REQUIRED_ACTIONS, ACTION_RISK } from "./run-control-types.js";
import { getControlRun, updateControlState, isValidTransition } from "./run-control-store.js";
import { logAuditEvent } from "./run-audit-log.js";
import type { ControlActionContext } from "./control-context.js";
import { defaultContext } from "./control-context.js";

export type { ControlActionContext };

export interface ControlActionResult {
  success: boolean;
  newState?: RunControlState;
  error?: string;
  requiresApproval?: boolean;
  approvalId?: string;
  blocked?: boolean;
}

const ACTION_TRANSITIONS: Partial<Record<ControlAction, RunControlState>> = {
  rerun: "queued",
  pause: "waiting_for_approval",
  resume: "running",
  cancel: "cancelled",
  approve: "running",
  reject: "failed",
  escalate: "escalated",
};

function riskToActionCategory(risk: "low" | "medium" | "high") {
  if (risk === "high") return "COMMAND_RESTRICTED" as const;
  if (risk === "medium") return "COMMAND_CAUTION" as const;
  return "COMMAND_SAFE" as const;
}

function mapRiskToApprovalRisk(risk: "low" | "medium" | "high") {
  return risk === "high" ? ("high" as const) : risk === "medium" ? ("medium" as const) : ("low" as const);
}

/**
 * Primary entry point — all control actions MUST go through here.
 * Enforces: state validity → tenant check → security enforcement → approval gate → execution → audit → attribution
 *
 * Backward-compatible: accepts legacy (runId, action, performedBy: string, reason?, approvalGranted?: boolean)
 * or new     (runId, action, context: ControlActionContext, reason?)
 */
export async function executeControlAction(
  runId: string,
  action: ControlAction,
  contextOrPerformedBy: ControlActionContext | string,
  reason?: string,
  _legacyApprovalGranted?: boolean,
): Promise<ControlActionResult> {
  // Normalize: support legacy (runId, action, "string", reason, approvalGranted) signature
  const ctx: ControlActionContext =
    typeof contextOrPerformedBy === "string"
      ? {
          ...defaultContext(contextOrPerformedBy),
          // If legacy approvalGranted=true, treat as system to bypass approval gate
          ...(_legacyApprovalGranted ? { performedBy: "system", agentId: "system" } : {}),
        }
      : contextOrPerformedBy;

  const { agentId, permissionLevel, tenantId, environment, performedBy } = ctx;
  const risk = ACTION_RISK[action];

  // 1. Look up run
  const record = getControlRun(runId);
  if (!record) {
    return { success: false, error: `Run not found: ${runId}` };
  }

  // 2. Tenant gate — require tenantId for medium/high risk in non-local environments
  if (risk !== "low" && !tenantId && environment !== "local" && environment !== "dev") {
    logAuditEvent({
      runId, agentId, action,
      fromState: record.controlState, toState: record.controlState,
      performedBy, decision: "block", risk,
      ...(tenantId !== undefined ? { tenantId } : {}),
      enforcementResult: "tenantId required",
    });
    return { success: false, error: `tenantId required for ${risk} actions` };
  }

  // 3. Approval gate — checked before state validation so requiresApproval is always surfaced
  if (APPROVAL_REQUIRED_ACTIONS.includes(action) && performedBy !== "system") {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const approvalReq = await defaultApprovalService.createApprovalRequest({
      approvalType: "mcp_privileged_tool_call",
      requestedByAgentId: agentId,
      permissionLevel,
      actionCategory: riskToActionCategory(risk),
      risk: mapRiskToApprovalRisk(risk),
      reason: `Control plane action '${action}' on run ${runId}${reason ? `: ${reason}` : ""}`,
      expiresAt,
      target: runId,
      command: action,
      ...(tenantId !== undefined ? { clientId: tenantId } : {}),
      environment: environment,
    });

    logAuditEvent({
      runId, agentId, action,
      fromState: record.controlState, toState: record.controlState,
      performedBy, decision: "approval_required", risk,
      ...(tenantId !== undefined ? { tenantId } : {}),
      approvalId: approvalReq.approvalId,
    });

    return { success: false, requiresApproval: true, approvalId: approvalReq.approvalId };
  }

  // 4. State transition validation (fast-fail before enforcement)
  if (action !== "inspect") {
    const targetState = ACTION_TRANSITIONS[action];
    if (!targetState) {
      return { success: false, error: `Unknown action: ${action}` };
    }
    if (!isValidTransition(record.controlState, targetState)) {
      logAuditEvent({
        runId, agentId, action,
        fromState: record.controlState, toState: record.controlState,
        performedBy, decision: "block", risk,
        enforcementResult: `Cannot transition: ${record.controlState} → ${targetState}`,
      });
      return {
        success: false,
        error: `Cannot transition from '${record.controlState}' to '${targetState}' via '${action}'`,
      };
    }
  }

  // 5. Security enforcement via executeWithEnforcement
  const enforcementRequest = {
    agentId,
    actionType: "control_plane_action",
    command: action,
    target: runId,
    ...(tenantId !== undefined ? { clientId: tenantId } : {}),
  };

  const enforcementContext = {
    permissionLevel,
    environment: environment,
  };

  let enforcementAuditId: string = randomUUID();

  try {
    const enforcementResult = await executeWithEnforcement(
      enforcementRequest,
      enforcementContext,
      async () => {
        // This runs only when enforcement allows
        return { allowed: true };
      },
    );

    if (enforcementResult.status === "approval_required") {
      // Enforcement layer itself requires approval — check if action also needs one
      const needsApproval = APPROVAL_REQUIRED_ACTIONS.includes(action) && performedBy !== "system";

      if (needsApproval) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const approvalReq = await defaultApprovalService.createApprovalRequest({
          approvalType: "mcp_privileged_tool_call",
          requestedByAgentId: agentId,
          permissionLevel,
          actionCategory: riskToActionCategory(risk),
          risk: mapRiskToApprovalRisk(risk),
          reason: `Control plane action '${action}' on run ${runId}${reason ? `: ${reason}` : ""}`,
          expiresAt,
          target: runId,
          command: action,
          ...(tenantId !== undefined ? { clientId: tenantId } : {}),
          ...(enforcementResult.enforcement.auditId ? { auditId: enforcementResult.enforcement.auditId } : {}),
          environment: environment,
        });

        logAuditEvent({
          runId, agentId, action,
          fromState: record.controlState, toState: record.controlState,
          performedBy, decision: "approval_required", risk,
          ...(tenantId !== undefined ? { tenantId } : {}),
          approvalId: approvalReq.approvalId,
          enforcementResult: enforcementResult.enforcement.reason,
        });

        return { success: false, requiresApproval: true, approvalId: approvalReq.approvalId };
      }

      enforcementAuditId = enforcementResult.enforcement.auditId;
    } else {
      enforcementAuditId = enforcementResult.enforcement.auditId;
    }
  } catch (err) {
    if (err instanceof EnforcementBlockedError) {
      logAuditEvent({
        runId, agentId, action,
        fromState: record.controlState, toState: record.controlState,
        performedBy, decision: "block", risk,
        ...(tenantId !== undefined ? { tenantId } : {}),
        enforcementResult: err.message,
      });
      return { success: false, blocked: true, error: `enforcement blocked: ${err.message}` };
    }
    throw err;
  }

  // 6. Execute the action
  if (action === "inspect") {
    logAuditEvent({
      runId, agentId, action,
      fromState: record.controlState, toState: record.controlState,
      performedBy, decision: "allow", risk,
      ...(tenantId !== undefined ? { tenantId } : {}),
    });
    emitAttributionEvent(runId, action, record.controlState, record.controlState, agentId, true);
    return { success: true, newState: record.controlState };
  }

  const targetState = ACTION_TRANSITIONS[action]!;
  const meta: Record<string, unknown> = {};
  if (reason !== undefined) meta["reason"] = reason;
  if (action === "approve") meta["approvedBy"] = performedBy;
  if (action === "cancel") meta["cancelledBy"] = performedBy;
  if (tenantId !== undefined) meta["tenantId"] = tenantId;

  const updated = updateControlState(runId, targetState, meta);

  logAuditEvent({
    runId, agentId, action,
    fromState: record.controlState, toState: targetState,
    performedBy, decision: "allow", risk,
    ...(tenantId !== undefined ? { tenantId } : {}),
    ...(Object.keys(meta).length > 0 ? { metadata: meta } : {}),
  });

  emitAttributionEvent(runId, action, record.controlState, targetState, agentId, true);

  return { success: true, newState: updated.controlState };
}

/** Emit attribution event after control action — never throws */
function emitAttributionEvent(
  runId: string,
  action: string,
  fromState: RunControlState,
  toState: RunControlState,
  agentId: string,
  success: boolean,
): void {
  try {
    void emitEvent({
      eventType: success ? "run_completed" : "run_failed",
      runId,
      agentId,
      channel: "unknown",
      metadata: { controlAction: action, fromState, toState },
    });
  } catch {
    // attribution must never break control flow
  }
}
