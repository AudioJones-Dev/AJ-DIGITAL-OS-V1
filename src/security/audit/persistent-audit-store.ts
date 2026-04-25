import path from "node:path";

import { appendLog, readLogs } from "../persistence/jsonl-log-store.js";
import type {
  ActionCategory,
  ActionRisk,
  EnforcementDecision,
  PermissionLevel,
} from "../permissions/permission-levels.js";

const DEFAULT_AUDIT_PATH = path.resolve("data", "security", "audit-log.jsonl");

const REDACT_FIELDS = ["command", "target"];

export interface PersistentAuditRecord {
  auditId: string;
  timestamp: string;
  agentId: string;
  tenantId?: string | null | undefined;
  permissionLevel: PermissionLevel;
  category: ActionCategory;
  decision: EnforcementDecision;
  risk: ActionRisk;
  reason: string;
}

export class PersistentAuditStore {
  private readonly filePath: string;

  constructor(filePath: string = DEFAULT_AUDIT_PATH) {
    this.filePath = filePath;
  }

  async append(record: PersistentAuditRecord): Promise<void> {
    await appendLog(this.filePath, record as unknown as Record<string, unknown>, {
      redactFields: REDACT_FIELDS,
    });
  }

  async readAll(
    filter?: (record: PersistentAuditRecord) => boolean,
  ): Promise<PersistentAuditRecord[]> {
    return readLogs<PersistentAuditRecord>(this.filePath, filter);
  }
}

export const defaultAuditStore = new PersistentAuditStore();
