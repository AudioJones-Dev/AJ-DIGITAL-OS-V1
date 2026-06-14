/**
 * L15 Evaluate step — file-backed verdict store.
 *
 * Mirrors src/decision/decision-store.ts: JSON array for verdicts, JSONL for the
 * append-only audit trail, all under runtime/evaluation/. Local-first, no DB.
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

import type { EvalAuditEvent, EvalVerdict } from "./eval-types.js";

const EVAL_DIR = join(process.cwd(), "runtime", "evaluation");
const GOLDEN_DIR = join(EVAL_DIR, "golden");
const VERDICTS_PATH = join(EVAL_DIR, "verdicts.json");
const AUDIT_PATH = join(EVAL_DIR, "eval-audit.jsonl");

function ensureDir(): void {
  if (!existsSync(EVAL_DIR)) mkdirSync(EVAL_DIR, { recursive: true });
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

// ── Verdicts ────────────────────────────────────────────────────────────────

export function saveVerdict(verdict: EvalVerdict): EvalVerdict {
  const records = readJsonArray<EvalVerdict>(VERDICTS_PATH);
  // One current verdict per run — last write wins (mirrors decision-store upsert).
  // Prevents duplicate rows when a run hits a terminal transition more than once.
  const idx = records.findIndex((r) => r.runId === verdict.runId);
  if (idx >= 0) records[idx] = verdict;
  else records.push(verdict);
  writeJsonArray(VERDICTS_PATH, records);
  return verdict;
}

export function getVerdict(verdictId: string): EvalVerdict | undefined {
  return readJsonArray<EvalVerdict>(VERDICTS_PATH).find((r) => r.verdictId === verdictId);
}

export function getVerdictByRunId(runId: string): EvalVerdict | undefined {
  return readJsonArray<EvalVerdict>(VERDICTS_PATH).find((r) => r.runId === runId);
}

export function listVerdicts(filter?: {
  runId?: string;
  engine?: string;
  tenantId?: string;
  outcome?: EvalVerdict["outcome"];
  basis?: EvalVerdict["basis"];
  limit?: number;
}): EvalVerdict[] {
  let records = readJsonArray<EvalVerdict>(VERDICTS_PATH);
  if (filter?.runId !== undefined) records = records.filter((r) => r.runId === filter.runId);
  if (filter?.engine !== undefined) records = records.filter((r) => r.engine === filter.engine);
  if (filter?.tenantId !== undefined) records = records.filter((r) => r.tenantId === filter.tenantId);
  if (filter?.outcome !== undefined) records = records.filter((r) => r.outcome === filter.outcome);
  if (filter?.basis !== undefined) records = records.filter((r) => r.basis === filter.basis);
  records = records.slice().reverse();
  if (filter?.limit !== undefined) records = records.slice(0, filter.limit);
  return records;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export function appendEvalAuditEvent(
  event: Omit<EvalAuditEvent, "eventId" | "timestamp"> & {
    eventId?: string;
    timestamp?: string;
  },
): EvalAuditEvent {
  ensureDir();
  const full: EvalAuditEvent = {
    eventId: event.eventId ?? randomUUID(),
    event: event.event,
    timestamp: event.timestamp ?? new Date().toISOString(),
    payload: event.payload,
    ...(event.verdictId !== undefined ? { verdictId: event.verdictId } : {}),
    ...(event.runId !== undefined ? { runId: event.runId } : {}),
    ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
  };
  try {
    appendFileSync(AUDIT_PATH, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // audit is best-effort
  }
  return full;
}

export function getEvalAuditEvents(filter?: {
  verdictId?: string;
  runId?: string;
  event?: string;
  limit?: number;
}): EvalAuditEvent[] {
  ensureDir();
  if (!existsSync(AUDIT_PATH)) return [];
  let events: EvalAuditEvent[] = [];
  try {
    events = readFileSync(AUDIT_PATH, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as EvalAuditEvent);
  } catch {
    events = [];
  }
  if (filter?.verdictId !== undefined) events = events.filter((e) => e.verdictId === filter.verdictId);
  if (filter?.runId !== undefined) events = events.filter((e) => e.runId === filter.runId);
  if (filter?.event !== undefined) events = events.filter((e) => e.event === filter.event);
  events = events.slice().reverse();
  if (filter?.limit !== undefined) events = events.slice(0, filter.limit);
  return events;
}

export const EVAL_PATHS = {
  baseDir: EVAL_DIR,
  goldenDir: GOLDEN_DIR,
  verdictsFile: VERDICTS_PATH,
  auditFile: AUDIT_PATH,
} as const;
