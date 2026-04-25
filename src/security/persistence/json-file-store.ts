import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import type { JsonFileStoreOptions } from "./persistence-types.js";

export async function ensureDirExists(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readJSON<T>(
  filePath: string,
  options: JsonFileStoreOptions = {},
): Promise<T | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    if (options.tolerateCorruption) return null;
    throw new Error(`Failed to read file: ${filePath}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    if (options.tolerateCorruption) return null;
    throw new Error(`Failed to parse JSON in file: ${filePath}`);
  }
}

/**
 * Rename with retry for Windows EPERM/EBUSY races.
 * Uses a unique tmp suffix per call so concurrent writes never collide.
 */
async function renameWithRetry(src: string, dest: string, retries = 5): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rename(src, dest);
      return;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt < retries - 1 && (code === "EPERM" || code === "EBUSY")) {
        await new Promise<void>((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirExists(dir);

  // Unique tmp suffix: PID + random hex prevents concurrent-write collisions on Windows
  const suffix = `${process.pid}.${Math.random().toString(36).slice(2)}`;
  const tmp = `${filePath}.${suffix}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await renameWithRetry(tmp, filePath);
}
