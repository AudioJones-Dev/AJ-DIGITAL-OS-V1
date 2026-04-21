export type SemanticMemoryKind =
  | "conversation_memory"
  | "deliverable_memory"
  | "knowledge_ingestion_memory";

export type SemanticMemorySourceType =
  | "conversation_turn"
  | "deliverable"
  | "ingested_text"
  | "ingested_transcript"
  | "ingested_url";

export interface SemanticMemoryChunkRecord {
  memoryId: string;
  chunkId: string;
  kind: SemanticMemoryKind;
  sourceType: SemanticMemorySourceType;
  label: string;
  text: string;
  textPreview: string;
  tokenCount: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string | undefined;
  brandId?: string | undefined;
  brandName?: string | undefined;
  threadId?: string | undefined;
  turnId?: string | undefined;
  deliverableId?: string | undefined;
  sourceUri?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface SemanticMemoryEmbeddingRecord {
  chunkId: string;
  model: "local-hash-v1";
  dimensions: number;
  values: number[];
  norm: number;
  createdAt: string;
}

export interface SemanticMemoryIndexEntry {
  memoryId: string;
  chunkId: string;
  kind: SemanticMemoryKind;
  sourceType: SemanticMemorySourceType;
  label: string;
  chunkPath: string;
  embeddingPath: string;
  textPreview: string;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
  clientId?: string | undefined;
  brandId?: string | undefined;
  brandName?: string | undefined;
  threadId?: string | undefined;
  turnId?: string | undefined;
  deliverableId?: string | undefined;
  sourceUri?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface SemanticMemorySearchResult {
  entry: SemanticMemoryIndexEntry;
  chunk: SemanticMemoryChunkRecord;
  score: number;
}

export interface SemanticMemorySearchFilters {
  clientId?: string | undefined;
  brandId?: string | undefined;
  threadId?: string | undefined;
  kinds?: SemanticMemoryKind[] | undefined;
}

export interface SemanticMemoryStats {
  totalChunks: number;
  byKind: Record<SemanticMemoryKind, number>;
  bySourceType: Record<string, number>;
  lastUpdatedAt?: string | undefined;
  directories: {
    chunks: string;
    embeddings: string;
    index: string;
  };
}

export interface SemanticMemoryIngestionResult {
  indexedCount: number;
  chunkIds: string[];
  warnings: string[];
}
