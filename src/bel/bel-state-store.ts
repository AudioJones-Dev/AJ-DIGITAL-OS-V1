import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { BelExecutionPlan, BelRuntimeState } from "./bel-types.js";

const RUNTIME_DIR = join(process.cwd(), "runtime");
const STATE_FILE = join(RUNTIME_DIR, "bel-state.json");
const TEMP_FILE = join(RUNTIME_DIR, "bel-state.json.tmp");

function ensureDir(): void {
  if (!existsSync(RUNTIME_DIR)) {
    mkdirSync(RUNTIME_DIR, { recursive: true });
  }
}

export function loadState(): BelRuntimeState {
  ensureDir();
  if (!existsSync(STATE_FILE)) {
    return {
      activePlans: {},
      completedPlanIds: [],
      failedPlanIds: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as BelRuntimeState;
  } catch {
    return {
      activePlans: {},
      completedPlanIds: [],
      failedPlanIds: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export function saveState(state: BelRuntimeState): void {
  ensureDir();
  const updated = { ...state, lastUpdated: new Date().toISOString() };
  writeFileSync(TEMP_FILE, JSON.stringify(updated, null, 2), "utf-8");
  try {
    renameSync(TEMP_FILE, STATE_FILE);
  } catch {
    writeFileSync(STATE_FILE, JSON.stringify(updated, null, 2), "utf-8");
  }
}

export function addActivePlan(plan: BelExecutionPlan): void {
  const state = loadState();
  state.activePlans[plan.planId] = plan;
  saveState(state);
}

export function completePlan(planId: string): void {
  const state = loadState();
  delete state.activePlans[planId];
  if (!state.completedPlanIds.includes(planId)) {
    state.completedPlanIds.push(planId);
  }
  saveState(state);
}

export function failPlan(planId: string): void {
  const state = loadState();
  delete state.activePlans[planId];
  if (!state.failedPlanIds.includes(planId)) {
    state.failedPlanIds.push(planId);
  }
  saveState(state);
}
