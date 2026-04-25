import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ControlRunRecord, RunControlState } from "./run-control-types.js";
import { isValidTransition } from "./run-control-types.js";

const PERSIST_PATH = join(process.cwd(), "runtime", "control-runs.json");

const store = new Map<string, ControlRunRecord>();

function persistStore(): void {
  try {
    mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
    writeFileSync(PERSIST_PATH, JSON.stringify(Array.from(store.values()), null, 2), "utf-8");
  } catch {
    // best-effort persistence
  }
}

function loadStore(): void {
  try {
    const raw = readFileSync(PERSIST_PATH, "utf-8");
    const records = JSON.parse(raw) as ControlRunRecord[];
    for (const record of records) {
      store.set(record.runId, record);
    }
  } catch {
    // first run or file missing
  }
}

loadStore();

export function createControlRun(runId: string, agentId: string): ControlRunRecord {
  const now = new Date().toISOString();
  const record: ControlRunRecord = {
    runId,
    agentId,
    controlState: "queued",
    createdAt: now,
    updatedAt: now,
  };
  store.set(runId, record);
  persistStore();
  return record;
}

export function getControlRun(runId: string): ControlRunRecord | undefined {
  return store.get(runId);
}

export function updateControlState(
  runId: string,
  newState: RunControlState,
  meta?: Record<string, unknown>,
): ControlRunRecord {
  const record = store.get(runId);
  if (!record) throw new Error(`Run not found: ${runId}`);
  if (!isValidTransition(record.controlState, newState)) {
    throw new Error(`Invalid state transition: ${record.controlState} → ${newState}`);
  }
  const updated: ControlRunRecord = {
    ...record,
    previousState: record.controlState,
    controlState: newState,
    updatedAt: new Date().toISOString(),
    ...(meta ? { metadata: { ...record.metadata, ...meta } } : {}),
  };
  store.set(runId, updated);
  persistStore();
  return updated;
}

export function listControlRuns(filter?: {
  agentId?: string;
  state?: RunControlState;
  limit?: number;
}): ControlRunRecord[] {
  let results = Array.from(store.values());
  if (filter?.agentId) results = results.filter((r) => r.agentId === filter.agentId);
  if (filter?.state) results = results.filter((r) => r.controlState === filter.state);
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filter?.limit) results = results.slice(0, filter.limit);
  return results;
}
