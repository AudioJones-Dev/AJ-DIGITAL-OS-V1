import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

import type { AuditLogRecord } from "../types/control-plane.types.js";

export class ControlPlaneAuditLogger {
  private readonly auditPath: string;

  constructor(auditPath = process.env.AJ_CONTROL_PLANE_AUDIT_LOG_PATH) {
    this.auditPath = auditPath
      ? path.resolve(auditPath)
      : path.resolve(process.cwd(), "data", "logs", "control-plane-audit.jsonl");
  }

  async log(record: AuditLogRecord): Promise<void> {
    const directory = path.dirname(this.auditPath);
    await mkdir(directory, { recursive: true });
    await appendFile(this.auditPath, `${JSON.stringify(record)}\n`, "utf8");
  }
}
