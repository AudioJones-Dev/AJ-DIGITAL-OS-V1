import { randomUUID } from "node:crypto";

import type { BrandContext } from "../brands/brand-context.js";
import { AssistantSessionStore } from "../core/assistant-session-store.js";
import { DeliverableStore } from "../core/deliverable-store.js";
import { SemanticMemoryRetriever } from "../memory/semantic-memory-retriever.js";
import { ConversationStore } from "./conversation-store.js";
import type {
  ContextSourceMetadata,
  ConversationThreadRecord,
  ConversationTurnRecord,
  StitchedContextBundle,
} from "./conversation-types.js";

export interface ContextStitcherInput {
  thread: ConversationThreadRecord;
  currentTask: string;
  mode: string;
  clientId: string;
  brandContext?: BrandContext;
  maxRecentTurns?: number;
  maxCharacters?: number;
}

const DEFAULT_MAX_RECENT_TURNS = 6;
const DEFAULT_MAX_CHARACTERS = 6000;

export class ContextStitcher {
  constructor(
    private readonly conversationStore = new ConversationStore(),
    private readonly sessionStore = new AssistantSessionStore(),
    private readonly deliverableStore = new DeliverableStore(),
    private readonly semanticMemoryRetriever = new SemanticMemoryRetriever(),
  ) {}

  async stitch(input: ContextStitcherInput): Promise<StitchedContextBundle> {
    const maxRecentTurns = input.maxRecentTurns ?? DEFAULT_MAX_RECENT_TURNS;
    const maxCharacters = input.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
    const createdAt = new Date().toISOString();
    const bundleId = randomUUID();
    const sourceMaterials: Array<Record<string, unknown>> = [];
    const sources: ContextSourceMetadata[] = [];
    let totalCharacters = 0;
    let truncated = false;
    let semanticResultCount = 0;
    let semanticSelectedCount = 0;

    const tryInclude = (entry: {
      kind: ContextSourceMetadata["kind"];
      label: string;
      text: string;
      createdAt?: string;
      turnId?: string;
      sessionId?: string;
      deliverableId?: string;
      metadata: Record<string, unknown>;
    }): void => {
      const trimmedText = entry.text.trim();
      const characterCount = trimmedText.length;
      if (!trimmedText) {
        return;
      }

      const nextTotal = totalCharacters + characterCount;
      const sourceId = randomUUID();
      const included = nextTotal <= maxCharacters;
      const metadata: ContextSourceMetadata = {
        sourceId,
        kind: entry.kind,
        label: entry.label,
        ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
        threadId: input.thread.threadId,
        ...(entry.turnId ? { turnId: entry.turnId } : {}),
        ...(entry.sessionId ? { sessionId: entry.sessionId } : {}),
        ...(entry.deliverableId ? { deliverableId: entry.deliverableId } : {}),
        ...(entry.metadata.chunkId && typeof entry.metadata.chunkId === "string"
          ? { chunkId: entry.metadata.chunkId }
          : {}),
        characterCount,
        included,
        truncated: !included,
        metadata: entry.metadata,
      };
      sources.push(metadata);

      if (!included) {
        truncated = true;
        return;
      }

      totalCharacters = nextTotal;
      sourceMaterials.push({
        title: entry.label,
        text: trimmedText,
      });
    };

    tryInclude({
      kind: "current_task",
      label: "conversation:current-task",
      text: [
        `Current Task: ${input.currentTask}`,
        `Mode: ${input.mode}`,
        `Thread ID: ${input.thread.threadId}`,
      ].join("\n"),
      metadata: {
        mode: input.mode,
      },
    });

    const turns = await this.conversationStore.listTurns({
      threadId: input.thread.threadId,
      limit: maxRecentTurns,
    });

    for (const turn of turns) {
      tryInclude(this.toTurnSource(turn));
    }

    if (input.brandContext) {
      tryInclude({
        kind: "brand_context",
        label: `conversation:brand:${input.brandContext.brandId}`,
        text: [
          `Brand Context: ${input.brandContext.manifest.displayName}`,
          `Tone: ${input.brandContext.manifest.voice.tone.join(", ") || "-"}`,
          `Style: ${input.brandContext.manifest.voice.styleNotes.join("; ") || "-"}`,
          `Required Disclaimers: ${input.brandContext.manifest.contentRules.requiredDisclaimers.join("; ") || "-"}`,
        ].join("\n"),
        metadata: {
          brandId: input.brandContext.brandId,
        },
      });
    }

    const semanticResults = await this.semanticMemoryRetriever.search({
      query: input.currentTask,
      limit: 4,
      clientId: input.clientId,
      ...(input.brandContext?.brandId ? { brandId: input.brandContext.brandId } : {}),
      threadId: input.thread.threadId,
    });
    semanticResultCount = semanticResults.length;
    for (const result of semanticResults) {
      const beforeCount = sourceMaterials.length;
      tryInclude({
        kind: "semantic_memory",
        label: `memory:${result.entry.kind}:${result.entry.chunkId}`,
        text: [
          `Semantic Memory: ${result.entry.label}`,
          `Kind: ${result.entry.kind}`,
          `Score: ${result.score.toFixed(3)}`,
          result.chunk.text,
        ].join("\n"),
        createdAt: result.entry.updatedAt,
        ...(result.entry.deliverableId ? { deliverableId: result.entry.deliverableId } : {}),
        metadata: {
          chunkId: result.entry.chunkId,
          memoryId: result.entry.memoryId,
          sourceType: result.entry.sourceType,
          score: result.score,
        },
      });
      if (sourceMaterials.length > beforeCount) {
        semanticSelectedCount += 1;
      }
    }

    const recentSessions = (await this.sessionStore.list({ limit: 12 }))
      .filter((session) => session.conversationThreadId === input.thread.threadId)
      .slice(0, 2);
    for (const session of recentSessions) {
      tryInclude({
        kind: "session_metadata",
        label: `conversation:session:${session.sessionId}`,
        text: [
          `Session Task: ${session.task || "-"}`,
          `Status: ${session.status}`,
          `Mode: ${session.execution ?? session.mode}`,
          `Route: ${session.route ? `${session.route.provider}/${session.route.model}` : "-"}`,
        ].join("\n"),
        createdAt: session.timestamp,
        sessionId: session.sessionId,
        metadata: {
          sourceCommand: session.sourceCommand,
        },
      });
    }

    const recentDeliverables = (await this.deliverableStore.list({ limit: 8 }))
      .filter((deliverable) => {
        if (input.thread.brandId && deliverable.brandId === input.thread.brandId) {
          return true;
        }
        return !!input.thread.clientId && deliverable.clientId === input.thread.clientId;
      })
      .slice(0, 2);
    for (const deliverable of recentDeliverables) {
      tryInclude({
        kind: "deliverable_metadata",
        label: `conversation:deliverable:${deliverable.deliverableId}`,
        text: [
          `Deliverable: ${deliverable.title}`,
          `Status: ${deliverable.status}`,
          `Workflow: ${deliverable.workflowId}`,
          `Summary: ${deliverable.summary}`,
        ].join("\n"),
        createdAt: deliverable.updatedAt,
        deliverableId: deliverable.deliverableId,
        metadata: {
          deliverableType: deliverable.deliverableType,
        },
      });
    }

    return {
      bundleId,
      createdAt,
      threadId: input.thread.threadId,
      maxRecentTurns,
      maxCharacters,
      totalCharacters,
      truncated,
      semanticQuery: input.currentTask,
      semanticResultCount,
      semanticSelectedCount,
      sources,
      sourceMaterials,
    };
  }

  private toTurnSource(turn: ConversationTurnRecord): {
    kind: "conversation_turn";
    label: string;
    text: string;
    createdAt?: string;
    turnId?: string;
    metadata: Record<string, unknown>;
  } {
    return {
      kind: "conversation_turn",
      label: `conversation:turn:${turn.role}:${turn.turnId}`,
      text: [
        `Role: ${turn.role}`,
        `Created: ${turn.createdAt}`,
        turn.content,
      ].join("\n"),
      createdAt: turn.createdAt,
      turnId: turn.turnId,
      metadata: {
        sourceCommand: turn.sourceCommand,
        mode: turn.mode,
      },
    };
  }
}
