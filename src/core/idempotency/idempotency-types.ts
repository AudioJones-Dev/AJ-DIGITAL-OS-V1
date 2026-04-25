/**
 * Operating Core — Idempotency Layer v1 types
 */

export type IdempotencyStatus = "started" | "completed" | "failed";

export interface IdempotencyRecord {
  idempotencyKey: string;
  commandHash: string;
  tenantId?: string;
  actorId?: string;
  action: string;
  status: IdempotencyStatus;
  resultRef?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export type IdempotencyCheckStatus = "hit" | "conflict" | "miss" | "expired";

export interface IdempotencyCheckResult {
  status: IdempotencyCheckStatus;
  record?: IdempotencyRecord;
}

export interface IdempotencyStartOptions {
  tenantId?: string;
  actorId?: string;
  ttlSeconds?: number;
}
