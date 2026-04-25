/**
 * Operational Retrieval Layer v1 — public API barrel.
 */

export type {
  RetrievalChunk,
  RetrievalCitation,
  RetrievalContextPack,
  RetrievalDocument,
  RetrievalEnvironment,
  RetrievalIngestRequest,
  RetrievalIngestResult,
  RetrievalNamespace,
  RetrievalPolicy,
  RetrievalPolicyEvaluation,
  RetrievalPolicyMeta,
  RetrievalQuery,
  RetrievalResult,
  RetrievalSearchRequest,
  RetrievalSearchResponse,
  RetrievalSourceMeta,
  RetrievalSourceType,
  RetrievalTrace,
} from "./retrieval-types.js";

export {
  DEFAULT_RETRIEVAL_POLICY,
  evaluateIngestPolicy,
  evaluateRetrievalPolicy,
  isChunkReadable,
} from "./retrieval-policy.js";

export {
  appendRetrievalTrace,
  deleteChunksByDocument,
  getChunksByDocument,
  getDocument,
  getRetrievalTrace,
  listChunks,
  listDocuments,
  listRetrievalTraces,
  RETRIEVAL_STORE_PATHS,
  saveChunks,
  saveDocument,
} from "./retrieval-store.js";

export { ingestDocument } from "./retrieval-ingestor.js";
export { searchRetrieval } from "./retrieval-search.js";
export { createContextPack } from "./retrieval-context.js";
export {
  emitRetrievalEvent,
  type RetrievalAttributionEvent,
  type RetrievalEmitOptions,
} from "./retrieval-attribution.js";
