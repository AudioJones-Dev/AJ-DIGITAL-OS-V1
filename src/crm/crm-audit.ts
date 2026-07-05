import { randomUUID } from "node:crypto";

import { resolveRuntimePath } from "../core/runtime-paths.js";
import { appendLog, readLogs } from "../security/persistence/jsonl-log-store.js";
import type {
  CrmActorType,
  CrmApprovalStatus,
  CrmRiskLevel,
  CrmTenantContext,
} from "./crm-types.js";

// Resolved lazily so AJ_RUNTIME_DIR overrides (tests, smoke CLI) apply
// regardless of module import order — defaultCrmAuditLog below is constructed
// at import time.
function defaultCrmAuditPath(): string {
  return resolveRuntimePath("crm", "crm-audit.jsonl");
}

export type CrmAuditEventType =
  | "crm_contact_created"
  | "crm_contact_updated"
  | "crm_lead_created"
  | "crm_lead_updated"
  | "crm_opportunity_created"
  | "crm_opportunity_updated"
  | "crm_approval_required"
  | "crm_action_blocked";

export type CrmAuditObjectType = "contact" | "lead" | "opportunity";

export interface CrmAuditEvent {
  eventId: string;
  eventType: CrmAuditEventType;
  tenantId: string;
  actorType: CrmActorType;
  actorId: string;
  riskLevel: CrmRiskLevel;
  approvalStatus?: CrmApprovalStatus | undefined;
  objectType: CrmAuditObjectType;
  objectId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface CrmAuditFilter {
  tenantId?: string | undefined;
  eventType?: CrmAuditEventType | undefined;
  objectType?: CrmAuditObjectType | undefined;
  objectId?: string | undefined;
  limit?: number | undefined;
}

export class PersistentCrmAuditLog {
  private readonly explicitPath: string | undefined;

  constructor(filePath?: string) {
    this.explicitPath = filePath;
  }

  private get filePath(): string {
    return this.explicitPath ?? defaultCrmAuditPath();
  }

  async append(
    event: Omit<CrmAuditEvent, "eventId" | "timestamp"> & {
      eventId?: string | undefined;
      timestamp?: string | undefined;
    },
  ): Promise<CrmAuditEvent> {
    const full: CrmAuditEvent = {
      eventId: event.eventId ?? randomUUID(),
      eventType: event.eventType,
      tenantId: event.tenantId,
      actorType: event.actorType,
      actorId: event.actorId,
      riskLevel: event.riskLevel,
      objectType: event.objectType,
      objectId: event.objectId,
      timestamp: event.timestamp ?? new Date().toISOString(),
      payload: event.payload,
      ...(event.approvalStatus !== undefined ? { approvalStatus: event.approvalStatus } : {}),
    };

    await appendLog(this.filePath, full as unknown as Record<string, unknown>);
    return full;
  }

  async read(filter: CrmAuditFilter = {}): Promise<CrmAuditEvent[]> {
    let events = await readLogs<CrmAuditEvent>(this.filePath, (event) => {
      if (filter.tenantId !== undefined && event.tenantId !== filter.tenantId) return false;
      if (filter.eventType !== undefined && event.eventType !== filter.eventType) return false;
      if (filter.objectType !== undefined && event.objectType !== filter.objectType) return false;
      if (filter.objectId !== undefined && event.objectId !== filter.objectId) return false;
      return true;
    });

    events = events.slice().reverse();
    if (filter.limit !== undefined) events = events.slice(0, filter.limit);
    return events;
  }
}

export function auditPayloadForContext(
  context: CrmTenantContext,
  payload: Record<string, unknown> = {},
): Pick<CrmAuditEvent, "tenantId" | "actorType" | "actorId" | "riskLevel" | "approvalStatus"> & {
  payload: Record<string, unknown>;
} {
  return {
    tenantId: context.tenantId,
    actorType: context.actorType,
    actorId: context.actorId,
    riskLevel: context.riskLevel,
    payload,
    ...(context.approvalStatus !== undefined ? { approvalStatus: context.approvalStatus } : {}),
  };
}

export const defaultCrmAuditLog = new PersistentCrmAuditLog();
