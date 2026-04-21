import { randomUUID } from "node:crypto";

import { ConversationStore } from "./conversation-store.js";
import type { ConversationSourceCommand, ConversationThreadRecord } from "./conversation-types.js";

export interface ResolveConversationThreadInput {
  threadId?: string;
  sourceCommand: ConversationSourceCommand;
  task?: string;
  clientId?: string;
  brandId?: string;
  brandName?: string;
  shellSessionId?: string;
  shellSessionLabel?: string;
}

export class ConversationThreadRegistry {
  constructor(private readonly store = new ConversationStore()) {}

  async resolveOrCreate(input: ResolveConversationThreadInput): Promise<{
    thread: ConversationThreadRecord;
    resolution: "existing" | "created";
  }> {
    const normalizedThreadId = input.threadId?.trim();
    if (normalizedThreadId) {
      const existing = await this.store.getThread(normalizedThreadId);
      if (!existing) {
        throw new Error(`Conversation thread "${normalizedThreadId}" was not found in local storage.`);
      }

      return {
        thread: existing,
        resolution: "existing",
      };
    }

    const timestamp = new Date().toISOString();
    const thread: ConversationThreadRecord = {
      threadId: randomUUID(),
      title: deriveThreadTitle(input.task),
      sourceCommand: input.sourceCommand,
      status: "active",
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.brandName ? { brandName: input.brandName } : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
      turnCount: 0,
      ...(input.shellSessionId ? { shellSessionId: input.shellSessionId } : {}),
      ...(input.shellSessionLabel ? { shellSessionLabel: input.shellSessionLabel } : {}),
      metadata: {},
    };

    return {
      thread: await this.store.saveThread(thread),
      resolution: "created",
    };
  }

  async touchThreadAfterTurn(input: {
    threadId: string;
    task?: string;
    sessionId?: string;
    runId?: string;
    updatedAt?: string;
    increment?: number;
  }): Promise<ConversationThreadRecord> {
    const timestamp = input.updatedAt ?? new Date().toISOString();
    return this.store.updateThread(input.threadId, (current) => ({
      ...current,
      title: deriveThreadTitle(input.task, current.title),
      updatedAt: timestamp,
      lastTurnAt: timestamp,
      turnCount: current.turnCount + (input.increment ?? 1),
      ...(input.sessionId ? { latestSessionId: input.sessionId } : {}),
      ...(input.runId ? { latestRunId: input.runId } : {}),
      ...(input.task?.trim() ? { latestUserTask: input.task.trim() } : {}),
    }));
  }
}

const deriveThreadTitle = (task: string | undefined, fallback = "Untitled conversation"): string => {
  const normalized = task?.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 77).trimEnd()}...`;
};
