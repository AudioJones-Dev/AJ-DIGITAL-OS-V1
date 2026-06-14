/**
 * G2 — Cost ledger (file-backed, append-only JSONL under runtime/cost/).
 *
 * One line per metered spend event. Per-run and per-tenant USD totals are
 * reconstructed from the ledger — local-first, no DB.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CostEvent, CostSummary } from "./cost-types.js";

const COST_DIR = join(process.cwd(), "runtime", "cost");
const EVENTS_PATH = join(COST_DIR, "cost-events.jsonl");

function ensureDir(): void {
  if (!existsSync(COST_DIR)) mkdirSync(COST_DIR, { recursive: true });
}

export function appendCostEvent(event: CostEvent): CostEvent {
  ensureDir();
  appendFileSync(EVENTS_PATH, JSON.stringify(event) + "\n", "utf-8");
  return event;
}

function readAll(): CostEvent[] {
  ensureDir();
  if (!existsSync(EVENTS_PATH)) return [];
  try {
    return readFileSync(EVENTS_PATH, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CostEvent);
  } catch {
    return [];
  }
}

export function listCostEvents(filter?: {
  runId?: string;
  tenantId?: string;
  limit?: number;
}): CostEvent[] {
  let events = readAll();
  if (filter?.runId !== undefined) events = events.filter((e) => e.runId === filter.runId);
  if (filter?.tenantId !== undefined) events = events.filter((e) => e.tenantId === filter.tenantId);
  events = events.slice().reverse();
  if (filter?.limit !== undefined) events = events.slice(0, filter.limit);
  return events;
}

function summarize(events: CostEvent[]): CostSummary {
  return events.reduce<CostSummary>(
    (acc, e) => ({
      totalUsd: Number((acc.totalUsd + e.costUsd).toFixed(6)),
      totalTokens: acc.totalTokens + e.totalTokens,
      eventCount: acc.eventCount + 1,
    }),
    { totalUsd: 0, totalTokens: 0, eventCount: 0 },
  );
}

export function summarizeByRun(runId: string): CostSummary {
  return summarize(readAll().filter((e) => e.runId === runId));
}

export function summarizeByTenant(tenantId: string): CostSummary {
  return summarize(readAll().filter((e) => e.tenantId === tenantId));
}

export function resetCostLedger(): void {
  ensureDir();
  writeFileSync(EVENTS_PATH, "", "utf-8");
}

export const COST_PATHS = { baseDir: COST_DIR, eventsFile: EVENTS_PATH } as const;
