import { appendFile, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

import { ensureDirExists } from "./json-file-store.js";
import type { JsonlLogStoreOptions } from "./persistence-types.js";

function redact<T extends Record<string, unknown>>(
  record: T,
  fields: string[],
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...record };
  for (const field of fields) {
    if (field in copy) {
      copy[field] = "[REDACTED]";
    }
  }
  return copy;
}

export async function appendLog<T extends Record<string, unknown>>(
  filePath: string,
  record: T,
  options: JsonlLogStoreOptions = {},
): Promise<void> {
  await ensureDirExists(path.dirname(filePath));

  const safeRecord = options.redactFields?.length
    ? redact(record, options.redactFields)
    : record;

  const line = `${JSON.stringify(safeRecord)}\n`;

  await new Promise<void>((resolve, reject) => {
    appendFile(filePath, line, "utf-8", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function readLogs<T = Record<string, unknown>>(
  filePath: string,
  filter?: (record: T) => boolean,
): Promise<T[]> {
  const results: T[] = [];

  const exists = await new Promise<boolean>((resolve) => {
    const stream = createReadStream(filePath);
    stream.on("error", () => resolve(false));
    stream.on("open", () => {
      stream.destroy();
      resolve(true);
    });
  });

  if (!exists) return results;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: T;
    try {
      parsed = JSON.parse(trimmed) as T;
    } catch {
      continue; // skip corrupt lines
    }

    if (!filter || filter(parsed)) {
      results.push(parsed);
    }
  }

  return results;
}
