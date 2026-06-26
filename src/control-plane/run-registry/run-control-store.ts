import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolveRuntimePath } from "../../core/runtime-paths.js";
import type { ControlRunRecord, RunControlState } from "./run-control-types.js";
import { VALID_TRANSITIONS } from "./run-control-types.js";

function storePath(): string {
  return resolveRuntimePath("control-runs.json");
}

function ensureDir(): void {
  const dir = resolveRuntimePath();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadRecords(): ControlRunRecord[] {
  ensureDir();
  const path = storePath();
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ControlRunRecord[];
  } catch {
    return [];
  }
}

function saveRecords(records: ControlRunRecord[]): void {
  ensureDir();
  writeFileSync(storePath(), JSON.stringify(records, null, 2), "utf-8");
}

export function createControlRun(runId: string, agentId: string): ControlRunRecord {
  const records = loadRecords();
  const now = new Date().toISOString();
  const record: ControlRunRecord = {
    runId,
    agentId,
    controlState: "queued",
    createdAt: now,
    updatedAt: now,
  };
  records.push(record);
  saveRecords(records);
  return record;
}

export function getControlRun(runId: string): ControlRunRecord | undefined {
  return loadRecords().find((r) => r.runId === runId);
}

export function updateControlState(
  runId: string,
  newState: RunControlState,
  meta?: Record<string, unknown>,
): ControlRunRecord {
  const records = loadRecords();
  const idx = records.findIndex((r) => r.runId === runId);
  if (idx === -1) throw new Error(`Run not found: ${runId}`);

  const record = records[idx]!;
  const updated: ControlRunRecord = {
    runId: record.runId,
    agentId: record.agentId,
    controlState: newState,
    previousState: record.controlState,
    createdAt: record.createdAt,
    updatedAt: new Date().toISOString(),
    ...(meta?.["approvedBy"] !== undefined ? { approvedBy: String(meta["approvedBy"]) } : {}),
    ...(meta?.["cancelledBy"] !== undefined ? { cancelledBy: String(meta["cancelledBy"]) } : {}),
    ...(meta !== undefined ? { metadata: { ...record.metadata, ...meta } } : {}),
  };
  records[idx] = updated;
  saveRecords(records);
  return updated;
}

export function listControlRuns(filter?: {
  agentId?: string;
  state?: RunControlState;
  limit?: number;
}): ControlRunRecord[] {
  let records = loadRecords();
  if (filter?.agentId !== undefined) records = records.filter((r) => r.agentId === filter.agentId);
  if (filter?.state !== undefined) records = records.filter((r) => r.controlState === filter.state);
  records = records.slice().reverse();
  if (filter?.limit !== undefined) records = records.slice(0, filter.limit);
  return records;
}

export function isValidTransition(from: RunControlState, to: RunControlState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
