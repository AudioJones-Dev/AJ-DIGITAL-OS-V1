/**
 * BEL v4 DAG — file-backed persistence.
 *
 * Mirrors the BEL v3 store layout — JSON for run state and node outputs,
 * JSONL for the append-only audit trail.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type {
  BelDagAuditEvent,
  BelDagNodeOutput,
  BelDagRunState,
} from "./dag-types.js";

const DAG_DIR = join(process.cwd(), "runtime", "dag");
const RUNS_FILE = join(DAG_DIR, "dag-runs.json");
const AUDIT_FILE = join(DAG_DIR, "dag-audit.jsonl");
const OUTPUTS_FILE = join(DAG_DIR, "dag-node-outputs.json");

function ensureDir(): void {
  if (!existsSync(DAG_DIR)) mkdirSync(DAG_DIR, { recursive: true });
}

function readJsonArray<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(path: string, data: T[]): void {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

// ── Runs ──────────────────────────────────────────────────────────────

export function saveDagRun(state: BelDagRunState): void {
  ensureDir();
  const runs = readJsonArray<BelDagRunState>(RUNS_FILE);
  const idx = runs.findIndex((r) => r.runId === state.runId);
  const updated: BelDagRunState = { ...state, updatedAt: new Date().toISOString() };
  if (idx >= 0) runs[idx] = updated;
  else runs.push(updated);
  writeJsonArray(RUNS_FILE, runs);
}

export function getDagRun(runId: string): BelDagRunState | undefined {
  ensureDir();
  return readJsonArray<BelDagRunState>(RUNS_FILE).find((r) => r.runId === runId);
}

export function listDagRuns(filter?: {
  status?: BelDagRunState["status"];
  tenantId?: string;
  limit?: number;
}): BelDagRunState[] {
  ensureDir();
  let runs = readJsonArray<BelDagRunState>(RUNS_FILE);
  if (filter?.status !== undefined) runs = runs.filter((r) => r.status === filter.status);
  if (filter?.tenantId !== undefined) runs = runs.filter((r) => r.tenantId === filter.tenantId);
  runs = runs.slice().reverse();
  if (filter?.limit !== undefined) runs = runs.slice(0, filter.limit);
  return runs;
}

// ── Audit ─────────────────────────────────────────────────────────────

export function appendDagAuditEvent(event: BelDagAuditEvent): void {
  ensureDir();
  appendFileSync(AUDIT_FILE, JSON.stringify(event) + "\n", "utf-8");
}

export function getDagAuditEvents(filter?: {
  runId?: string;
  dagId?: string;
  nodeId?: string;
  limit?: number;
}): BelDagAuditEvent[] {
  ensureDir();
  if (!existsSync(AUDIT_FILE)) return [];
  let events: BelDagAuditEvent[] = [];
  try {
    events = readFileSync(AUDIT_FILE, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as BelDagAuditEvent);
  } catch {
    return [];
  }

  if (filter?.runId !== undefined) events = events.filter((e) => e.runId === filter.runId);
  if (filter?.dagId !== undefined) events = events.filter((e) => e.dagId === filter.dagId);
  if (filter?.nodeId !== undefined) events = events.filter((e) => e.nodeId === filter.nodeId);
  events = events.slice().reverse();
  if (filter?.limit !== undefined) events = events.slice(0, filter.limit);
  return events;
}

// ── Node Outputs ──────────────────────────────────────────────────────

export function saveNodeOutput(output: BelDagNodeOutput): void {
  ensureDir();
  const outputs = readJsonArray<BelDagNodeOutput>(OUTPUTS_FILE);
  const idx = outputs.findIndex(
    (o) => o.runId === output.runId && o.nodeId === output.nodeId,
  );
  if (idx >= 0) outputs[idx] = output;
  else outputs.push(output);
  writeJsonArray(OUTPUTS_FILE, outputs);
}

export function getNodeOutputs(filter?: {
  runId?: string;
  dagId?: string;
  nodeId?: string;
}): BelDagNodeOutput[] {
  ensureDir();
  let outputs = readJsonArray<BelDagNodeOutput>(OUTPUTS_FILE);
  if (filter?.runId !== undefined) outputs = outputs.filter((o) => o.runId === filter.runId);
  if (filter?.dagId !== undefined) outputs = outputs.filter((o) => o.dagId === filter.dagId);
  if (filter?.nodeId !== undefined) outputs = outputs.filter((o) => o.nodeId === filter.nodeId);
  return outputs;
}
