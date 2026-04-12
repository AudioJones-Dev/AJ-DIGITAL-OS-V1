import { safeReadFile, safeWriteFile } from "./file-tools.js";

/**
 * Convert a key to SCREAMING_SNAKE_CASE for .env output.
 */
function toEnvKey(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s\-./]+/g, "_")
    .replace(/[^A-Z0-9_]/gi, "")
    .toUpperCase();
}

/**
 * Parse an existing .env file into a record.
 */
export function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Serialize a record into .env file content.
 */
export function serializeEnv(
  fields: Record<string, string>,
  header?: string,
): string {
  const lines: string[] = [];

  if (header) {
    for (const headerLine of header.split("\n")) {
      lines.push(headerLine.startsWith("#") ? headerLine : `# ${headerLine}`);
    }
    lines.push("");
  }

  for (const [key, value] of Object.entries(fields)) {
    const envKey = toEnvKey(key);
    lines.push(`${envKey}=${value}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Generate a complete .env file from extracted fields.
 */
export async function generateEnvFile(
  outputPath: string,
  fields: Record<string, string>,
  allowedPaths?: string[],
  header?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const defaultHeader = header ?? [
    "Auto-generated config template",
    "Source: AJ Digital OS Local Agent",
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");

  const content = serializeEnv(fields, defaultHeader);
  return safeWriteFile(outputPath, content, allowedPaths);
}

/**
 * Patch specific keys in an existing .env file.
 * Preserves existing keys and comments.
 */
export async function patchEnvFile(
  filePath: string,
  updates: Record<string, string>,
  allowedPaths?: string[],
): Promise<{ ok: boolean; error: string | null; keysUpdated: string[]; keysAdded: string[] }> {
  const readResult = await safeReadFile(filePath, allowedPaths);

  const keysUpdated: string[] = [];
  const keysAdded: string[] = [];

  if (!readResult.ok || readResult.content === null) {
    // File doesn't exist — create with the updates
    const result = await generateEnvFile(filePath, updates, allowedPaths);
    if (result.ok) {
      keysAdded.push(...Object.keys(updates).map(toEnvKey));
    }
    return { ...result, keysUpdated, keysAdded };
  }

  const lines = readResult.content.split("\n");
  const normalizedUpdates: Record<string, string> = {};
  for (const [key, value] of Object.entries(updates)) {
    normalizedUpdates[toEnvKey(key)] = value;
  }

  const seen = new Set<string>();

  // Update existing lines
  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.length === 0) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return line;
    const key = trimmed.slice(0, eqIdx).trim();
    if (key in normalizedUpdates) {
      seen.add(key);
      keysUpdated.push(key);
      return `${key}=${normalizedUpdates[key]}`;
    }
    return line;
  });

  // Append new keys
  for (const [key, value] of Object.entries(normalizedUpdates)) {
    if (!seen.has(key)) {
      newLines.push(`${key}=${value}`);
      keysAdded.push(key);
    }
  }

  const content = newLines.join("\n");
  const result = await safeWriteFile(filePath, content, allowedPaths);
  return { ...result, keysUpdated, keysAdded };
}
