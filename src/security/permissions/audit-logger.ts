import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { defaultAuditStore } from "../audit/persistent-audit-store.js";
import type {
  ActionCategory,
  ActionRisk,
  AgentActionRequest,
  ApprovalStatus,
  EnforcementDecision,
  PermissionLevel,
} from "./permission-levels.js";

export interface AgentActionAuditRecord {
  auditId: string;
  timestamp: string;
  agentId: string;
  permissionLevel: PermissionLevel;
  actionType: string;
  target?: string | undefined;
  command?: string | undefined;
  toolName?: string | undefined;
  browserAction?: string | undefined;
  category: ActionCategory;
  decision: EnforcementDecision;
  approvalStatus: ApprovalStatus;
  risk: ActionRisk;
  reason: string;
  clientId?: string | null | undefined;
}

function resolveAuditPath(): string {
  const customPath = process.env.AJ_AGENT_AUDIT_LOG_PATH?.trim();
  if (customPath && customPath.length > 0) {
    return path.resolve(customPath);
  }
  return path.resolve("logs", "security", "agent-action-audit.jsonl");
}

function buildRecord(
  request: AgentActionRequest,
  auditId: string,
  permissionLevel: PermissionLevel,
  category: ActionCategory,
  decision: EnforcementDecision,
  approvalStatus: ApprovalStatus,
  risk: ActionRisk,
  reason: string,
): AgentActionAuditRecord {
  return {
    auditId,
    timestamp: new Date().toISOString(),
    agentId: request.agentId,
    permissionLevel,
    actionType: request.actionType,
    ...(request.target !== undefined ? { target: request.target } : {}),
    ...(request.command !== undefined ? { command: request.command } : {}),
    ...(request.toolName !== undefined ? { toolName: request.toolName } : {}),
    ...(request.browserAction !== undefined ? { browserAction: request.browserAction } : {}),
    category,
    decision,
    approvalStatus,
    risk,
    reason,
    ...(request.clientId !== undefined ? { clientId: request.clientId } : {}),
  };
}

export async function logAgentActionAudit(
  request: AgentActionRequest,
  auditId: string,
  permissionLevel: PermissionLevel,
  category: ActionCategory,
  decision: EnforcementDecision,
  approvalStatus: ApprovalStatus,
  risk: ActionRisk,
  reason: string,
): Promise<void> {
  const filePath = resolveAuditPath();
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });

  const record = buildRecord(
    request,
    auditId,
    permissionLevel,
    category,
    decision,
    approvalStatus,
    risk,
    reason,
  );

  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf-8");

  await defaultAuditStore.append({
    auditId: record.auditId,
    timestamp: record.timestamp,
    agentId: record.agentId,
    tenantId: record.clientId ?? null,
    permissionLevel: record.permissionLevel,
    category: record.category,
    decision: record.decision,
    risk: record.risk,
    reason: record.reason,
  });
}
