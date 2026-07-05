import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolveRuntimePath } from "../core/runtime-paths.js";
import type { BelExecutionPlan, BelRuntimeState } from "./bel-types.js";

// Resolved lazily so AJ_RUNTIME_DIR overrides (tests, smoke CLI) apply
// regardless of module import order.
function stateFile(): string {
  return resolveRuntimePath("bel-state.json");
}

function tempFile(): string {
  return resolveRuntimePath("bel-state.json.tmp");
}

function ensureDir(): void {
  const dir = resolveRuntimePath();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadState(): BelRuntimeState {
  ensureDir();
  if (!existsSync(stateFile())) {
    return {
      activePlans: {},
      completedPlanIds: [],
      failedPlanIds: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  try {
    return JSON.parse(readFileSync(stateFile(), "utf-8")) as BelRuntimeState;
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
  const temp = tempFile();
  const target = stateFile();
  writeFileSync(temp, JSON.stringify(updated, null, 2), "utf-8");
  try {
    renameSync(temp, target);
  } catch {
    writeFileSync(target, JSON.stringify(updated, null, 2), "utf-8");
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
