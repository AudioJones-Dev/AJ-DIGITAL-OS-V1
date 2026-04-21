import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { SemanticMemoryChunkSchema } from "../schemas/memory-chunk.schema.js";
import { SemanticMemoryEmbeddingSchema } from "../schemas/memory-embedding.schema.js";
import { SemanticMemoryIndexEntrySchema } from "../schemas/memory-index-entry.schema.js";
import type {
  SemanticMemoryChunkRecord,
  SemanticMemoryEmbeddingRecord,
  SemanticMemoryIndexEntry,
  SemanticMemoryStats,
} from "./semantic-memory-types.js";

export class SemanticMemoryStore {
  readonly chunksDirectory: string;
  readonly embeddingsDirectory: string;
  readonly indexDirectory: string;

  constructor(rootDirectory = path.resolve("data", "memory")) {
    this.chunksDirectory = path.join(rootDirectory, "chunks");
    this.embeddingsDirectory = path.join(rootDirectory, "embeddings");
    this.indexDirectory = path.join(rootDirectory, "index");
  }

  async saveChunk(chunk: SemanticMemoryChunkRecord): Promise<SemanticMemoryChunkRecord> {
    const parsed = SemanticMemoryChunkSchema.parse(chunk);
    await mkdir(this.chunksDirectory, { recursive: true });
    await writeFile(path.join(this.chunksDirectory, `${sanitizeId(parsed.chunkId)}.json`), `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    return parsed;
  }

  async saveEmbedding(embedding: SemanticMemoryEmbeddingRecord): Promise<SemanticMemoryEmbeddingRecord> {
    const parsed = SemanticMemoryEmbeddingSchema.parse(embedding);
    await mkdir(this.embeddingsDirectory, { recursive: true });
    await writeFile(path.join(this.embeddingsDirectory, `${sanitizeId(parsed.chunkId)}.json`), `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    return parsed;
  }

  async saveIndexEntry(entry: SemanticMemoryIndexEntry): Promise<SemanticMemoryIndexEntry> {
    const parsed = SemanticMemoryIndexEntrySchema.parse(entry);
    await mkdir(this.indexDirectory, { recursive: true });
    await writeFile(path.join(this.indexDirectory, `${sanitizeId(parsed.chunkId)}.json`), `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    return parsed;
  }

  async getChunk(chunkId: string): Promise<SemanticMemoryChunkRecord | undefined> {
    return this.readOne(path.join(this.chunksDirectory, `${sanitizeId(chunkId)}.json`), SemanticMemoryChunkSchema);
  }

  async getEmbedding(chunkId: string): Promise<SemanticMemoryEmbeddingRecord | undefined> {
    return this.readOne(path.join(this.embeddingsDirectory, `${sanitizeId(chunkId)}.json`), SemanticMemoryEmbeddingSchema);
  }

  async listIndexEntries(): Promise<SemanticMemoryIndexEntry[]> {
    return this.readAll(this.indexDirectory, SemanticMemoryIndexEntrySchema);
  }

  async getStats(): Promise<SemanticMemoryStats> {
    const entries = await this.listIndexEntries();
    const byKind: SemanticMemoryStats["byKind"] = {
      conversation_memory: 0,
      deliverable_memory: 0,
      knowledge_ingestion_memory: 0,
    };
    const bySourceType: Record<string, number> = {};

    for (const entry of entries) {
      byKind[entry.kind] += 1;
      bySourceType[entry.sourceType] = (bySourceType[entry.sourceType] ?? 0) + 1;
    }

    return {
      totalChunks: entries.length,
      byKind,
      bySourceType,
      ...(entries[0]?.updatedAt ? { lastUpdatedAt: entries[0].updatedAt } : {}),
      directories: {
        chunks: this.chunksDirectory,
        embeddings: this.embeddingsDirectory,
        index: this.indexDirectory,
      },
    };
  }

  private async readAll<T>(
    directory: string,
    schema: { parse: (value: unknown) => T },
  ): Promise<T[]> {
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => entry.name).sort((left, right) => right.localeCompare(left));
    const records = await Promise.all(files.map(async (fileName) => schema.parse(JSON.parse(await readFile(path.join(directory, fileName), "utf-8")))));
    const sortableRecords = records as Array<T & { updatedAt?: string; createdAt?: string }>;
    return sortableRecords.sort((left, right) =>
      (right.updatedAt ?? right.createdAt ?? "").localeCompare(left.updatedAt ?? left.createdAt ?? ""));
  }

  private async readOne<T>(
    filePath: string,
    schema: { parse: (value: unknown) => T },
  ): Promise<T | undefined> {
    try {
      return schema.parse(JSON.parse(await readFile(filePath, "utf-8")));
    } catch {
      return undefined;
    }
  }
}

const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "_");
