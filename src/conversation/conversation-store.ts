import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ConversationThreadSchema } from "../schemas/conversation-thread.schema.js";
import { ConversationTurnSchema } from "../schemas/conversation-turn.schema.js";
import { StitchedContextBundleSchema } from "../schemas/conversation-context.schema.js";
import type {
  ConversationThreadRecord,
  ConversationTurnRecord,
  StitchedContextBundle,
} from "./conversation-types.js";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../security/agents/agent-registry.js";

export interface ListConversationThreadsInput {
  limit?: number;
  brandId?: string;
}

export interface ListConversationTurnsInput {
  threadId: string;
  limit?: number;
}

export class ConversationStore {
  private readonly threadsDirectory: string;
  private readonly turnsDirectory: string;
  private readonly contextCacheDirectory: string;

  constructor(
    threadsDirectory = path.resolve("data", "conversations", "threads"),
    turnsDirectory = path.resolve("data", "conversations", "turns"),
    contextCacheDirectory = path.resolve("data", "conversations", "context-cache"),
  ) {
    this.threadsDirectory = threadsDirectory;
    this.turnsDirectory = turnsDirectory;
    this.contextCacheDirectory = contextCacheDirectory;
  }

  async saveThread(thread: ConversationThreadRecord): Promise<ConversationThreadRecord> {
    const parsed = ConversationThreadSchema.parse(thread);
    const outputPath = this.getThreadPath(parsed.threadId);
    await this.enforcedWrite(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, async () => {
      await mkdir(this.threadsDirectory, { recursive: true });
      await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    });
    return parsed;
  }

  async saveTurn(turn: ConversationTurnRecord): Promise<ConversationTurnRecord> {
    const parsed = ConversationTurnSchema.parse(turn);
    const outputPath = this.getTurnPath(parsed.createdAt, parsed.turnId);
    await this.enforcedWrite(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, async () => {
      await mkdir(this.turnsDirectory, { recursive: true });
      await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    });
    return parsed;
  }

  async saveContextBundle(bundle: StitchedContextBundle): Promise<StitchedContextBundle> {
    const parsed = StitchedContextBundleSchema.parse(bundle);
    const outputPath = this.getContextBundlePath(parsed.createdAt, parsed.bundleId);
    await this.enforcedWrite(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, async () => {
      await mkdir(this.contextCacheDirectory, { recursive: true });
      await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    });
    return parsed;
  }

  async getThread(threadId: string): Promise<ConversationThreadRecord | undefined> {
    const normalized = threadId.trim();
    if (!normalized) {
      return undefined;
    }

    try {
      const raw = await readFile(this.getThreadPath(normalized), "utf-8");
      return ConversationThreadSchema.parse(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }

  async updateThread(
    threadId: string,
    updater: (current: ConversationThreadRecord) => ConversationThreadRecord,
  ): Promise<ConversationThreadRecord> {
    const existing = await this.getThread(threadId);
    if (!existing) {
      throw new Error(`Conversation thread "${threadId}" was not found.`);
    }

    return this.saveThread(updater(existing));
  }

  async listThreads(input: ListConversationThreadsInput = {}): Promise<ConversationThreadRecord[]> {
    await mkdir(this.threadsDirectory, { recursive: true });
    const entries = await readdir(this.threadsDirectory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    const threads = await Promise.all(
      files.map(async (fileName) => {
        const raw = await readFile(path.join(this.threadsDirectory, fileName), "utf-8");
        return ConversationThreadSchema.parse(JSON.parse(raw));
      }),
    );

    let filtered = threads.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    if (input.brandId?.trim()) {
      filtered = filtered.filter((thread) => thread.brandId === input.brandId?.trim());
    }

    if (typeof input.limit === "number" && input.limit > 0) {
      filtered = filtered.slice(0, input.limit);
    }

    return filtered;
  }

  async listTurns(input: ListConversationTurnsInput): Promise<ConversationTurnRecord[]> {
    await mkdir(this.turnsDirectory, { recursive: true });
    const entries = await readdir(this.turnsDirectory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    const turns = await Promise.all(
      files.map(async (fileName) => {
        const raw = await readFile(path.join(this.turnsDirectory, fileName), "utf-8");
        return ConversationTurnSchema.parse(JSON.parse(raw));
      }),
    );

    const filtered = turns
      .filter((turn) => turn.threadId === input.threadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    if (typeof input.limit === "number" && input.limit > 0) {
      return filtered.slice(Math.max(filtered.length - input.limit, 0));
    }

    return filtered;
  }

  private getThreadPath(threadId: string): string {
    return path.join(this.threadsDirectory, `${sanitizeId(threadId)}.json`);
  }

  private getTurnPath(createdAt: string, turnId: string): string {
    return path.join(this.turnsDirectory, `${sanitizeTimestamp(createdAt)}-${sanitizeId(turnId)}.json`);
  }

  private getContextBundlePath(createdAt: string, bundleId: string): string {
    return path.join(this.contextCacheDirectory, `${sanitizeTimestamp(createdAt)}-${sanitizeId(bundleId)}.json`);
  }

  private async enforcedWrite(
    target: string,
    content: string,
    writer: () => Promise<void>,
  ): Promise<void> {
    const agentContext = resolveAgentContext("conversation-store");
    try {
      const enforced = await executeWithEnforcement(
        {
          agentId: agentContext.agentId,
          actionType: "write_file",
          target,
        },
        {
          permissionLevel: agentContext.permissionLevel,
          environment: agentContext.environment,
        },
        async () => {
          await writer();
          return { ok: true };
        },
      );

      if (enforced.status === "approval_required") {
        throw new Error(`Conversation write requires approval: ${enforced.enforcement.reason}`);
      }
    } catch (err: unknown) {
      if (err instanceof EnforcementBlockedError) {
        throw new Error(`Conversation write blocked by enforcement: ${err.message}`);
      }
      throw err;
    }
  }
}

const sanitizeTimestamp = (timestamp: string): string => timestamp.replace(/[^0-9TZ-]/g, "_");
const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "_");
