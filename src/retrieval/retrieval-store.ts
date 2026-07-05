/**
 * Operational Retrieval Layer v1 — file-backed storage.
 *
 * Documents and chunks live in JSON files under runtime/retrieval; traces
 * append to a JSONL log. The interface is intentionally narrow so a future
 * Neon/pgvector backend can swap in without touching ingestor/search.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { resolveRuntimePath } from "../core/runtime-paths.js";
import type {
  RetrievalChunk,
  RetrievalDocument,
  RetrievalNamespace,
  RetrievalTrace,
} from "./retrieval-types.js";

// Resolved lazily so AJ_RUNTIME_DIR overrides (tests, smoke CLI) apply
// regardless of module import order.
function retrievalDir(): string {
  return resolveRuntimePath("retrieval");
}

function docsPath(): string {
  return join(retrievalDir(), "documents.json");
}

function chunksPath(): string {
  return join(retrievalDir(), "chunks.json");
}

function tracesPath(): string {
  return join(retrievalDir(), "retrieval-traces.jsonl");
}

function ensureDir(): void {
  const dir = retrievalDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadJson<T>(path: string): T[] {
  ensureDir();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function saveJson<T>(path: string, data: T[]): void {
  ensureDir();
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

// ── Documents ────────────────────────────────────────────────────────

export function saveDocument(doc: RetrievalDocument): RetrievalDocument {
  const docs = loadJson<RetrievalDocument>(docsPath());
  const idx = docs.findIndex((d) => d.documentId === doc.documentId);
  if (idx >= 0) {
    docs[idx] = doc;
  } else {
    docs.push(doc);
  }
  saveJson(docsPath(), docs);
  return doc;
}

export function getDocument(documentId: string): RetrievalDocument | undefined {
  return loadJson<RetrievalDocument>(docsPath()).find(
    (d) => d.documentId === documentId,
  );
}

export interface ListDocumentsFilter {
  namespace?: RetrievalNamespace;
  tenantId?: string;
  limit?: number;
}

export function listDocuments(filter?: ListDocumentsFilter): RetrievalDocument[] {
  let docs = loadJson<RetrievalDocument>(docsPath());
  if (filter?.namespace !== undefined) {
    docs = docs.filter((d) => d.namespace === filter.namespace);
  }
  if (filter?.tenantId !== undefined) {
    docs = docs.filter((d) => d.tenantId === filter.tenantId);
  }
  docs = docs.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (filter?.limit !== undefined) {
    docs = docs.slice(0, filter.limit);
  }
  return docs;
}

// ── Chunks ───────────────────────────────────────────────────────────

export function saveChunks(chunks: RetrievalChunk[]): RetrievalChunk[] {
  if (chunks.length === 0) return [];
  const all = loadJson<RetrievalChunk>(chunksPath());
  const byId = new Map(all.map((c) => [c.chunkId, c]));
  for (const ch of chunks) {
    byId.set(ch.chunkId, ch);
  }
  saveJson(chunksPath(), [...byId.values()]);
  return chunks;
}

export function getChunksByDocument(documentId: string): RetrievalChunk[] {
  return loadJson<RetrievalChunk>(chunksPath()).filter(
    (c) => c.documentId === documentId,
  );
}

export interface ListChunksFilter {
  namespaces?: RetrievalNamespace[];
  tenantId?: string;
}

export function listChunks(filter?: ListChunksFilter): RetrievalChunk[] {
  let chunks = loadJson<RetrievalChunk>(chunksPath());
  if (filter?.namespaces !== undefined && filter.namespaces.length > 0) {
    const set = new Set(filter.namespaces);
    chunks = chunks.filter((c) => set.has(c.namespace));
  }
  if (filter?.tenantId !== undefined) {
    chunks = chunks.filter(
      (c) => c.tenantId === filter.tenantId || c.tenantId === undefined,
    );
  }
  return chunks;
}

export function deleteChunksByDocument(documentId: string): number {
  const all = loadJson<RetrievalChunk>(chunksPath());
  const remaining = all.filter((c) => c.documentId !== documentId);
  const removed = all.length - remaining.length;
  saveJson(chunksPath(), remaining);
  return removed;
}

// ── Traces (append-only) ─────────────────────────────────────────────

export function appendRetrievalTrace(trace: RetrievalTrace): RetrievalTrace {
  ensureDir();
  appendFileSync(tracesPath(), JSON.stringify(trace) + "\n", "utf-8");
  return trace;
}

export interface ListTracesFilter {
  tenantId?: string;
  runId?: string;
  limit?: number;
}

export function listRetrievalTraces(filter?: ListTracesFilter): RetrievalTrace[] {
  ensureDir();
  const traceFile = tracesPath();
  if (!existsSync(traceFile)) return [];

  let traces: RetrievalTrace[] = [];
  try {
    traces = readFileSync(traceFile, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RetrievalTrace);
  } catch {
    return [];
  }

  if (filter?.tenantId !== undefined) {
    traces = traces.filter((t) => t.tenantId === filter.tenantId);
  }
  if (filter?.runId !== undefined) {
    traces = traces.filter((t) => t.runId === filter.runId);
  }

  traces = traces.slice().reverse();
  if (filter?.limit !== undefined) {
    traces = traces.slice(0, filter.limit);
  }
  return traces;
}

export function getRetrievalTrace(traceId: string): RetrievalTrace | undefined {
  return listRetrievalTraces().find((t) => t.traceId === traceId);
}

// ── Test/maintenance helpers ─────────────────────────────────────────

export const RETRIEVAL_STORE_PATHS = {
  get RUNTIME_DIR(): string {
    return retrievalDir();
  },
  get DOCS_PATH(): string {
    return docsPath();
  },
  get CHUNKS_PATH(): string {
    return chunksPath();
  },
  get TRACES_PATH(): string {
    return tracesPath();
  },
} as const;
