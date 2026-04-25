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

export async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirExists(dir);

  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmp, filePath);
}
