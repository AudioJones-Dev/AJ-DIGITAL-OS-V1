import fs from "node:fs/promises";
import path from "node:path";
import { isPathAllowed } from "./allowlist.js";

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
): Promise<{ ok: boolean; error: string | null }> {
  const check = isPathAllowed(filePath, allowedPaths);
  if (!check.allowed) {
    return { ok: false, error: check.reason };
  }

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return { ok: true, error: null };
  } catch (err) {
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
