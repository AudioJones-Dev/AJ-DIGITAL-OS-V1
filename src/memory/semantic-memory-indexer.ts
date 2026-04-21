import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ConversationStore } from "../conversation/conversation-store.js";
import type { ConversationTurnRecord } from "../conversation/conversation-types.js";
import { DeliverableStore } from "../core/deliverable-store.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";
import { LocalEmbeddingService } from "./local-embedding-service.js";
import { SemanticMemoryStore } from "./semantic-memory-store.js";
import type {
  SemanticMemoryChunkRecord,
  SemanticMemoryEmbeddingRecord,
  SemanticMemoryIngestionResult,
  SemanticMemoryKind,
  SemanticMemorySourceType,
} from "./semantic-memory-types.js";

export class SemanticMemoryIndexer {
  constructor(
    private readonly store = new SemanticMemoryStore(),
    private readonly embeddingService = new LocalEmbeddingService(),
    private readonly conversationStore = new ConversationStore(),
    private readonly deliverableStore = new DeliverableStore(),
  ) {}

  async indexConversationTurn(turn: ConversationTurnRecord): Promise<SemanticMemoryIngestionResult> {
    return this.indexText({
      memoryId: `conversation-${turn.turnId}`,
      label: `Conversation ${turn.role} ${turn.threadId}`,
      kind: "conversation_memory",
      sourceType: "conversation_turn",
      text: turn.content,
      createdAt: turn.createdAt,
      updatedAt: turn.createdAt,
      metadata: {
        role: turn.role,
        status: turn.status,
        sourceCommand: turn.sourceCommand,
      },
      ...(turn.clientId ? { clientId: turn.clientId } : {}),
      ...(turn.brandId ? { brandId: turn.brandId } : {}),
      ...(turn.brandName ? { brandName: turn.brandName } : {}),
      ...(turn.threadId ? { threadId: turn.threadId } : {}),
      ...(turn.turnId ? { turnId: turn.turnId } : {}),
    });
  }

  async indexDeliverable(deliverable: DeliverableRecord): Promise<SemanticMemoryIngestionResult> {
    const fileText = await this.readDeliverableText(deliverable);
    const text = [
      `Title: ${deliverable.title}`,
      `Status: ${deliverable.status}`,
      `Workflow: ${deliverable.workflowId}`,
      `Type: ${deliverable.deliverableType}`,
      `Summary: ${deliverable.summary}`,
      fileText,
    ].filter((entry) => entry.trim().length > 0).join("\n\n");

    return this.indexText({
      memoryId: `deliverable-${deliverable.deliverableId}`,
      label: `Deliverable ${deliverable.title}`,
      kind: "deliverable_memory",
      sourceType: "deliverable",
      text,
      createdAt: deliverable.createdAt,
      updatedAt: deliverable.updatedAt,
      metadata: {
        status: deliverable.status,
        workflowId: deliverable.workflowId,
        deliverableType: deliverable.deliverableType,
      },
      ...(deliverable.clientId ? { clientId: deliverable.clientId } : {}),
      ...(deliverable.brandId ? { brandId: deliverable.brandId } : {}),
      ...(deliverable.brandName ? { brandName: deliverable.brandName } : {}),
      deliverableId: deliverable.deliverableId,
      ...(deliverable.outputPath ? { sourceUri: deliverable.outputPath } : {}),
    });
  }

  async ingestKnowledge(input: {
    text: string;
    label?: string;
    sourceType?: "ingested_text" | "ingested_transcript" | "ingested_url";
    sourceUri?: string;
    brandId?: string;
    clientId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SemanticMemoryIngestionResult> {
    return this.indexText({
      memoryId: `knowledge-${randomUUID()}`,
      label: input.label?.trim() || "Knowledge Ingestion",
      kind: "knowledge_ingestion_memory",
      sourceType: input.sourceType ?? "ingested_text",
      text: input.text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.sourceUri ? { sourceUri: input.sourceUri } : {}),
    });
  }

  async rebuildFromLocalState(): Promise<SemanticMemoryIngestionResult> {
    const turns = await this.collectConversationTurns();
    const deliverables = await this.deliverableStore.list();
    const warnings: string[] = [];
    const chunkIds: string[] = [];

    for (const turn of turns) {
      const result = await this.indexConversationTurn(turn);
      warnings.push(...result.warnings);
      chunkIds.push(...result.chunkIds);
    }

    for (const deliverable of deliverables) {
      const result = await this.indexDeliverable(deliverable);
      warnings.push(...result.warnings);
      chunkIds.push(...result.chunkIds);
    }

    return {
      indexedCount: chunkIds.length,
      chunkIds,
      warnings,
    };
  }

  private async indexText(input: {
    memoryId: string;
    label: string;
    kind: SemanticMemoryKind;
    sourceType: SemanticMemorySourceType;
    text: string;
    createdAt: string;
    updatedAt: string;
    metadata: Record<string, unknown>;
    clientId?: string;
    brandId?: string;
    brandName?: string;
    threadId?: string;
    turnId?: string;
    deliverableId?: string;
    sourceUri?: string;
  }): Promise<SemanticMemoryIngestionResult> {
    const chunks = chunkText(input.text);
    const warnings: string[] = [];
    const chunkIds: string[] = [];

    if (chunks.length === 0) {
      return {
        indexedCount: 0,
        chunkIds: [],
        warnings: ["No non-empty text chunks were available for semantic memory indexing."],
      };
    }

    for (let index = 0; index < chunks.length; index += 1) {
      const text = chunks[index] ?? "";
      const chunkId = sanitizeId(`${input.memoryId}-${index + 1}`);
      const chunkRecord: SemanticMemoryChunkRecord = {
        memoryId: input.memoryId,
        chunkId,
        kind: input.kind,
        sourceType: input.sourceType,
        label: input.label,
        text,
        textPreview: toPreview(text),
        tokenCount: countTokens(text),
        checksum: checksum(text),
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        ...(input.brandName ? { brandName: input.brandName } : {}),
        ...(input.threadId ? { threadId: input.threadId } : {}),
        ...(input.turnId ? { turnId: input.turnId } : {}),
        ...(input.deliverableId ? { deliverableId: input.deliverableId } : {}),
        ...(input.sourceUri ? { sourceUri: input.sourceUri } : {}),
        metadata: {
          ...input.metadata,
          chunkIndex: index + 1,
          chunkCount: chunks.length,
        },
      };

      const embedding = this.toEmbeddingRecord(chunkId, this.embeddingService.createEmbedding(text));
      await this.store.saveChunk(chunkRecord);
      await this.store.saveEmbedding(embedding);
      await this.store.saveIndexEntry({
        memoryId: chunkRecord.memoryId,
        chunkId,
        kind: chunkRecord.kind,
        sourceType: chunkRecord.sourceType,
        label: chunkRecord.label,
        chunkPath: path.join(this.store.chunksDirectory, `${chunkId}.json`),
        embeddingPath: path.join(this.store.embeddingsDirectory, `${chunkId}.json`),
        textPreview: chunkRecord.textPreview,
        tokenCount: chunkRecord.tokenCount,
        createdAt: chunkRecord.createdAt,
        updatedAt: chunkRecord.updatedAt,
        ...(chunkRecord.clientId ? { clientId: chunkRecord.clientId } : {}),
        ...(chunkRecord.brandId ? { brandId: chunkRecord.brandId } : {}),
        ...(chunkRecord.brandName ? { brandName: chunkRecord.brandName } : {}),
        ...(chunkRecord.threadId ? { threadId: chunkRecord.threadId } : {}),
        ...(chunkRecord.turnId ? { turnId: chunkRecord.turnId } : {}),
        ...(chunkRecord.deliverableId ? { deliverableId: chunkRecord.deliverableId } : {}),
        ...(chunkRecord.sourceUri ? { sourceUri: chunkRecord.sourceUri } : {}),
        metadata: chunkRecord.metadata,
      });
      chunkIds.push(chunkId);
    }

    return {
      indexedCount: chunkIds.length,
      chunkIds,
      warnings,
    };
  }

  private toEmbeddingRecord(chunkId: string, embedding: SemanticMemoryEmbeddingRecord): SemanticMemoryEmbeddingRecord {
    return {
      ...embedding,
      chunkId,
    };
  }

  private async collectConversationTurns(): Promise<ConversationTurnRecord[]> {
    const threads = await this.conversationStore.listThreads();
    const allTurns = await Promise.all(threads.map((thread) => this.conversationStore.listTurns({ threadId: thread.threadId })));
    return allTurns.flat();
  }

  private async readDeliverableText(deliverable: DeliverableRecord): Promise<string> {
    const candidate = deliverable.outputPath;
    if (!candidate || !candidate.trim().toLowerCase().endsWith(".md") && !candidate.trim().toLowerCase().endsWith(".txt")) {
      return "";
    }

    try {
      return await readFile(candidate, "utf-8");
    } catch {
      return "";
    }
  }
}

const chunkText = (value: string, maxCharacters = 900): string[] => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n{2,}/).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= maxCharacters) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxCharacters) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxCharacters) {
      chunks.push(paragraph.slice(index, index + maxCharacters).trim());
    }
    current = "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter((entry) => entry.length > 0);
};

const toPreview = (value: string, maxLength = 180): string => value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trimEnd()}...`;
const checksum = (value: string): string => createHash("sha1").update(value).digest("hex");
const countTokens = (value: string): number => value.split(/\s+/).map((token) => token.trim()).filter((token) => token.length > 0).length;
const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "_");
