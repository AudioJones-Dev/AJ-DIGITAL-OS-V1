/**
 * Operating Core — Idempotency Layer v1
 *
 * File-backed JSON map of idempotency-key → record. Used by the command
 * executor to short-circuit duplicate command submissions and to detect
 * conflicting payloads with the same key.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

import { incrementMetric } from "../observability/metrics-store.js";
import type {
  IdempotencyCheckResult,
  IdempotencyRecord,
  IdempotencyStartOptions,
} from "./idempotency-types.js";

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export function idempotencyStorePath(): string {
  return join(process.cwd(), "runtime", "idempotency", "idempotency-records.json");
}

function ensureFile(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) writeFileSync(path, "{}", "utf-8");
}

function readAll(): Record<string, IdempotencyRecord> {
  const path = idempotencyStorePath();
  ensureFile(path);
  try {
    const raw = readFileSync(path, "utf-8");
    if (raw.trim().length === 0) return {};
    return JSON.parse(raw) as Record<string, IdempotencyRecord>;
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, IdempotencyRecord>): void {
  const path = idempotencyStorePath();
  ensureFile(path);
  writeFileSync(path, JSON.stringify(records, null, 2), "utf-8");
}

function isExpired(record: IdempotencyRecord): boolean {
  return Date.now() > Date.parse(record.expiresAt);
}

export function checkIdempotency(
  key: string,
  commandHash: string,
): IdempotencyCheckResult {
  const records = readAll();
  const record = records[key];
  if (!record) return { status: "miss" };
  if (isExpired(record)) return { status: "expired", record };
  if (record.commandHash !== commandHash) {
    try {
      incrementMetric("idempotency_conflict_count");
    } catch {
      // best-effort
    }
    return { status: "conflict", record };
  }
  if (record.status === "completed") {
    try {
      incrementMetric("idempotency_hit_count");
    } catch {
      // best-effort
    }
    return { status: "hit", record };
  }
  // Same key, same hash, still in flight — treat as hit so caller waits / dedups.
  return { status: "hit", record };
}

export function recordCommandStart(
  key: string,
  commandHash: string,
  action: string,
  options: IdempotencyStartOptions = {},
): IdempotencyRecord {
  const records = readAll();
  const now = new Date().toISOString();
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const record: IdempotencyRecord = {
    idempotencyKey: key,
    commandHash,
    action,
    status: "started",
    createdAt: now,
    updatedAt: now,
    expiresAt,
    ...(options.tenantId !== undefined ? { tenantId: options.tenantId } : {}),
    ...(options.actorId !== undefined ? { actorId: options.actorId } : {}),
  };

  records[key] = record;
  writeAll(records);
  return record;
}

export function recordCommandSuccess(key: string, resultRef?: string): IdempotencyRecord {
  const records = readAll();
  const existing = records[key];
  if (!existing) {
    throw new Error(`No idempotency record for key: ${key}`);
  }
  const updated: IdempotencyRecord = {
    ...existing,
    status: "completed",
    updatedAt: new Date().toISOString(),
    ...(resultRef !== undefined ? { resultRef } : {}),
  };
  records[key] = updated;
  writeAll(records);
  return updated;
}

export function recordCommandFailure(key: string): IdempotencyRecord {
  const records = readAll();
  const existing = records[key];
  if (!existing) {
    throw new Error(`No idempotency record for key: ${key}`);
  }
  const updated: IdempotencyRecord = {
    ...existing,
    status: "failed",
    updatedAt: new Date().toISOString(),
  };
  records[key] = updated;
  writeAll(records);
  return updated;
}

export function purgeExpiredIdempotencyRecords(): number {
  const records = readAll();
  let purged = 0;
  for (const [key, record] of Object.entries(records)) {
    if (isExpired(record)) {
      delete records[key];
      purged++;
    }
  }
  if (purged > 0) writeAll(records);
  return purged;
}

export function getIdempotencyRecord(key: string): IdempotencyRecord | undefined {
  return readAll()[key];
}

/**
 * Reset the idempotency store — used by tests.
 */
export function resetIdempotencyStore(): void {
  writeAll({});
}
