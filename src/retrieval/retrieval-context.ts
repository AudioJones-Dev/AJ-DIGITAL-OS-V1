/**
 * Operational Retrieval Layer v1 — context pack builder.
 *
 * Composes a model-ready context pack from a search request: runs the
 * search, deduplicates source documents, builds citations, and emits a
 * MAP attribution event. Returns a stable shape even when the search
 * is denied or returns zero results so callers never have to guard.
 */

import { emitRetrievalEvent } from "./retrieval-attribution.js";
import { searchRetrieval, type SearchOptions } from "./retrieval-search.js";
import { getDocument } from "./retrieval-store.js";
import type {
  RetrievalCitation,
  RetrievalContextPack,
  RetrievalSearchRequest,
  RetrievalSourceMeta,
} from "./retrieval-types.js";

export async function createContextPack(
  request: RetrievalSearchRequest,
  options: SearchOptions = {},
): Promise<RetrievalContextPack> {
  const response = await searchRetrieval(request, options);

  const citations: RetrievalCitation[] = response.results.map((r) => ({
    documentId: r.documentId,
    title: r.title,
    ...(r.sourceUri !== undefined ? { sourceUri: r.sourceUri } : {}),
    chunkId: r.chunkId,
  }));

  const seen = new Set<string>();
  const sourceMeta: RetrievalSourceMeta[] = [];
  for (const r of response.results) {
    if (seen.has(r.documentId)) continue;
    seen.add(r.documentId);
    const doc = getDocument(r.documentId);
    if (doc) {
      sourceMeta.push({
        documentId: doc.documentId,
        title: doc.title,
        namespace: doc.namespace,
        ...(doc.sourceUri !== undefined ? { sourceUri: doc.sourceUri } : {}),
        ...(doc.version !== undefined ? { version: doc.version } : {}),
        hash: doc.hash,
      });
    } else {
      sourceMeta.push({
        documentId: r.documentId,
        title: r.title,
        namespace: r.namespace,
        ...(r.sourceUri !== undefined ? { sourceUri: r.sourceUri } : {}),
        hash: "",
      });
    }
  }

  const pack: RetrievalContextPack = {
    query: request.query,
    results: response.results,
    citations,
    sourceMeta,
    policyMeta: response.policyMeta,
    retrievalTraceId: response.retrievalTraceId ?? "",
  };

  emitRetrievalEvent({
    event: "retrieval_context_pack_created",
    ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
    namespaces: request.namespaces,
    query: request.query,
    resultCount: response.results.length,
    ...(response.retrievalTraceId !== undefined
      ? { retrievalTraceId: response.retrievalTraceId }
      : {}),
  });

  return pack;
}
