import { MemoryStore } from "./memory-store.js";
import type { MemoryIndex, MemoryReference } from "./memory-types.js";

/**
 * Loads the root memory index document.
 */
export const loadMemoryIndex = async (store = new MemoryStore()): Promise<MemoryIndex> => {
  const raw = (await store.read("MEMORY.md")) ?? "# Memory\n";
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Memory";
  const references = parseReferences(raw);

  return {
    title,
    references,
    raw,
  };
};

const parseReferences = (raw: string): MemoryReference[] => {
  const references: MemoryReference[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const bulletLine = line.replace(/^\s*-\s+/, "").trim();
    if (bulletLine === line.trim() || bulletLine.length === 0) {
      continue;
    }

    const separator = bulletLine.includes(" — ") ? " — " : bulletLine.includes(" - ") ? " - " : undefined;
    const [memoryPath, description] = separator
      ? bulletLine.split(separator, 2)
      : [bulletLine, undefined];

    references.push({
      path: memoryPath.trim(),
      ...(description && description.trim().length > 0 ? { description: description.trim() } : {}),
    });
  }

  return references;
};
