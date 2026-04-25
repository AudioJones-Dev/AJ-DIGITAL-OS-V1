import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { MissionState, MissionAlert, MissionRole } from "./mission-types.js";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../security/agents/agent-registry.js";
import type { ApprovalContext } from "../security/permissions/approval-gate.js";
import type { PermissionLevel } from "../security/permissions/permission-levels.js";

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
  enforcement?: SharedMemoryEnforcementContext | undefined;
}

export interface SharedMemoryEnforcementContext {
  agentId: string;
  permissionLevel: PermissionLevel;
  clientId?: string | null | undefined;
  approval?: ApprovalContext | undefined;
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
  await ensureDir(dir, config?.enforcement);

  await enforcedWrite(
    path.join(dir, "state.json"),
    toJSON(state),
    config?.enforcement,
  );

  if (state.plan !== null && state.plan !== undefined) {
    await enforcedWrite(
      path.join(dir, "plan.json"),
      toJSON(state.plan),
      config?.enforcement,
    );
  }
  if (state.executionOutput !== null && state.executionOutput !== undefined) {
    await enforcedWrite(
      path.join(dir, "execution.json"),
      toJSON(state.executionOutput),
      config?.enforcement,
    );
  }
  if (state.validationResult !== null && state.validationResult !== undefined) {
    await enforcedWrite(
      path.join(dir, "validation.json"),
      toJSON(state.validationResult),
      config?.enforcement,
    );
  }
  if (state.alerts.length > 0) {
    await enforcedWrite(
      path.join(dir, "alerts.json"),
      toJSON(state.alerts),
      config?.enforcement,
    );
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
  await ensureDir(dir, config?.enforcement);

  const filename = `${entry.type}s.jsonl`;
  const filePath = path.join(dir, filename);
  const line = JSON.stringify(entry) + "\n";

  const { appendFile } = await import("node:fs/promises");
  const context = resolveEnforcement(config?.enforcement);
  try {
    const enforced = await executeWithEnforcement(
      {
        agentId: context.agentId,
        actionType: "write_file",
        target: filePath,
        clientId: context.clientId ?? null,
      },
      {
        permissionLevel: context.permissionLevel,
        ...(context.approval !== undefined ? { approval: context.approval } : {}),
      },
      async () => {
        await appendFile(filePath, line, "utf-8");
        return { ok: true };
      },
    );

    if (enforced.status === "approval_required") {
      throw new Error(`Shared memory append requires approval: ${enforced.enforcement.reason}`);
    }
  } catch (err: unknown) {
    if (err instanceof EnforcementBlockedError) {
      throw new Error(`Shared memory append blocked: ${err.message}`);
    }
    throw err;
  }
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

function resolveEnforcement(
  context: SharedMemoryEnforcementContext | undefined,
): SharedMemoryEnforcementContext {
  const registryContext = resolveAgentContext(context?.agentId ?? "shared-memory");

  return {
    agentId: context?.agentId ?? registryContext.agentId,
    permissionLevel: context?.permissionLevel ?? registryContext.permissionLevel,
    ...(context?.clientId !== undefined ? { clientId: context.clientId } : {}),
    ...(context?.approval !== undefined ? { approval: context.approval } : {}),
  };
}

async function enforcedWrite(
  filePath: string,
  content: string,
  contextInput: SharedMemoryEnforcementContext | undefined,
): Promise<void> {
  const context = resolveEnforcement(contextInput);

  try {
    const enforced = await executeWithEnforcement(
      {
        agentId: context.agentId,
        actionType: "write_file",
        target: filePath,
        clientId: context.clientId ?? null,
      },
      {
        permissionLevel: context.permissionLevel,
        ...(context.approval !== undefined ? { approval: context.approval } : {}),
      },
      async () => {
        await writeFile(filePath, content, "utf-8");
        return { ok: true };
      },
    );

    if (enforced.status === "approval_required") {
      throw new Error(`Shared memory write requires approval: ${enforced.enforcement.reason}`);
    }
  } catch (err: unknown) {
    if (err instanceof EnforcementBlockedError) {
      throw new Error(`Shared memory write blocked: ${err.message}`);
    }
    throw err;
  }
}

async function ensureDir(
  dir: string,
  contextInput: SharedMemoryEnforcementContext | undefined,
): Promise<void> {
  const context = resolveEnforcement(contextInput);

  try {
    const enforced = await executeWithEnforcement(
      {
        agentId: context.agentId,
        actionType: "write_file",
        target: dir,
        clientId: context.clientId ?? null,
      },
      {
        permissionLevel: context.permissionLevel,
        ...(context.approval !== undefined ? { approval: context.approval } : {}),
      },
      async () => {
        await mkdir(dir, { recursive: true });
        return { ok: true };
      },
    );

    if (enforced.status === "approval_required") {
      throw new Error(`Shared memory directory creation requires approval: ${enforced.enforcement.reason}`);
    }
  } catch (err: unknown) {
    if (err instanceof EnforcementBlockedError) {
      throw new Error(`Shared memory directory creation blocked: ${err.message}`);
    }
    throw err;
  }
}
