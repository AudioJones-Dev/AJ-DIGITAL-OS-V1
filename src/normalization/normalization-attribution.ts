/**
 * L5 — Normalization attribution.
 *
 * Fire-and-forget MAP emits for entity normalization lifecycle events.
 * Mirrors decision-attribution: any failure (sync or async) is swallowed
 * with a warning log so the caller is never blocked.
 */

import { emitEvent } from "../attribution/attribution-tracker.js";
import type { AttributionEventType } from "../attribution/attribution-types.js";

import type {
  NormalizedEntity,
  NormalizedEntityType,
} from "./normalization-types.js";

const TAG = "[NORMALIZATION-ATTR]";
const NORMALIZATION_AGENT_ID = "normalization-engine";

function fireEvent(
  eventType: AttributionEventType,
  runId: string,
  metadata: Record<string, unknown>,
): void {
  try {
    void emitEvent({
      eventType,
      runId,
      agentId: NORMALIZATION_AGENT_ID,
      channel: "unknown",
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

export function emitEntityNormalized(
  entityType: NormalizedEntityType,
  entity: NormalizedEntity,
): void {
  fireEvent("entity_normalized", entity.entityId, {
    entityType,
    entityId: entity.entityId,
    schemaVersion: entity.schemaVersion,
    ...(entity.tenantId !== undefined ? { tenantId: entity.tenantId } : {}),
  });
}

export function emitEntityNormalizationFailed(
  entityType: NormalizedEntityType,
  reason: string,
  context: Record<string, unknown> = {},
): void {
  const runId =
    typeof context["entityId"] === "string" ? (context["entityId"] as string) : "unknown";
  fireEvent("entity_normalization_failed", runId, {
    entityType,
    reason,
    ...context,
  });
}

export function emitEntityUpdated(
  entityType: NormalizedEntityType,
  entity: NormalizedEntity,
): void {
  fireEvent("entity_updated", entity.entityId, {
    entityType,
    entityId: entity.entityId,
    schemaVersion: entity.schemaVersion,
    ...(entity.tenantId !== undefined ? { tenantId: entity.tenantId } : {}),
  });
}
