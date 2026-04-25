/**
 * Operational Retrieval Layer v1 — ingestion.
 *
 * Validates the request against ingest policy, computes a sha256 content
 * hash, splits the content into chunks (paragraph/line based — no sentence
 * boundary detection), persists document + chunks, and writes a retrieval
 * trace. Fires a fire-and-forget MAP attribution event on success/failure.
 *
 * pdf_stub / docx_stub source types are explicitly unsupported in v1.
 */

import { createHash, randomUUID } from "node:crypto";

import { emitRetrievalEvent } from "./retrieval-attribution.js";
import {
  evaluateIngestPolicy,
  DEFAULT_RETRIEVAL_POLICY,
} from "./retrieval-policy.js";
import {
  appendRetrievalTrace,
  saveChunks,
  saveDocument,
} from "./retrieval-store.js";
import type {
  RetrievalChunk,
  RetrievalDocument,
  RetrievalIngestRequest,
  RetrievalIngestResult,
  RetrievalPolicy,
  RetrievalSourceType,
  RetrievalTrace,
} from "./retrieval-types.js";

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Approximate token count — characters / 4 is a safe rule-of-thumb for
 * English text and avoids a tokenizer dependency in v1.
 */
function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function splitMarkdown(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitText(content: string): string[] {
  return splitMarkdown(content);
}

function splitJsonl(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function chunkContent(content: string, sourceType: RetrievalSourceType): string[] {
  switch (sourceType) {
    case "markdown":
      return splitMarkdown(content);
    case "text":
      return splitText(content);
    case "json":
      return [content.trim()];
    case "jsonl":
      return splitJsonl(content);
    case "pdf_stub":
    case "docx_stub":
      return [];
  }
}

export interface IngestOptions {
  policy?: RetrievalPolicy;
  /** Override clock for tests. */
  now?: () => string;
}

export async function ingestDocument(
  request: RetrievalIngestRequest,
  options: IngestOptions = {},
): Promise<RetrievalIngestResult> {
  const policy = options.policy ?? DEFAULT_RETRIEVAL_POLICY;
  const now = options.now ?? (() => new Date().toISOString());
  const environment = request.environment ?? "development";

  try {
    if (request.sourceType === "pdf_stub" || request.sourceType === "docx_stub") {
      const error = "pdf/docx ingestion not yet supported";
      emitRetrievalEvent({
        event: "retrieval_blocked",
        ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
        namespaces: [request.namespace],
        reason: error,
      });
      return { ok: false, error };
    }

    if (typeof request.content !== "string" || request.content.trim().length === 0) {
      const error = "ingest content is empty";
      emitRetrievalEvent({
        event: "retrieval_blocked",
        ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
        namespaces: [request.namespace],
        reason: error,
      });
      return { ok: false, error };
    }

    const evaluation = evaluateIngestPolicy(request, policy);
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
        namespaces: [request.namespace],
        reason: evaluation.reason ?? "ingest blocked by policy",
      });
      return {
        ok: false,
        error: evaluation.reason ?? "ingest blocked by policy",
        policyMeta,
      };
    }

    const documentId = `doc-${randomUUID()}`;
    const hash = hashContent(request.content);
    const ts = now();

    const document: RetrievalDocument = {
      documentId,
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      namespace: request.namespace,
      title: request.title,
      ...(request.sourceUri !== undefined ? { sourceUri: request.sourceUri } : {}),
      sourceType: request.sourceType,
      ...(request.version !== undefined ? { version: request.version } : {}),
      hash,
      createdAt: ts,
      updatedAt: ts,
    };

    const rawChunks = chunkContent(request.content, request.sourceType);
    const chunks: RetrievalChunk[] = rawChunks.map((text, idx) => ({
      chunkId: `chunk-${documentId}-${idx}`,
      documentId,
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      namespace: request.namespace,
      text,
      tokenCount: approxTokens(text),
      metadata: {
        chunkIndex: idx,
        chunkCount: rawChunks.length,
      },
    }));

    saveDocument(document);
    saveChunks(chunks);

    const trace: RetrievalTrace = {
      traceId: `trace-${randomUUID()}`,
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      query: `[ingest] ${request.title}`,
      namespaces: [request.namespace],
      resultCount: chunks.length,
      selectedChunkIds: chunks.map((c) => c.chunkId),
      createdAt: ts,
      ...(request.actor !== undefined ? { actor: request.actor } : {}),
      environment,
    };
    try {
      appendRetrievalTrace(trace);
    } catch {
      // trace write failures are non-fatal
    }

    emitRetrievalEvent({
      event: "retrieval_ingested",
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      namespaces: [request.namespace],
      documentId,
      chunkCount: chunks.length,
      retrievalTraceId: trace.traceId,
    });

    return {
      ok: true,
      documentId,
      chunkCount: chunks.length,
      hash,
      policyMeta,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "ingest failed";
    emitRetrievalEvent({
      event: "retrieval_blocked",
      ...(request.tenantId !== undefined ? { tenantId: request.tenantId } : {}),
      namespaces: [request.namespace],
      reason: error,
    });
    return { ok: false, error };
  }
}
