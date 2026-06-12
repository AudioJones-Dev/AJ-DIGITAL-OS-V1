/**
 * Neon-backed Approval Store.
 *
 * Implements the ApprovalStore interface against a Postgres `approvals`
 * table. Falls back to PersistentApprovalStore when NEON_DATABASE_URL is
 * not set so local development continues to work without a database.
 */

import { executeNeonSql, isNeonConfigured } from "./neon-client.js";
import type { ApprovalStore } from "../security/approvals/approval-store.js";
import { PersistentApprovalStore } from "../security/approvals/persistent-approval-store.js";
import type {
  ApprovalChannel,
  ApprovalEnvironment,
  ApprovalRequest,
  ApprovalState,
} from "../security/approvals/approval-types.js";
import type {
  ActionCategory,
  ActionRisk,
  PermissionLevel,
} from "../security/permissions/permission-levels.js";

const TAG = "[neon-approval-store]";
let fallbackWarned = false;

function warnFallback(): void {
  if (fallbackWarned) return;
  fallbackWarned = true;
  console.log(`${TAG} Neon not configured, using file store`);
}

interface ApprovalRow {
  approval_id: string;
  requested_at: string;
  expires_at: string;
  requested_by_agent_id: string;
  permission_level: number;
  action_category: string;
  risk: string;
  reason: string;
  target: string | null;
  command: string | null;
  client_id: string | null;
  environment: string;
  status: string;
  approved_by: string | null;
  approval_channel: string | null;
  audit_id: string | null;
}

function rowToRequest(row: ApprovalRow): ApprovalRequest {
  return {
    approvalId: row.approval_id,
    requestedAt: typeof row.requested_at === "string" ? row.requested_at : new Date(row.requested_at).toISOString(),
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : new Date(row.expires_at).toISOString(),
    requestedByAgentId: row.requested_by_agent_id,
    permissionLevel: row.permission_level as PermissionLevel,
    actionCategory: row.action_category as ActionCategory,
    risk: row.risk as ActionRisk,
    reason: row.reason,
    target: row.target,
    command: row.command,
    clientId: row.client_id,
    environment: row.environment as ApprovalEnvironment,
    status: row.status as ApprovalState,
    approvedBy: row.approved_by,
    approvalChannel: row.approval_channel as ApprovalChannel | null,
    auditId: row.audit_id,
  };
}

export class NeonApprovalStore implements ApprovalStore {
  private readonly fallback: PersistentApprovalStore;

  constructor(fallback?: PersistentApprovalStore) {
    this.fallback = fallback ?? new PersistentApprovalStore();
  }

  async getById(approvalId: string): Promise<ApprovalRequest | null> {
    if (!isNeonConfigured()) {
      warnFallback();
      return this.fallback.getById(approvalId);
    }
    const result = await executeNeonSql<ApprovalRow>(
      `SELECT * FROM approvals WHERE approval_id = $1`,
      [approvalId],
    );
    if (!result.ok || !result.data || result.data.length === 0) return null;
    return rowToRequest(result.data[0]!);
  }

  async save(request: ApprovalRequest): Promise<void> {
    if (!isNeonConfigured()) {
      warnFallback();
      await this.fallback.save(request);
      return;
    }
    const result = await executeNeonSql<ApprovalRow>(
      `INSERT INTO approvals (
         approval_id, requested_at, expires_at, requested_by_agent_id,
         permission_level, action_category, risk, reason,
         target, command, client_id, environment,
         status, approved_by, approval_channel, audit_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (approval_id) DO UPDATE SET
         expires_at = EXCLUDED.expires_at,
         status = EXCLUDED.status,
         approved_by = EXCLUDED.approved_by,
         approval_channel = EXCLUDED.approval_channel,
         audit_id = EXCLUDED.audit_id,
         reason = EXCLUDED.reason`,
      [
        request.approvalId,
        request.requestedAt,
        request.expiresAt,
        request.requestedByAgentId,
        request.permissionLevel,
        request.actionCategory,
        request.risk,
        request.reason,
        request.target,
        request.command,
        request.clientId,
        request.environment,
        request.status,
        request.approvedBy,
        request.approvalChannel,
        request.auditId,
      ],
    );
    if (!result.ok) {
      console.warn(`${TAG} save failed (${result.error}); approval not persisted`);
    }
  }

  async updateStatus(
    approvalId: string,
    status: ApprovalState,
  ): Promise<ApprovalRequest | null> {
    if (!isNeonConfigured()) {
      warnFallback();
      return this.fallback.updateStatus(approvalId, status);
    }
    const result = await executeNeonSql<ApprovalRow>(
      `UPDATE approvals SET status = $1 WHERE approval_id = $2 RETURNING *`,
      [status, approvalId],
    );
    if (!result.ok || !result.data || result.data.length === 0) return null;
    return rowToRequest(result.data[0]!);
  }

  async list(): Promise<ApprovalRequest[]> {
    if (!isNeonConfigured()) {
      warnFallback();
      return this.fallback.list();
    }
    const result = await executeNeonSql<ApprovalRow>(`SELECT * FROM approvals`, []);
    if (!result.ok || !result.data) return [];
    return result.data.map(rowToRequest);
  }

  async listByStatus(status: ApprovalState): Promise<ApprovalRequest[]> {
    if (!isNeonConfigured()) {
      warnFallback();
      return this.fallback.listByStatus(status);
    }
    const result = await executeNeonSql<ApprovalRow>(
      `SELECT * FROM approvals WHERE status = $1`,
      [status],
    );
    if (!result.ok || !result.data) return [];
    return result.data.map(rowToRequest);
  }
}

export function createApprovalStore(): ApprovalStore {
  return new NeonApprovalStore();
}
