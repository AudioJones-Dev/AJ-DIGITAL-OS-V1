import { ConversationStore } from "../conversation/conversation-store.js";
import type { ConversationThreadRecord, ConversationTurnRecord } from "../conversation/conversation-types.js";

export interface ConversationThreadCommandInput {
  threadId: string;
  limit?: number;
  json?: boolean;
}

export interface ConversationThreadCommandResult {
  ok: boolean;
  command: "conversation-thread";
  rendered: boolean;
  thread?: ConversationThreadRecord | undefined;
  turns: ConversationTurnRecord[];
  warnings: string[];
  errors: string[];
}

export class ConversationThreadCommand {
  constructor(private readonly conversationStore = new ConversationStore()) {}

  async run(input: ConversationThreadCommandInput): Promise<ConversationThreadCommandResult> {
    const normalizedThreadId = input.threadId.trim();
    if (!normalizedThreadId) {
      const errors = ["Conversation thread inspection requires --threadId <id>."];
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, errors }, null, 2));
      } else {
        console.log(errors[0]);
      }

      return {
        ok: false,
        command: "conversation-thread",
        rendered: true,
        turns: [],
        warnings: [],
        errors,
      };
    }

    const thread = await this.conversationStore.getThread(normalizedThreadId);
    if (!thread) {
      const errors = [`Conversation thread "${normalizedThreadId}" was not found.`];
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, errors }, null, 2));
      } else {
        console.log(errors[0]);
      }

      return {
        ok: false,
        command: "conversation-thread",
        rendered: true,
        turns: [],
        warnings: [],
        errors,
      };
    }

    const turns = await this.conversationStore.listTurns({
      threadId: normalizedThreadId,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

    if (input.json === true) {
      console.log(JSON.stringify({
        ok: true,
        thread,
        turns,
      }, null, 2));
    } else {
      this.renderHuman(thread, turns);
    }

    return {
      ok: true,
      command: "conversation-thread",
      rendered: true,
      thread,
      turns,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(thread: ConversationThreadRecord, turns: ConversationTurnRecord[]): void {
    console.log("AJ DIGITAL OS CONVERSATION THREAD");
    console.log("=================================");
    console.log(`Thread ID: ${thread.threadId}`);
    console.log(`Title: ${thread.title}`);
    console.log(`Status: ${thread.status}`);
    console.log(`Turns: ${thread.turnCount}`);
    console.log(`Brand: ${thread.brandName ?? thread.brandId ?? "-"}`);
    console.log("");
    console.log("Recent Turns");

    if (turns.length === 0) {
      console.log("- None");
      return;
    }

    for (const turn of turns) {
      console.log(`- ${turn.createdAt} | ${turn.role} | ${turn.mode} | ${turn.status}`);
      console.log(`  ${turn.content || "-"}`);
    }
  }
}
