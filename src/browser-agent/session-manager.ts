import fs from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "playwright";

export interface SessionManagerOptions {
  sessionFile: string;
}

/**
 * Resolve session file path: use explicit path if given, otherwise derive from URL domain.
 * Returns the resolved absolute path.
 */
export function resolveSessionFile(sessionFile: string | undefined, url: string): string {
  if (sessionFile && sessionFile.length > 0) {
    return path.resolve(sessionFile);
  }
  // Auto-derive from domain
  try {
    const hostname = new URL(url).hostname.replace(/\./g, "-");
    return path.resolve("sessions", `${hostname}.json`);
  } catch {
    return path.resolve("sessions", "default.json");
  }
}

/**
 * Check whether a session file exists and contains valid JSON.
 */
export async function sessionFileExists(sessionFile: string): Promise<boolean> {
  try {
    await fs.access(sessionFile);
    const raw = await fs.readFile(sessionFile, "utf-8");
    const parsed = JSON.parse(raw);
    // Must have cookies or origins to be meaningful
    return Array.isArray(parsed.cookies) || Array.isArray(parsed.origins);
  } catch {
    return false;
  }
}

export async function loadSession(context: BrowserContext, sessionFile: string): Promise<boolean> {
  try {
    await fs.access(sessionFile);
    // Load full storage state by creating a new context — instead, just verify the file is valid
    // The storage state is loaded at browser launch via storageStatePath option
    const raw = await fs.readFile(sessionFile, "utf-8");
    JSON.parse(raw); // validate JSON
    return true;
  } catch {
    return false;
  }
}

export async function saveSession(context: BrowserContext, sessionFile: string): Promise<void> {
  const state = await context.storageState();
  const dir = path.dirname(sessionFile);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(sessionFile, JSON.stringify(state, null, 2), "utf-8");
}
