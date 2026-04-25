import fs from "node:fs/promises";
import path from "node:path";
import { isPathAllowed } from "./allowlist.js";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../security/agents/agent-registry.js";
import type { ApprovalContext } from "../security/permissions/approval-gate.js";
import type { PermissionLevel } from "../security/permissions/permission-levels.js";

export interface FileToolsEnforcementContext {
  agentId: string;
  permissionLevel: PermissionLevel;
  approval?: ApprovalContext | undefined;
  clientId?: string | null | undefined;
}

/**
 * Safely read a file within the allowlist.
 */
export async function safeReadFile(
  filePath: string,
  allowedPaths?: string[],
): Promise<{ ok: boolean; content: string | null; error: string | null }> {
  const check = isPathAllowed(filePath, allowedPaths);
  if (!check.allowed) {
    return { ok: false, content: null, error: check.reason };
  }

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { ok: true, content, error: null };
  } catch (err) {
    return {
      ok: false,
      content: null,
      error: err instanceof Error ? err.message : "Read failed",
    };
  }
}

/**
 * Safely write a file within the allowlist.
 * Creates parent directories as needed.
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  allowedPaths?: string[],
  enforcement?: FileToolsEnforcementContext,
): Promise<{ ok: boolean; error: string | null }> {
  const check = isPathAllowed(filePath, allowedPaths);
  if (!check.allowed) {
    return { ok: false, error: check.reason };
  }

  try {
    const registryContext = resolveAgentContext(enforcement?.agentId ?? "local-agent-file-tools");
    const context: FileToolsEnforcementContext = {
      agentId: enforcement?.agentId ?? registryContext.agentId,
      permissionLevel: enforcement?.permissionLevel ?? registryContext.permissionLevel,
      ...(enforcement?.approval !== undefined ? { approval: enforcement.approval } : {}),
      ...(enforcement?.clientId !== undefined ? { clientId: enforcement.clientId } : {}),
    };

    const enforced = await executeWithEnforcement(
      {
        agentId: context.agentId,
        actionType: "write_file",
        target: filePath,
        ...(context.clientId !== undefined ? { clientId: context.clientId } : {}),
      },
      {
        permissionLevel: context.permissionLevel,
        ...(context.approval !== undefined ? { approval: context.approval } : {}),
      },
      async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf-8");
        return { ok: true };
      },
    );

    if (enforced.status === "approval_required") {
      return {
        ok: false,
        error: `Write requires approval: ${enforced.enforcement.reason}`,
      };
    }

    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof EnforcementBlockedError) {
      return {
        ok: false,
        error: `Write blocked by enforcement: ${err.message}`,
      };
    }

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Write failed",
    };
  }
}

/**
 * Safely list directory contents within the allowlist.
 */
export async function safeListDir(
  dirPath: string,
  allowedPaths?: string[],
): Promise<{ ok: boolean; entries: string[] | null; error: string | null }> {
  const check = isPathAllowed(dirPath, allowedPaths);
  if (!check.allowed) {
    return { ok: false, entries: null, error: check.reason };
  }

  try {
    const entries = await fs.readdir(dirPath);
    return { ok: true, entries, error: null };
  } catch (err) {
    return {
      ok: false,
      entries: null,
      error: err instanceof Error ? err.message : "List failed",
    };
  }
}
