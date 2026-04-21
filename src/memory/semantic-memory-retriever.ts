import { LocalEmbeddingService } from "./local-embedding-service.js";
import { SemanticMemoryStore } from "./semantic-memory-store.js";
import type {
  SemanticMemorySearchFilters,
  SemanticMemorySearchResult,
} from "./semantic-memory-types.js";

export interface SemanticMemorySearchInput extends SemanticMemorySearchFilters {
  query: string;
  limit?: number;
}

export class SemanticMemoryRetriever {
  constructor(
    private readonly store = new SemanticMemoryStore(),
    private readonly embeddingService = new LocalEmbeddingService(),
  ) {}

  async search(input: SemanticMemorySearchInput): Promise<SemanticMemorySearchResult[]> {
    const query = input.query.trim();
    if (!query) {
      return [];
    }

    const queryEmbedding = this.embeddingService.createEmbedding(query);
    const entries = await this.store.listIndexEntries();
    const filtered = entries.filter((entry) => this.matchesFilters(entry, input));
    const hydrated = await Promise.all(filtered.map(async (entry) => ({
      entry,
      chunk: await this.store.getChunk(entry.chunkId),
      embedding: await this.store.getEmbedding(entry.chunkId),
    })));

    const ranked = hydrated
      .filter((item): item is typeof item & { chunk: NonNullable<typeof item.chunk>; embedding: NonNullable<typeof item.embedding> } => !!item.chunk && !!item.embedding)
      .map((item) => ({
        entry: item.entry,
        chunk: item.chunk,
        score: cosineSimilarity(queryEmbedding.values, item.embedding.values)
          + (input.brandId && item.entry.brandId === input.brandId ? 0.02 : 0)
          + (input.threadId && item.entry.threadId === input.threadId ? 0.01 : 0),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) =>
        right.score - left.score
        || right.entry.updatedAt.localeCompare(left.entry.updatedAt)
        || left.entry.chunkId.localeCompare(right.entry.chunkId));

    const limit = input.limit ?? 4;
    return ranked.slice(0, limit);
  }

  private matchesFilters(
    entry: Awaited<ReturnType<SemanticMemoryStore["listIndexEntries"]>>[number],
    input: SemanticMemorySearchInput,
  ): boolean {
    if (input.clientId && entry.clientId && entry.clientId !== input.clientId) {
      return false;
    }
    if (input.brandId && entry.brandId && entry.brandId !== input.brandId) {
      return false;
    }
    if (input.threadId && entry.threadId && entry.threadId !== input.threadId) {
      return false;
    }
    if (input.kinds && input.kinds.length > 0 && !input.kinds.includes(entry.kind)) {
      return false;
    }
    return true;
  }
}

const cosineSimilarity = (left: number[], right: number[]): number => {
  const size = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < size; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};
