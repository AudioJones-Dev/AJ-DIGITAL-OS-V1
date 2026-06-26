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

import { resolveRuntimePath } from "../../core/runtime-paths.js";
import type {
  BelDagAuditEvent,
  BelDagNodeOutput,
  BelDagRunState,
} from "./dag-types.js";

function dagDir(): string {
  return resolveRuntimePath("dag");
}

function runsFile(): string {
  return join(dagDir(), "dag-runs.json");
}

function auditFile(): string {
  return join(dagDir(), "dag-audit.jsonl");
}

function outputsFile(): string {
  return join(dagDir(), "dag-node-outputs.json");
}

function ensureDir(): void {
  const dir = dagDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
  const runs = readJsonArray<BelDagRunState>(runsFile());
  const idx = runs.findIndex((r) => r.runId === state.runId);
  const updated: BelDagRunState = { ...state, updatedAt: new Date().toISOString() };
  if (idx >= 0) runs[idx] = updated;
  else runs.push(updated);
  writeJsonArray(runsFile(), runs);
}

export function getDagRun(runId: string): BelDagRunState | undefined {
  ensureDir();
  return readJsonArray<BelDagRunState>(runsFile()).find((r) => r.runId === runId);
}

export function listDagRuns(filter?: {
  status?: BelDagRunState["status"];
  tenantId?: string;
  limit?: number;
}): BelDagRunState[] {
  ensureDir();
  let runs = readJsonArray<BelDagRunState>(runsFile());
  if (filter?.status !== undefined) runs = runs.filter((r) => r.status === filter.status);
  if (filter?.tenantId !== undefined) runs = runs.filter((r) => r.tenantId === filter.tenantId);
  runs = runs.slice().reverse();
  if (filter?.limit !== undefined) runs = runs.slice(0, filter.limit);
  return runs;
}

// ── Audit ─────────────────────────────────────────────────────────────

export function appendDagAuditEvent(event: BelDagAuditEvent): void {
  ensureDir();
  appendFileSync(auditFile(), JSON.stringify(event) + "\n", "utf-8");
}

export function getDagAuditEvents(filter?: {
  runId?: string;
  dagId?: string;
  nodeId?: string;
  limit?: number;
}): BelDagAuditEvent[] {
  ensureDir();
  const path = auditFile();
  if (!existsSync(path)) return [];
  let events: BelDagAuditEvent[] = [];
  try {
    events = readFileSync(path, "utf-8")
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
  const outputs = readJsonArray<BelDagNodeOutput>(outputsFile());
  const idx = outputs.findIndex(
    (o) => o.runId === output.runId && o.nodeId === output.nodeId,
  );
  if (idx >= 0) outputs[idx] = output;
  else outputs.push(output);
  writeJsonArray(outputsFile(), outputs);
}

export function getNodeOutputs(filter?: {
  runId?: string;
  dagId?: string;
  nodeId?: string;
}): BelDagNodeOutput[] {
  ensureDir();
  let outputs = readJsonArray<BelDagNodeOutput>(outputsFile());
  if (filter?.runId !== undefined) outputs = outputs.filter((o) => o.runId === filter.runId);
  if (filter?.dagId !== undefined) outputs = outputs.filter((o) => o.dagId === filter.dagId);
  if (filter?.nodeId !== undefined) outputs = outputs.filter((o) => o.nodeId === filter.nodeId);
  return outputs;
}
