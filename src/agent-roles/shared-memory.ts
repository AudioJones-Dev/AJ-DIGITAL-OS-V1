import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { MissionState, MissionAlert, MissionRole } from "./mission-types.js";

// ── Shared Memory Layout ───────────────────────────────────────────
//
// data/memory/missions/{missionId}/state.json    — full MissionState snapshot
// data/memory/missions/{missionId}/plan.json     — architect output
// data/memory/missions/{missionId}/execution.json— operator output
// data/memory/missions/{missionId}/validation.json — auditor output
// data/memory/missions/{missionId}/alerts.json   — sentinel alerts
// data/memory/shared/decisions.jsonl              — append-only decision log
// data/memory/shared/failures.jsonl               — append-only failure log
// data/memory/shared/patterns.jsonl               — append-only pattern log
//

const DEFAULT_ROOT = path.resolve("data", "memory");

export interface SharedMemoryConfig {
  root: string;
}

const DEFAULT_CONFIG: SharedMemoryConfig = { root: DEFAULT_ROOT };

// ── Mission Memory Writer ──────────────────────────────────────────

/**
 * Persist the full MissionState to the mission's memory folder.
 * Returns the directory path.
 */
export async function writeMissionState(
  state: MissionState,
  config?: Partial<SharedMemoryConfig>,
): Promise<string> {
  const root = config?.root ?? DEFAULT_CONFIG.root;
  const dir = path.join(root, "missions", state.missionId);
  await ensureDir(dir);

  await writeFile(path.join(dir, "state.json"), toJSON(state), "utf-8");

  if (state.plan !== null && state.plan !== undefined) {
    await writeFile(path.join(dir, "plan.json"), toJSON(state.plan), "utf-8");
  }
  if (state.executionOutput !== null && state.executionOutput !== undefined) {
    await writeFile(path.join(dir, "execution.json"), toJSON(state.executionOutput), "utf-8");
  }
  if (state.validationResult !== null && state.validationResult !== undefined) {
    await writeFile(path.join(dir, "validation.json"), toJSON(state.validationResult), "utf-8");
  }
  if (state.alerts.length > 0) {
    await writeFile(path.join(dir, "alerts.json"), toJSON(state.alerts), "utf-8");
  }

  return dir;
}

/**
 * Read a previously persisted MissionState.
 * Returns null if not found.
 */
export async function readMissionState(
  missionId: string,
  config?: Partial<SharedMemoryConfig>,
): Promise<MissionState | null> {
  const root = config?.root ?? DEFAULT_CONFIG.root;
  const filePath = path.join(root, "missions", missionId, "state.json");
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as MissionState;
  } catch {
    return null;
  }
}

/**
 * List all persisted mission IDs.
 */
export async function listMissions(
  config?: Partial<SharedMemoryConfig>,
): Promise<string[]> {
  const root = config?.root ?? DEFAULT_CONFIG.root;
  const dir = path.join(root, "missions");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

// ── Shared Append-Only Logs ────────────────────────────────────────

export interface SharedLogEntry {
  timestamp: string;
  missionId: string;
  role: MissionRole;
  type: "decision" | "failure" | "pattern";
  content: string;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Append a decision, failure, or pattern to the shared log.
 */
export async function appendSharedLog(
  entry: SharedLogEntry,
  config?: Partial<SharedMemoryConfig>,
): Promise<void> {
  const root = config?.root ?? DEFAULT_CONFIG.root;
  const dir = path.join(root, "shared");
  await ensureDir(dir);

  const filename = `${entry.type}s.jsonl`;
  const filePath = path.join(dir, filename);
  const line = JSON.stringify(entry) + "\n";

  const { appendFile } = await import("node:fs/promises");
  await appendFile(filePath, line, "utf-8");
}

/**
 * Read all entries from a shared log file.
 */
export async function readSharedLog(
  type: SharedLogEntry["type"],
  config?: Partial<SharedMemoryConfig>,
): Promise<SharedLogEntry[]> {
  const root = config?.root ?? DEFAULT_CONFIG.root;
  const filePath = path.join(root, "shared", `${type}s.jsonl`);
  try {
    const content = await readFile(filePath, "utf-8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as SharedLogEntry);
  } catch {
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function toJSON(data: unknown): string {
  return JSON.stringify(data, null, 2) + "\n";
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}
