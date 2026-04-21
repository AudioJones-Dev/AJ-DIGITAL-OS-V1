import { ConversationStore } from "../conversation/conversation-store.js";
import type { ConversationThreadRecord } from "../conversation/conversation-types.js";

export interface ConversationHistoryCommandInput {
  limit?: number;
  brandId?: string;
  json?: boolean;
}

export interface ConversationHistoryCommandResult {
  ok: boolean;
  command: "conversation-history";
  rendered: boolean;
  entries: ConversationThreadRecord[];
  warnings: string[];
  errors: string[];
}

export class ConversationHistoryCommand {
  constructor(private readonly conversationStore = new ConversationStore()) {}

  async run(input: ConversationHistoryCommandInput = {}): Promise<ConversationHistoryCommandResult> {
    const entries = await this.conversationStore.listThreads({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
    });

    if (input.json === true) {
      console.log(JSON.stringify({
        ok: true,
        entries,
      }, null, 2));
    } else {
      this.renderHuman(entries);
    }

    return {
      ok: true,
      command: "conversation-history",
      rendered: true,
      entries,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(entries: ConversationThreadRecord[]): void {
    console.log("AJ DIGITAL OS CONVERSATION HISTORY");
    console.log("==================================");
    if (entries.length === 0) {
      console.log("- No conversation threads recorded.");
      return;
    }

    for (const entry of entries) {
      console.log(`- ${entry.threadId} | ${entry.title}`);
      console.log(`  Status: ${entry.status} | Turns: ${entry.turnCount} | Brand: ${entry.brandName ?? entry.brandId ?? "-"}`);
      console.log(`  Updated: ${entry.updatedAt} | Last Turn: ${entry.lastTurnAt ?? "-"}`);
    }
  }
}
