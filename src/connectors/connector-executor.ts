import { randomUUID } from "node:crypto";
import path from "node:path";
import { appendLog } from "../security/persistence/jsonl-log-store.js";
import {
  getConnector,
  initDefaultConnectors,
} from "./connector-registry.js";
import { CONNECTOR_ADAPTERS, DEFAULT_CONNECTORS } from "./adapters/index.js";
import { emitConnectorExecuted, emitConnectorBlocked, emitConnectorFailed } from "./connector-attribution.js";
import type { ConnectorAuditEvent, ConnectorInput, ConnectorResult } from "./connector-types.js";

function auditPath(): string {
  return process.env["AJ_CONNECTOR_AUDIT_PATH"] ?? path.resolve("runtime", "connectors", "audit.jsonl");
}

// Boot: register defaults once
let initialized = false;
function ensureInit(): void {
  if (initialized) return;
  initialized = true;
  initDefaultConnectors(DEFAULT_CONNECTORS);
}

async function writeAudit(event: ConnectorAuditEvent): Promise<void> {
  try {
    await appendLog(auditPath(), event as unknown as Record<string, unknown>);
  } catch {
    // audit must never break control flow
  }
}

export async function executeConnector(input: ConnectorInput): Promise<ConnectorResult> {
  ensureInit();

  const { connectorId, action, payload, tenantId, actorId } = input;
  const environment = input.environment ?? process.env["HERMES_ENVIRONMENT"] ?? "local";
  const executedAt = new Date().toISOString();
  const base = { connectorId, action, executedAt };

  // 1. Look up connector
  const connector = getConnector(connectorId);
  if (!connector) {
    const error = `Connector not found: ${connectorId}`;
    await writeAudit({ eventId: randomUUID(), connectorId, provider: "unknown", action, ok: false, error, timestamp: executedAt, ...(tenantId !== undefined ? { tenantId } : {}), ...(actorId !== undefined ? { actorId } : {}) });
    emitConnectorBlocked(connectorId, error);
    return { ok: false, error, ...base };
  }

  // 2. Check enabled
  if (!connector.enabled) {
    const error = `Connector disabled: ${connectorId}`;
    await writeAudit({ eventId: randomUUID(), connectorId, provider: connector.provider, action, ok: false, error, timestamp: executedAt, ...(tenantId !== undefined ? { tenantId } : {}), ...(actorId !== undefined ? { actorId } : {}) });
    emitConnectorBlocked(connectorId, error);
    return { ok: false, error, ...base };
  }

  // 3. Tenant gate — medium/high/restricted in non-local/non-dev envs require tenantId
  const needsTenant = connector.riskLevel !== "low" && environment !== "local" && environment !== "dev";
  if (needsTenant && !tenantId) {
    const error = `tenantId required for ${connector.riskLevel} connector in ${environment} environment`;
    await writeAudit({ eventId: randomUUID(), connectorId, provider: connector.provider, action, ok: false, error, timestamp: executedAt, ...(actorId !== undefined ? { actorId } : {}) });
    emitConnectorBlocked(connectorId, error);
    return { ok: false, error, ...base };
  }

  // 4. Execute via adapter
  const adapter = CONNECTOR_ADAPTERS.get(connectorId);
  if (!adapter) {
    const error = `No adapter registered for connector: ${connectorId}`;
    await writeAudit({ eventId: randomUUID(), connectorId, provider: connector.provider, action, ok: false, error, timestamp: executedAt, ...(tenantId !== undefined ? { tenantId } : {}), ...(actorId !== undefined ? { actorId } : {}) });
    emitConnectorFailed(connectorId, error);
    return { ok: false, error, ...base };
  }

  const start = Date.now();
  try {
    const result = await adapter.execute(action, payload, environment);
    const durationMs = Date.now() - start;
    await writeAudit({ eventId: randomUUID(), connectorId, provider: connector.provider, action, ok: result.ok, ...(result.error !== undefined ? { error: result.error } : {}), timestamp: executedAt, durationMs, ...(tenantId !== undefined ? { tenantId } : {}), ...(actorId !== undefined ? { actorId } : {}) });
    if (result.ok) {
      emitConnectorExecuted(connectorId, action);
    } else {
      emitConnectorFailed(connectorId, result.error ?? "unknown error");
    }
    return { ...result, durationMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : "connector execution threw";
    const durationMs = Date.now() - start;
    await writeAudit({ eventId: randomUUID(), connectorId, provider: connector.provider, action, ok: false, error, timestamp: executedAt, durationMs, ...(tenantId !== undefined ? { tenantId } : {}), ...(actorId !== undefined ? { actorId } : {}) });
    emitConnectorFailed(connectorId, error);
    return { ok: false, error, durationMs, ...base };
  }
}

export { CONNECTOR_ADAPTERS, DEFAULT_CONNECTORS };
