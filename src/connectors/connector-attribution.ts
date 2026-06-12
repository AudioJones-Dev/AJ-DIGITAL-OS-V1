import { emitEvent } from "../attribution/attribution-tracker.js";

export function emitConnectorExecuted(connectorId: string, action: string, agentId = "connector-layer"): void {
  try {
    void emitEvent({
      eventType: "connector_executed",
      runId: connectorId,
      agentId,
      channel: "unknown",
      metadata: { connectorId, action },
    });
  } catch {
    // fire-and-forget
  }
}

export function emitConnectorBlocked(connectorId: string, reason: string, agentId = "connector-layer"): void {
  try {
    void emitEvent({
      eventType: "connector_blocked",
      runId: connectorId,
      agentId,
      channel: "unknown",
      metadata: { connectorId, reason },
    });
  } catch {
    // fire-and-forget
  }
}

export function emitConnectorFailed(connectorId: string, error: string, agentId = "connector-layer"): void {
  try {
    void emitEvent({
      eventType: "connector_failed",
      runId: connectorId,
      agentId,
      channel: "unknown",
      metadata: { connectorId, error },
    });
  } catch {
    // fire-and-forget
  }
}
