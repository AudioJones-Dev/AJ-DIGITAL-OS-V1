import { SemanticMemoryRetriever } from "../memory/semantic-memory-retriever.js";
import type { SemanticMemorySearchResult } from "../memory/semantic-memory-types.js";

export interface MemorySearchCommandInput {
  query: string;
  limit?: number;
  brandId?: string;
  clientId?: string;
  threadId?: string;
  json?: boolean;
}

export interface MemorySearchCommandResult {
  ok: boolean;
  command: "memory-search";
  rendered: boolean;
  query: string;
  results: SemanticMemorySearchResult[];
  warnings: string[];
  errors: string[];
}

export class MemorySearchCommand {
  constructor(private readonly retriever = new SemanticMemoryRetriever()) {}

  async run(input: MemorySearchCommandInput): Promise<MemorySearchCommandResult> {
    const query = input.query.trim();
    if (!query) {
      return this.render({
        ok: false,
        command: "memory-search",
        rendered: true,
        query,
        results: [],
        warnings: [],
        errors: ["memory-search requires --query <text>."],
      }, input.json);
    }

    const results = await this.retriever.search({
      query,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.threadId ? { threadId: input.threadId } : {}),
    });

    return this.render({
      ok: true,
      command: "memory-search",
      rendered: true,
      query,
      results,
      warnings: [],
      errors: [],
    }, input.json);
  }

  private render(result: MemorySearchCommandResult, json?: boolean): MemorySearchCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS MEMORY SEARCH");
    console.log("===========================");
    console.log(`Query: ${result.query}`);
    if (result.results.length === 0) {
      console.log("- No semantic memory matches found.");
      return result;
    }

    for (const item of result.results) {
      console.log(`- ${item.score.toFixed(3)} | ${item.entry.kind} | ${item.entry.label}`);
      console.log(`  Preview: ${item.entry.textPreview}`);
      console.log(`  Chunk: ${item.entry.chunkId}`);
    }
    return result;
  }
}
