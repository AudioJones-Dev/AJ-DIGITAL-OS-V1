/**
 * Operating Core — System Event Ledger v1 types
 */

export type SystemEventCategory =
  | "run"
  | "state"
  | "policy"
  | "approval"
  | "dag"
  | "cache"
  | "retrieval"
  | "decision"
  | "attribution"
  | "tool"
  | "error"
  | "dashboard";

export type EventEnvironment = "local" | "dev" | "staging" | "production";

export type EventActorType = "user" | "admin" | "system" | "agent" | "client";

export interface SystemEvent {
  eventId: string;
  eventType: string;
  category: SystemEventCategory;
  tenantId?: string;
  runId?: string;
  nodeId?: string;
  actorId?: string;
  actorType?: EventActorType;
  environment: EventEnvironment;
  payload: Record<string, unknown>;
  timestamp: string;
  schemaVersion: string;
  correlationId?: string;
  causationId?: string;
}

export interface SystemEventFilter {
  category?: SystemEventCategory;
  runId?: string;
  tenantId?: string;
  eventType?: string;
  limit?: number;
}
