/**
 * Operational Retrieval Layer v1 — keyword search.
 *
 * Embeddings are deferred. v1 uses case-insensitive substring matching
 * across chunk text and a simple word-overlap score so callers can rank
 * + threshold results. Policy is evaluated FIRST so denials never load
 * any chunks. Every search writes a retrieval trace.
 */

import { randomUUID } from "node:crypto";

import { emitRetrievalEvent } from "./retrieval-attribution.js";
import {
  DEFAULT_FRESHNESS_POLICY,
  DEFAULT_RETRIEVAL_POLICY,
  evaluateRetrievalPolicy,
  isChunkReadable,
} from "./retrieval-policy.js";
import { computeFreshness } from "./retrieval-freshness.js";
import { detectConflicts } from "./retrieval-conflict.js";
import {
  appendRetrievalTrace,
  listChunks,
  listDocuments,
} from "./retrieval-store.js";
import type {
  ConflictFlag,
  FreshnessInfo,
  FreshnessPolicy,
  RetrievalChunk,
  RetrievalPolicy,
  RetrievalResult,
  RetrievalSearchRequest,
  RetrievalSearchResponse,
  RetrievalTrace,
} from "./retrieval-types.js";

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function scoreChunk(chunkText: string, queryWords: string[]): number {
  if (queryWords.length === 0) return 0;
  const lower = chunkText.toLowerCase();
  let hits = 0;
  for (const w of queryWords) {
    if (lower.includes(w)) hits += 1;
  }
  return hits / queryWords.length;
}

export interface SearchOptions {
  policy?: RetrievalPolicy;
  freshnessPolicy?: FreshnessPolicy;
  now?: () => string;
}

export async function searchRetrieval(
  request: RetrievalSearchRequest,
  options: SearchOptions = {},
): Promise<RetrievalSearchResponse> {
  const policy = options.policy ?? DEFAULT_RETRIEVAL_POLICY;
  const now = options.now ?? (() => new Date().toISOString());

  const evaluation = evaluateRetrievalPolicy(request, policy);
  const policyMeta = {
    approved: evaluation.approved,
    ...(evaluation.reason !== undefined ? { reason: evaluation.reason } : {}),
    warnings: evaluation.warnings,
    restrictedNamespacesUsed: evaluation.restrictedNamespacesUsed,
    staleDocumentIds: [] as string[],
  };

  if (!evaluation.approved) {
    emitRetrievalEvent({
      event: "retrieval_blocked",
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      namespaces: request.namespaces,
      query: request.query,
      reason: evaluation.reason ?? "blocked",
    });
    return {
      ok: false,
      results: [],
      policyMeta,
      error: evaluation.reason ?? "blocked",
    };
  }

  emitRetrievalEvent({
    event: "retrieval_search_started",
    ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
    namespaces: request.namespaces,
    query: request.query,
  });

  try {
    const queryWords = tokenize(request.query);
    const filterArg: Parameters<typeof listChunks>[0] = {
      namespaces: request.namespaces,
    };
    if (request.tenantId !== undefined) filterArg.tenantId = request.tenantId;
    const chunks: RetrievalChunk[] = listChunks(filterArg);

    // G3: load all matchable documents once (id -> document). Reused both to
    // weight scoring by freshness AND to hydrate result titles/URIs — which
    // eliminates the previous per-result getDocument() N+1.
    const freshnessPolicy = options.freshnessPolicy ?? DEFAULT_FRESHNESS_POLICY;
    const parsedNow = Date.parse(now());
    const nowMs = Number.isNaN(parsedNow) ? Date.now() : parsedNow;
    const docById = new Map(listDocuments().map((d) => [d.documentId, d] as const));
    // Scoped to the SURFACED results (populated in the results loop) so it stays
    // consistent with per-result metadata.freshness.
    const staleDocumentIds = new Set<string>();

    const candidates: { chunk: RetrievalChunk; score: number; freshness: FreshnessInfo }[] = [];
    for (const ch of chunks) {
      if (!isChunkReadable(ch.tenantId, ch.namespace, request.tenantId, policy)) {
        continue;
      }
      const relevance = scoreChunk(ch.text, queryWords);
      // minScore gates RELEVANCE (pre-decay) so stale items are demoted, not dropped.
      if (relevance <= 0) continue;
      if (request.minScore !== undefined && relevance < request.minScore) continue;
      const freshness = computeFreshness(docById.get(ch.documentId)?.updatedAt, nowMs, freshnessPolicy);
      candidates.push({ chunk: ch, score: relevance * freshness.decayFactor, freshness });
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(
      0,
      Math.max(0, Math.floor(request.maxResults || 0)),
    );

    const results: RetrievalResult[] = [];
    for (const { chunk, score, freshness } of top) {
      const doc = docById.get(chunk.documentId);
      const title = doc?.title ?? chunk.documentId;
      if (freshness.stale) staleDocumentIds.add(chunk.documentId);
      results.push({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        title,
        namespace: chunk.namespace,
        score,
        text: chunk.text,
        ...(doc?.sourceUri !== undefined ? { sourceUri: doc.sourceUri } : {}),
        citation: doc?.sourceUri ? `${title} (${doc.sourceUri})` : title,
        metadata: { ...chunk.metadata, freshness },
      });
    }

    // Both staleDocumentIds and conflicts scope to the surfaced `results` set.
    const conflicts: ConflictFlag[] = detectConflicts(results);
    policyMeta.staleDocumentIds = [...staleDocumentIds];

    const trace: RetrievalTrace = {
      traceId: `trace-${randomUUID()}`,
      ...(request.runId !== undefined ? { runId: request.runId } : {}),
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      query: request.query,
      namespaces: request.namespaces,
      resultCount: results.length,
      selectedChunkIds: results.map((r) => r.chunkId),
      createdAt: now(),
      ...(request.actor !== undefined ? { actor: request.actor } : {}),
      environment: request.environment,
    };
    try {
      appendRetrievalTrace(trace);
    } catch {
      // trace write failures are non-fatal — do not corrupt run state
    }

    if (results.length === 0) {
      emitRetrievalEvent({
        event: "retrieval_no_results",
        ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
        namespaces: request.namespaces,
        query: request.query,
        retrievalTraceId: trace.traceId,
      });
    } else {
      emitRetrievalEvent({
        event: "retrieval_search_completed",
        ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
        namespaces: request.namespaces,
        query: request.query,
        resultCount: results.length,
        retrievalTraceId: trace.traceId,
      });
    }

    return {
      ok: true,
      results,
      retrievalTraceId: trace.traceId,
      policyMeta,
      conflicts,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "search failed";
    emitRetrievalEvent({
      event: "retrieval_blocked",
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      namespaces: request.namespaces,
      query: request.query,
      reason: error,
    });
    return {
      ok: false,
      results: [],
      policyMeta,
      error,
    };
  }
}
