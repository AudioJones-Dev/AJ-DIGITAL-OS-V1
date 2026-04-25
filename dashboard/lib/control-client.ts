import type {
  ControlAction,
  ControlActionPayload,
  ControlActionResult,
  ControlAuditEvent,
  EnforcementSnapshot,
  RunControlState,
} from "./types";
import { ACTION_RISK, APPROVAL_REQUIRED_ACTIONS, TERMINAL_STATES } from "./types";

export const PUBLIC_HERMES_API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_HERMES_API_URL) ||
  "http://localhost:3001";

export const PUBLIC_DEFAULT_TENANT_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_HERMES_TENANT_ID) || undefined;

export interface BuildPayloadInput {
  action: ControlAction;
  actor?: string;
  actorType?: ControlActionPayload["actorType"];
  tenantId?: string;
  reason?: string;
}

/** Build an action payload that matches the Hermes /control/runs/:id/action contract. */
export function buildActionPayload(input: BuildPayloadInput): ControlActionPayload {
  const payload: ControlActionPayload = {
    action: input.action,
    actor: input.actor ?? "dashboard-user",
    actorType: input.actorType ?? "human",
  };
  if (input.tenantId !== undefined && input.tenantId !== "") payload.tenantId = input.tenantId;
  if (input.reason !== undefined && input.reason !== "") payload.reason = input.reason;
  return payload;
}

export function isTerminalState(state: RunControlState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * Decide whether a control action button should be disabled, given the run's
 * current state. Inspect is always allowed; everything else is blocked once
 * the run is in a terminal state. The backend remains the source of truth —
 * if it returns an error for a permitted action, the UI surfaces the message.
 */
export function isActionDisabledForState(
  action: ControlAction,
  state: RunControlState,
): boolean {
  if (action === "inspect") return false;
  return isTerminalState(state);
}

/** Send a control action. Errors come back as { ok:false, error }, never thrown. */
export async function clientControlRunAction(
  runId: string,
  payload: ControlActionPayload,
  baseUrl: string = PUBLIC_HERMES_API_URL,
): Promise<ControlActionResult> {
  try {
    const res = await fetch(`${baseUrl}/control/runs/${encodeURIComponent(runId)}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as ControlActionResult;
    // Normalise: ensure `ok` is set even if the server only sent `success`
    if (json.ok === undefined && json.success !== undefined) {
      return { ...json, ok: json.success };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/** Fetch audit events client-side. */
export async function clientGetControlRunAudit(
  runId: string,
  baseUrl: string = PUBLIC_HERMES_API_URL,
): Promise<ControlAuditEvent[]> {
  const res = await fetch(`${baseUrl}/control/runs/${encodeURIComponent(runId)}/audit`);
  if (!res.ok) throw new Error(`Audit fetch failed: ${res.status}`);
  const json = (await res.json()) as { ok: boolean; events: ControlAuditEvent[] };
  return json.events ?? [];
}

/**
 * Build an enforcement snapshot from the latest audit event (and an optional
 * action result). The latest audit event is canonical; the action result is a
 * fallback for the very first action when no audit row has been persisted yet.
 */
export function buildEnforcementSnapshot(
  state: RunControlState,
  audit: ControlAuditEvent[] | undefined,
  lastActionResult?: ControlActionResult,
  environment?: string,
): EnforcementSnapshot {
  const latest = audit && audit.length > 0 ? audit[0] : undefined;

  const lastAction = latest?.action;
  const decision = latest?.decision ?? deriveDecisionFromResult(lastActionResult);
  const risk =
    latest?.risk ??
    (lastAction !== undefined ? ACTION_RISK[lastAction] : undefined);
  const approvalRequired =
    decision === "approval_required" ||
    (lastActionResult?.requiresApproval ?? false);

  const snapshot: EnforcementSnapshot = {
    state,
    approvalRequired,
    hasTenantId: latest?.tenantId !== undefined,
  };
  if (lastAction !== undefined) snapshot.lastAction = lastAction;
  if (decision !== undefined) snapshot.decision = decision;
  if (risk !== undefined) snapshot.risk = risk;
  if (latest?.enforcementResult !== undefined) snapshot.blockedReason = latest.enforcementResult;
  else if (lastActionResult?.blocked && lastActionResult.error) snapshot.blockedReason = lastActionResult.error;
  if (latest?.performedBy !== undefined) snapshot.actor = latest.performedBy;
  if (latest?.tenantId !== undefined) snapshot.tenantId = latest.tenantId;
  if (latest?.approvalId !== undefined) snapshot.approvalId = latest.approvalId;
  else if (lastActionResult?.approvalId) snapshot.approvalId = lastActionResult.approvalId;
  if (latest?.enforcementAuditId !== undefined) snapshot.enforcementAuditId = latest.enforcementAuditId;
  if (latest?.timestamp !== undefined) snapshot.updatedAt = latest.timestamp;
  if (environment) snapshot.environment = environment;
  // Best-effort: actorType is not in audit rows; infer 'system' if performedBy looks system-y
  if (latest?.performedBy === "system") snapshot.actorType = "system";
  else if (latest?.performedBy !== undefined) snapshot.actorType = "human";

  return snapshot;
}

function deriveDecisionFromResult(
  result?: ControlActionResult,
): EnforcementSnapshot["decision"] {
  if (!result) return undefined;
  if (result.requiresApproval) return "approval_required";
  if (result.blocked) return "block";
  if (result.ok || result.success) return "allow";
  return undefined;
}

export interface AuditRowDisplay {
  timestamp: string;
  action: ControlAction;
  decision: string;
  risk: string;
  actor: string;
  tenantDisplay: string;
  auditIdShort: string;
}

/** Pure helper used by AuditTrail and tests. */
export function deriveAuditRow(event: ControlAuditEvent): AuditRowDisplay {
  const auditId = event.enforcementAuditId ?? event.eventId;
  return {
    timestamp: event.timestamp,
    action: event.action,
    decision: event.decision ?? "—",
    risk: event.risk ?? "—",
    actor: event.performedBy,
    tenantDisplay: event.tenantId ?? "—",
    auditIdShort: auditId.length > 8 ? `${auditId.slice(0, 8)}…` : auditId,
  };
}

export { ACTION_RISK, APPROVAL_REQUIRED_ACTIONS, TERMINAL_STATES };
