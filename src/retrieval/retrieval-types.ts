/**
 * Operational Retrieval Layer v1 — shared types.
 *
 * Defines the policy-governed RAG primitives consumed by the ingestor,
 * search, context pack builder, attribution adapter, Hermes API, and CLI.
 *
 * Storage is file-backed for v1 — interfaces are kept narrow so a future
 * Neon pgvector backend can be swapped in without touching callers.
 */

export type RetrievalNamespace =
  | "system_docs"
  | "client_docs"
  | "brand_voice"
  | "workflow_docs"
  | "content_assets"
  | "aeo_research"
  | "attribution_memory"
  | "audit_memory"
  | "tool_docs";

export type RetrievalSourceType =
  | "markdown"
  | "text"
  | "json"
  | "jsonl"
  | "pdf_stub"
  | "docx_stub";

export type RetrievalEnvironment = "production" | "staging" | "development" | "test";

export interface RetrievalDocument {
  documentId: string;
  tenantId?: string;
  namespace: RetrievalNamespace;
  title: string;
  sourceUri?: string;
  sourceType: RetrievalSourceType;
  version?: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievalChunk {
  chunkId: string;
  documentId: string;
  tenantId?: string;
  namespace: RetrievalNamespace;
  text: string;
  tokenCount: number;
  embeddingId?: string;
  metadata: Record<string, unknown>;
  sourceStart?: number;
  sourceEnd?: number;
}

export interface RetrievalQuery {
  query: string;
  namespaces: RetrievalNamespace[];
  tenantId?: string;
  maxResults: number;
  minScore?: number;
  environment: RetrievalEnvironment;
}

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  title: string;
  namespace: RetrievalNamespace;
  score: number;
  text: string;
  sourceUri?: string;
  citation?: string;
  metadata: Record<string, unknown>;
}

export interface RetrievalTrace {
  traceId: string;
  runId?: string;
  tenantId?: string;
  query: string;
  namespaces: RetrievalNamespace[];
  resultCount: number;
  selectedChunkIds: string[];
  createdAt: string;
  actor?: string;
  environment: RetrievalEnvironment;
}

export interface RetrievalPolicy {
  requireTenantIdForNamespaces: RetrievalNamespace[];
  readOnlyNamespaces: RetrievalNamespace[];
  globalNamespaces: RetrievalNamespace[];
  restrictedNamespaces: RetrievalNamespace[];
}

export interface RetrievalIngestRequest {
  tenantId?: string;
  namespace: RetrievalNamespace;
  title: string;
  content: string;
  sourceType: RetrievalSourceType;
  sourceUri?: string;
  version?: string;
  actor?: string;
  environment?: RetrievalEnvironment;
}

export interface RetrievalSearchRequest {
  query: string;
  namespaces: RetrievalNamespace[];
  tenantId?: string;
  maxResults: number;
  minScore?: number;
  environment: RetrievalEnvironment;
  runId?: string;
  actor?: string;
}

export interface RetrievalCitation {
  documentId: string;
  title: string;
  sourceUri?: string;
  chunkId: string;
}

export interface RetrievalSourceMeta {
  documentId: string;
  title: string;
  namespace: RetrievalNamespace;
  sourceUri?: string;
  version?: string;
  hash: string;
}

export interface RetrievalPolicyMeta {
  approved: boolean;
  reason?: string;
  warnings: string[];
  restrictedNamespacesUsed: RetrievalNamespace[];
  staleDocumentIds: string[];
}

export interface RetrievalContextPack {
  query: string;
  results: RetrievalResult[];
  citations: RetrievalCitation[];
  sourceMeta: RetrievalSourceMeta[];
  policyMeta: RetrievalPolicyMeta;
  retrievalTraceId: string;
}

export interface RetrievalIngestResult {
  ok: boolean;
  documentId?: string;
  chunkCount?: number;
  hash?: string;
  error?: string;
  policyMeta?: RetrievalPolicyMeta;
}

export interface RetrievalSearchResponse {
  ok: boolean;
  results: RetrievalResult[];
  retrievalTraceId?: string;
  policyMeta: RetrievalPolicyMeta;
  error?: string;
}

export interface RetrievalPolicyEvaluation {
  approved: boolean;
  reason?: string;
  warnings: string[];
  restrictedNamespacesUsed: RetrievalNamespace[];
}
