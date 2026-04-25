/**
 * Operational Retrieval Layer v1 — MAP attribution adapter.
 *
 * Fire-and-forget emit of retrieval lifecycle events so the attribution
 * tracker can score retrieval activity. This module NEVER throws — failures
 * are swallowed so retrieval flows are never coupled to attribution health.
 *
 * The underlying AttributionEvent type uses a fixed eventType enum, so
 * retrieval events are emitted as run lifecycle events (run_completed /
 * run_failed) and the retrieval-specific event name is carried in metadata.
 */

import { emitEvent } from "../attribution/attribution-tracker.js";
import type { AttributionEventType } from "../attribution/attribution-types.js";
import type { RetrievalNamespace } from "./retrieval-types.js";

export type RetrievalAttributionEvent =
  | "retrieval_ingested"
  | "retrieval_search_started"
  | "retrieval_search_completed"
  | "retrieval_context_pack_created"
  | "retrieval_no_results"
  | "retrieval_blocked";

export interface RetrievalEmitOptions {
  event: RetrievalAttributionEvent;
  agentId?: string;
  runId?: string;
  tenantId?: string;
  namespaces?: RetrievalNamespace[];
  query?: string;
  documentId?: string;
  chunkCount?: number;
  resultCount?: number;
  retrievalTraceId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

function mapEventType(event: RetrievalAttributionEvent): AttributionEventType {
  if (event === "retrieval_blocked" || event === "retrieval_no_results") {
    return "run_failed";
  }
  return "run_completed";
}

/**
 * Emit a retrieval attribution event. Fire-and-forget — never throws.
 * Returns void; the underlying emitEvent promise is dropped intentionally.
 */
export function emitRetrievalEvent(opts: RetrievalEmitOptions): void {
  try {
    const metadata: Record<string, unknown> = {
      retrievalEvent: opts.event,
      ...(opts.namespaces !== undefined ? { namespaces: opts.namespaces } : {}),
      ...(opts.query !== undefined ? { query: opts.query } : {}),
      ...(opts.documentId !== undefined ? { documentId: opts.documentId } : {}),
      ...(opts.chunkCount !== undefined ? { chunkCount: opts.chunkCount } : {}),
      ...(opts.resultCount !== undefined ? { resultCount: opts.resultCount } : {}),
      ...(opts.retrievalTraceId !== undefined
        ? { retrievalTraceId: opts.retrievalTraceId }
        : {}),
      ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
      ...(opts.metadata !== undefined ? { ...opts.metadata } : {}),
    };

    void emitEvent({
      eventType: mapEventType(opts.event),
      runId: opts.runId ?? `retrieval-${opts.event}`,
      agentId: opts.agentId ?? "retrieval-layer",
      channel: "unknown",
      ...(opts.tenantId !== undefined ? { clientId: opts.tenantId } : {}),
      contentType: "retrieval",
      metadata,
    }).catch(() => {
      // swallow — fire-and-forget
    });
  } catch {
    // swallow — fire-and-forget
  }
}
