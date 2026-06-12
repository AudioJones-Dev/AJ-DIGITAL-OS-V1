/**
 * L5 — Normalization store.
 *
 * File-backed persistence for normalized entities. One JSON file per
 * entity type (atomic-ish overwrite) plus an append-only audit log.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type {
  NormalizationAuditEvent,
  NormalizationAuditEventType,
  NormalizedEntity,
  NormalizedEntityMap,
  NormalizedEntityType,
} from "./normalization-types.js";

const NORMALIZATION_DIR = join(process.cwd(), "runtime", "normalization");
const AUDIT_PATH = join(NORMALIZATION_DIR, "normalization-audit.jsonl");

function entityFile(entityType: NormalizedEntityType): string {
  return join(NORMALIZATION_DIR, `${entityType}.json`);
}

function ensureDir(): void {
  if (!existsSync(NORMALIZATION_DIR)) mkdirSync(NORMALIZATION_DIR, { recursive: true });
}

function readJsonArray<T>(path: string): T[] {
  ensureDir();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(path: string, records: T[]): void {
  ensureDir();
  writeFileSync(path, JSON.stringify(records, null, 2), "utf-8");
}

// ── Entities ──────────────────────────────────────────────────────────────

export function saveEntity<T extends NormalizedEntityType>(
  entityType: T,
  entity: NormalizedEntityMap[T],
): NormalizedEntityMap[T] {
  const path = entityFile(entityType);
  const records = readJsonArray<NormalizedEntityMap[T]>(path);
  const idx = records.findIndex((r) => r.entityId === entity.entityId);
  if (idx >= 0) {
    records[idx] = entity;
  } else {
    records.push(entity);
  }
  writeJsonArray(path, records);
  return entity;
}

export function getEntity<T extends NormalizedEntityType>(
  entityType: T,
  entityId: string,
): NormalizedEntityMap[T] | undefined {
  return readJsonArray<NormalizedEntityMap[T]>(entityFile(entityType)).find(
    (r) => r.entityId === entityId,
  );
}

export function listEntities<T extends NormalizedEntityType>(
  entityType: T,
  filter?: { tenantId?: string; limit?: number },
): NormalizedEntityMap[T][] {
  let records = readJsonArray<NormalizedEntityMap[T]>(entityFile(entityType));
  if (filter?.tenantId !== undefined) {
    records = records.filter((r) => (r as NormalizedEntity).tenantId === filter.tenantId);
  }
  records = records.slice().reverse();
  if (filter?.limit !== undefined) records = records.slice(0, filter.limit);
  return records;
}

// ── Audit ─────────────────────────────────────────────────────────────────

export function appendNormalizationAudit(
  event: Omit<NormalizationAuditEvent, "eventId" | "timestamp"> & {
    eventId?: string;
    timestamp?: string;
  },
): NormalizationAuditEvent {
  ensureDir();
  const full: NormalizationAuditEvent = {
    eventId: event.eventId ?? randomUUID(),
    eventType: event.eventType,
    entityType: event.entityType,
    timestamp: event.timestamp ?? new Date().toISOString(),
    payload: event.payload,
    ...(event.entityId !== undefined ? { entityId: event.entityId } : {}),
    ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
  };
  try {
    appendFileSync(AUDIT_PATH, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // best-effort
  }
  return full;
}

export function getNormalizationAuditEvents(filter?: {
  entityType?: NormalizedEntityType;
  entityId?: string;
  eventType?: NormalizationAuditEventType;
  tenantId?: string;
  limit?: number;
}): NormalizationAuditEvent[] {
  ensureDir();
  if (!existsSync(AUDIT_PATH)) return [];
  let events: NormalizationAuditEvent[] = [];
  try {
    events = readFileSync(AUDIT_PATH, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as NormalizationAuditEvent);
  } catch {
    events = [];
  }

  if (filter?.entityType !== undefined) {
    events = events.filter((e) => e.entityType === filter.entityType);
  }
  if (filter?.entityId !== undefined) {
    events = events.filter((e) => e.entityId === filter.entityId);
  }
  if (filter?.eventType !== undefined) {
    events = events.filter((e) => e.eventType === filter.eventType);
  }
  if (filter?.tenantId !== undefined) {
    events = events.filter((e) => e.tenantId === filter.tenantId);
  }
  events = events.slice().reverse();
  if (filter?.limit !== undefined) events = events.slice(0, filter.limit);
  return events;
}

export const NORMALIZATION_PATHS = {
  baseDir: NORMALIZATION_DIR,
  auditFile: AUDIT_PATH,
  entityFile,
} as const;
