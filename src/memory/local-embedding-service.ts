import { createHash } from "node:crypto";

import type { SemanticMemoryEmbeddingRecord } from "./semantic-memory-types.js";

const DEFAULT_DIMENSIONS = 128;

export class LocalEmbeddingService {
  createEmbedding(text: string, dimensions = DEFAULT_DIMENSIONS): SemanticMemoryEmbeddingRecord {
    const values = new Array<number>(dimensions).fill(0);
    const tokens = tokenize(text);

    for (const token of tokens) {
      const hash = createHash("sha256").update(token).digest();
      const bucket = hash.readUInt32BE(0) % dimensions;
      const sign = (((hash[4] ?? 0) & 1) === 0) ? 1 : -1;
      values[bucket] = (values[bucket] ?? 0) + (sign * Math.max(1, token.length / 4));
    }

    const norm = Math.sqrt(values.reduce((sum, value) => sum + (value * value), 0));
    const normalized = norm === 0 ? values : values.map((value) => value / norm);

    return {
      chunkId: "",
      model: "local-hash-v1",
      dimensions,
      values: normalized,
      norm,
      createdAt: new Date().toISOString(),
    };
  }
}

const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
};
