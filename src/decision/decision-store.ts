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
  CeraCycle,
  DecisionAuditEvent,
  MapEvaluation,
} from "./decision-types.js";

const DECISION_DIR = join(process.cwd(), "runtime", "decision");
const EVALUATIONS_PATH = join(DECISION_DIR, "map-evaluations.json");
const CYCLES_PATH = join(DECISION_DIR, "cera-cycles.json");
const AUDIT_PATH = join(DECISION_DIR, "decision-audit.jsonl");

function ensureDir(): void {
  if (!existsSync(DECISION_DIR)) mkdirSync(DECISION_DIR, { recursive: true });
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

// ── Evaluations ───────────────────────────────────────────────────────────

export function saveEvaluation(evaluation: MapEvaluation): MapEvaluation {
  const records = readJsonArray<MapEvaluation>(EVALUATIONS_PATH);
  const idx = records.findIndex((r) => r.evaluationId === evaluation.evaluationId);
  if (idx >= 0) {
    records[idx] = evaluation;
  } else {
    records.push(evaluation);
  }
  writeJsonArray(EVALUATIONS_PATH, records);
  return evaluation;
}

export function getEvaluation(evaluationId: string): MapEvaluation | undefined {
  return readJsonArray<MapEvaluation>(EVALUATIONS_PATH).find(
    (r) => r.evaluationId === evaluationId,
  );
}

export function listEvaluations(filter?: {
  tenantId?: string;
  category?: MapEvaluation["category"];
  decision?: MapEvaluation["decision"];
  limit?: number;
}): MapEvaluation[] {
  let records = readJsonArray<MapEvaluation>(EVALUATIONS_PATH);
  if (filter?.tenantId !== undefined) {
    records = records.filter((r) => r.tenantId === filter.tenantId);
  }
  if (filter?.category !== undefined) {
    records = records.filter((r) => r.category === filter.category);
  }
  if (filter?.decision !== undefined) {
    records = records.filter((r) => r.decision === filter.decision);
  }
  records = records.slice().reverse();
  if (filter?.limit !== undefined) records = records.slice(0, filter.limit);
  return records;
}

// ── Cycles ────────────────────────────────────────────────────────────────

export function saveCycle(cycle: CeraCycle): CeraCycle {
  const records = readJsonArray<CeraCycle>(CYCLES_PATH);
  const idx = records.findIndex((r) => r.cycleId === cycle.cycleId);
  if (idx >= 0) {
    records[idx] = cycle;
  } else {
    records.push(cycle);
  }
  writeJsonArray(CYCLES_PATH, records);
  return cycle;
}

export function getCycle(cycleId: string): CeraCycle | undefined {
  return readJsonArray<CeraCycle>(CYCLES_PATH).find((r) => r.cycleId === cycleId);
}

export function listCycles(filter?: {
  tenantId?: string;
  evaluationId?: string;
  decisionPath?: CeraCycle["decisionPath"];
  limit?: number;
}): CeraCycle[] {
  let records = readJsonArray<CeraCycle>(CYCLES_PATH);
  if (filter?.tenantId !== undefined) {
    records = records.filter((r) => r.tenantId === filter.tenantId);
  }
  if (filter?.evaluationId !== undefined) {
    records = records.filter((r) => r.evaluationId === filter.evaluationId);
  }
  if (filter?.decisionPath !== undefined) {
    records = records.filter((r) => r.decisionPath === filter.decisionPath);
  }
  records = records.slice().reverse();
  if (filter?.limit !== undefined) records = records.slice(0, filter.limit);
  return records;
}

// ── Audit Events ──────────────────────────────────────────────────────────

export function appendDecisionAuditEvent(
  event: Omit<DecisionAuditEvent, "eventId" | "timestamp"> & {
    eventId?: string;
    timestamp?: string;
  },
): DecisionAuditEvent {
  ensureDir();
  const full: DecisionAuditEvent = {
    eventId: event.eventId ?? randomUUID(),
    event: event.event,
    timestamp: event.timestamp ?? new Date().toISOString(),
    payload: event.payload,
    ...(event.evaluationId !== undefined ? { evaluationId: event.evaluationId } : {}),
    ...(event.cycleId !== undefined ? { cycleId: event.cycleId } : {}),
    ...(event.actorId !== undefined ? { actorId: event.actorId } : {}),
    ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
  };
  try {
    appendFileSync(AUDIT_PATH, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // audit is best-effort
  }
  return full;
}

export function getDecisionAuditEvents(filter?: {
  evaluationId?: string;
  cycleId?: string;
  event?: string;
  limit?: number;
}): DecisionAuditEvent[] {
  ensureDir();
  if (!existsSync(AUDIT_PATH)) return [];
  let events: DecisionAuditEvent[] = [];
  try {
    events = readFileSync(AUDIT_PATH, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DecisionAuditEvent);
  } catch {
    events = [];
  }

  if (filter?.evaluationId !== undefined) {
    events = events.filter((e) => e.evaluationId === filter.evaluationId);
  }
  if (filter?.cycleId !== undefined) {
    events = events.filter((e) => e.cycleId === filter.cycleId);
  }
  if (filter?.event !== undefined) {
    events = events.filter((e) => e.event === filter.event);
  }
  events = events.slice().reverse();
  if (filter?.limit !== undefined) events = events.slice(0, filter.limit);
  return events;
}

export const DECISION_PATHS = {
  evaluationsFile: EVALUATIONS_PATH,
  cyclesFile: CYCLES_PATH,
  auditFile: AUDIT_PATH,
  baseDir: DECISION_DIR,
} as const;
