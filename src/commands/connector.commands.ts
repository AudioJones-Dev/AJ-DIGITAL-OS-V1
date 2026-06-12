import {
  listConnectors,
  enableConnector,
  disableConnector,
} from "../connectors/connector-registry.js";
import { executeConnector } from "../connectors/connector-executor.js";
import { initDefaultConnectors } from "../connectors/connector-registry.js";
import { DEFAULT_CONNECTORS } from "../connectors/adapters/index.js";
import { readLogs } from "../security/persistence/jsonl-log-store.js";
import path from "node:path";
import type { ConnectorAuditEvent } from "../connectors/connector-types.js";

const AUDIT_PATH = path.resolve("runtime", "connectors", "audit.jsonl");

function init(): void { initDefaultConnectors(DEFAULT_CONNECTORS); }

export interface ConnectorListCommandInput { json?: boolean; enabledOnly?: boolean; }
export interface ConnectorListCommandResult { ok: boolean; data?: unknown; }
export class ConnectorListCommand {
  async run(input: ConnectorListCommandInput = {}): Promise<ConnectorListCommandResult> {
    init();
    const list = listConnectors(input.enabledOnly ? { enabled: true } : undefined);
    if (input.json) console.log(JSON.stringify({ ok: true, data: list }, null, 2));
    else {
      for (const c of list) {
        console.log(`${c.id.padEnd(20)} ${c.riskLevel.padEnd(12)} ${c.enabled ? "✓ enabled" : "✗ disabled"}  ${c.displayName}`);
      }
    }
    return { ok: true, data: list };
  }
}

export interface ConnectorEnableCommandInput { id?: string; json?: boolean; }
export interface ConnectorEnableCommandResult { ok: boolean; error?: string; }
export class ConnectorEnableCommand {
  async run(input: ConnectorEnableCommandInput = {}): Promise<ConnectorEnableCommandResult> {
    init();
    if (!input.id) { console.error("Usage: connector-enable --id <id>"); return { ok: false, error: "id required" }; }
    enableConnector(input.id);
    if (input.json) console.log(JSON.stringify({ ok: true, id: input.id }));
    else console.log(`Connector enabled: ${input.id}`);
    return { ok: true };
  }
}

export interface ConnectorDisableCommandInput { id?: string; json?: boolean; }
export interface ConnectorDisableCommandResult { ok: boolean; error?: string; }
export class ConnectorDisableCommand {
  async run(input: ConnectorDisableCommandInput = {}): Promise<ConnectorDisableCommandResult> {
    init();
    if (!input.id) { console.error("Usage: connector-disable --id <id>"); return { ok: false, error: "id required" }; }
    disableConnector(input.id);
    if (input.json) console.log(JSON.stringify({ ok: true, id: input.id }));
    else console.log(`Connector disabled: ${input.id}`);
    return { ok: true };
  }
}

export interface ConnectorExecuteCommandInput {
  id?: string;
  action?: string;
  payload?: string;
  tenantId?: string;
  json?: boolean;
}
export interface ConnectorExecuteCommandResult { ok: boolean; data?: unknown; error?: string; }
export class ConnectorExecuteCommand {
  async run(input: ConnectorExecuteCommandInput = {}): Promise<ConnectorExecuteCommandResult> {
    init();
    if (!input.id || !input.action) {
      console.error("Usage: connector-execute --id <id> --action <action> [--payload <json>]");
      return { ok: false, error: "id and action required" };
    }
    let payload: Record<string, unknown> = {};
    if (input.payload) {
      try { payload = JSON.parse(input.payload) as Record<string, unknown>; } catch { payload = {}; }
    }
    const result = await executeConnector({
      connectorId: input.id,
      action: input.action as import("../connectors/connector-types.js").ConnectorCapability,
      payload,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    });
    if (input.json) console.log(JSON.stringify(result, null, 2));
    else {
      if (result.ok) console.log(`✓ Connector executed: ${input.id}/${input.action}`);
      else console.error(`✗ Error: ${result.error}`);
    }
    return { ok: result.ok, ...(result.data !== undefined ? { data: result.data } : {}), ...(result.error !== undefined ? { error: result.error } : {}) };
  }
}

export interface ConnectorAuditCommandInput { limit?: number; json?: boolean; }
export interface ConnectorAuditCommandResult { ok: boolean; events?: ConnectorAuditEvent[]; }
export class ConnectorAuditCommand {
  async run(input: ConnectorAuditCommandInput = {}): Promise<ConnectorAuditCommandResult> {
    const events = await readLogs<ConnectorAuditEvent>(AUDIT_PATH);
    const slice = events.slice(-(input.limit ?? 50)).reverse();
    if (input.json) console.log(JSON.stringify({ ok: true, events: slice }, null, 2));
    else {
      for (const ev of slice) {
        const icon = ev.ok ? "✓" : "✗";
        console.log(`${icon} ${ev.timestamp.slice(0, 19)} ${ev.connectorId.padEnd(18)} ${ev.action.padEnd(10)} ${ev.ok ? "ok" : ev.error ?? "error"}`);
      }
    }
    return { ok: true, events: slice };
  }
}
