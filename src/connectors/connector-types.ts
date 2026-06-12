/**
 * @layer L3 — Connector / Driver Layer
 * @purpose External tool communication types and interfaces
 */

export type ConnectorCapability =
  | "read" | "write" | "delete" | "list" | "search"
  | "send" | "create" | "update" | "execute" | "webhook";

export type ConnectorRiskLevel = "low" | "medium" | "high" | "restricted";
export type ConnectorAuthType = "oauth" | "api_key" | "service_account" | "local" | "none";

export interface OSConnector {
  id: string;
  provider: string;
  displayName: string;
  capabilities: ConnectorCapability[];
  authType: ConnectorAuthType;
  riskLevel: ConnectorRiskLevel;
  version: string;
  enabled: boolean;
}

export interface ConnectorInput {
  connectorId: string;
  action: ConnectorCapability;
  payload: Record<string, unknown>;
  tenantId?: string;
  actorId?: string;
  environment?: string;
}

export interface ConnectorResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  connectorId: string;
  action: string;
  executedAt: string;
  durationMs?: number;
}

export interface ConnectorAuditEvent {
  eventId: string;
  connectorId: string;
  provider: string;
  action: string;
  tenantId?: string;
  actorId?: string;
  ok: boolean;
  error?: string;
  timestamp: string;
  durationMs?: number;
}

export interface ConnectorAdapter {
  connector: OSConnector;
  execute(
    action: ConnectorCapability,
    payload: Record<string, unknown>,
    environment: string,
  ): Promise<ConnectorResult>;
}
