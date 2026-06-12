/**
 * Governance — Attribution emitter.
 *
 * Fire-and-forget MAP attribution events for governance check outcomes.
 * Never throws and never blocks the caller.
 */

import { emitEvent } from "../attribution/attribution-tracker.js";
import type { AttributionEventType } from "../attribution/attribution-types.js";

import type { GovernanceRequest, GovernanceResult } from "./governance-types.js";

const TAG = "[GOVERNANCE-ATTR]";
const GOVERNANCE_AGENT_ID = "governance-engine";

function fireEvent(
  eventType: AttributionEventType,
  runId: string,
  metadata: Record<string, unknown>,
  tenantId?: string,
): void {
  try {
    void emitEvent({
      eventType,
      runId,
      agentId: GOVERNANCE_AGENT_ID,
      channel: "unknown",
      ...(tenantId ? { clientId: tenantId } : {}),
      metadata,
    }).catch((err: unknown) => {
      console.warn(
        `${TAG} attribution emit failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  } catch (err) {
    console.warn(
      `${TAG} attribution emit threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function emitGovernanceEvent(
  request: GovernanceRequest,
  result: GovernanceResult,
): void {
  const eventType: AttributionEventType =
    result.overall === "block"
      ? "governance_check_blocked"
      : result.overall === "approval_required"
      ? "governance_approval_required"
      : result.overall === "warn"
      ? "governance_check_warned"
      : "governance_check_passed";

  const runId = `governance-${Date.now()}`;
  const metadata: Record<string, unknown> = {
    overall: result.overall,
    requiresApproval: result.requiresApproval,
    blockedReasons: result.blockedReasons,
    warnings: result.warnings,
    ...(request.contentCategory ? { contentCategory: request.contentCategory } : {}),
    ...(request.workflowType ? { workflowType: request.workflowType } : {}),
    ...(request.agentRole ? { agentRole: request.agentRole } : {}),
    ...(request.action ? { action: request.action } : {}),
  };

  fireEvent(eventType, runId, metadata, request.tenantId);
}
