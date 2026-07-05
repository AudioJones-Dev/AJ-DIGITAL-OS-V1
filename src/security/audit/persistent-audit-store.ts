import path from "node:path";

import { appendLog, readLogs } from "../persistence/jsonl-log-store.js";
import type {
  ActionCategory,
  ActionRisk,
  EnforcementDecision,
  PermissionLevel,
} from "../permissions/permission-levels.js";

export const AUDIT_STORE_PATH_ENV = "AJ_AUDIT_STORE_PATH";

// Resolved lazily so AJ_AUDIT_STORE_PATH overrides (tests) apply
// regardless of module import order.
function defaultAuditPath(): string {
  const override = process.env[AUDIT_STORE_PATH_ENV]?.trim();
  if (override !== undefined && override.length > 0) {
    return path.resolve(override);
  }
  return path.resolve("data", "security", "audit-log.jsonl");
}

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
  private readonly explicitPath: string | undefined;

  constructor(filePath?: string) {
    this.explicitPath = filePath;
  }

  private get filePath(): string {
    return this.explicitPath ?? defaultAuditPath();
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
