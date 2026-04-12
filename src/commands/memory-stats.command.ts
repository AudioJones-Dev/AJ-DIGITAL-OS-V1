import { SemanticMemoryStore } from "../memory/semantic-memory-store.js";
import type { SemanticMemoryStats } from "../memory/semantic-memory-types.js";

export interface MemoryStatsCommandInput {
  json?: boolean;
}

export interface MemoryStatsCommandResult {
  ok: boolean;
  command: "memory-stats";
  rendered: boolean;
  stats: SemanticMemoryStats;
  warnings: string[];
  errors: string[];
}

export class MemoryStatsCommand {
  constructor(private readonly store = new SemanticMemoryStore()) {}

  async run(input: MemoryStatsCommandInput = {}): Promise<MemoryStatsCommandResult> {
    const stats = await this.store.getStats();
    const result: MemoryStatsCommandResult = {
      ok: true,
      command: "memory-stats",
      rendered: true,
      stats,
      warnings: [],
      errors: [],
    };

    if (input.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS MEMORY STATS");
    console.log("==========================");
    console.log(`Total Chunks: ${stats.totalChunks}`);
    console.log(`By Kind: conversation=${stats.byKind.conversation_memory}, deliverable=${stats.byKind.deliverable_memory}, knowledge=${stats.byKind.knowledge_ingestion_memory}`);
    console.log(`Last Updated: ${stats.lastUpdatedAt ?? "-"}`);
    return result;
  }
}
