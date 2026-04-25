import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, rmSync } from "node:fs";

import { ingestDocument } from "../../src/retrieval/retrieval-ingestor.js";
import { searchRetrieval } from "../../src/retrieval/retrieval-search.js";
import { createContextPack } from "../../src/retrieval/retrieval-context.js";
import {
  RETRIEVAL_STORE_PATHS,
  listDocuments,
  listRetrievalTraces,
  getChunksByDocument,
} from "../../src/retrieval/retrieval-store.js";
import {
  evaluateRetrievalPolicy,
  evaluateIngestPolicy,
  isChunkReadable,
} from "../../src/retrieval/retrieval-policy.js";
import { emitRetrievalEvent } from "../../src/retrieval/retrieval-attribution.js";
import * as attributionTracker from "../../src/attribution/attribution-tracker.js";

function clearRetrievalStore(): void {
  for (const p of [
    RETRIEVAL_STORE_PATHS.DOCS_PATH,
    RETRIEVAL_STORE_PATHS.CHUNKS_PATH,
    RETRIEVAL_STORE_PATHS.TRACES_PATH,
  ]) {
    if (existsSync(p)) rmSync(p);
  }
}

beforeEach(() => {
  clearRetrievalStore();
});

// 1. ingest markdown stores document and chunks
describe("ingestDocument", () => {
  it("ingests a markdown document and stores document + chunks", async () => {
    const result = await ingestDocument({
      namespace: "system_docs",
      title: "Hello",
      content: "Para one.\n\nPara two.\n\nPara three.",
      sourceType: "markdown",
    });
    expect(result.ok).toBe(true);
    expect(result.documentId).toBeDefined();
    expect(result.chunkCount).toBe(3);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);

    const docs = listDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0]?.title).toBe("Hello");
    expect(docs[0]?.namespace).toBe("system_docs");

    const chunks = getChunksByDocument(result.documentId!);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.text).toBe("Para one.");
    expect(chunks[1]?.text).toBe("Para two.");
    expect(chunks[2]?.text).toBe("Para three.");
  });

  // 2. chunk document correctly splits on \n\n
  it("splits markdown on double newline", async () => {
    const result = await ingestDocument({
      namespace: "system_docs",
      title: "Multi",
      content: "A line.\n\nB line.\n\n\n\nC line.",
      sourceType: "markdown",
    });
    expect(result.ok).toBe(true);
    const chunks = getChunksByDocument(result.documentId!);
    expect(chunks.map((c) => c.text)).toEqual(["A line.", "B line.", "C line."]);
  });

  it("rejects pdf_stub / docx_stub", async () => {
    const result = await ingestDocument({
      namespace: "system_docs",
      title: "PDF",
      content: "irrelevant",
      sourceType: "pdf_stub",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/pdf\/docx/);
  });

  it("blocks ingest into a read-only namespace", async () => {
    const result = await ingestDocument({
      namespace: "audit_memory",
      title: "Forbidden",
      content: "anything",
      sourceType: "markdown",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/read-only/);
  });
});

describe("searchRetrieval", () => {
  // 3. search returns relevant chunks (keyword match)
  it("returns chunks matching keyword (case-insensitive)", async () => {
    await ingestDocument({
      namespace: "system_docs",
      title: "Doc A",
      content: "The quick brown fox.\n\nA second paragraph about cats.",
      sourceType: "markdown",
    });
    const response = await searchRetrieval({
      query: "quick fox",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(response.ok).toBe(true);
    expect(response.results.length).toBeGreaterThanOrEqual(1);
    expect(response.results[0]?.text.toLowerCase()).toContain("quick");
    expect(response.results[0]?.score).toBeGreaterThan(0);
  });

  // 4. namespace filtering
  it("filters by namespace", async () => {
    await ingestDocument({
      namespace: "system_docs",
      title: "System",
      content: "alpha keyword present",
      sourceType: "markdown",
    });
    await ingestDocument({
      namespace: "tool_docs",
      title: "Tool",
      content: "alpha keyword also here",
      sourceType: "markdown",
    });

    const response = await searchRetrieval({
      query: "alpha",
      namespaces: ["tool_docs"],
      maxResults: 10,
      environment: "development",
    });
    expect(response.ok).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.namespace).toBe("tool_docs");
  });

  // 5. tenant filtering — global vs. tenant-scoped
  it("returns global namespace chunks regardless of tenant", async () => {
    await ingestDocument({
      namespace: "system_docs",
      title: "Global",
      content: "globalkey present",
      sourceType: "markdown",
    });
    const response = await searchRetrieval({
      query: "globalkey",
      namespaces: ["system_docs"],
      maxResults: 10,
      tenantId: "tenant-1",
      environment: "development",
    });
    expect(response.ok).toBe(true);
    expect(response.results).toHaveLength(1);
  });

  // 6. cross-tenant retrieval is blocked
  it("blocks cross-tenant retrieval", async () => {
    await ingestDocument({
      namespace: "client_docs",
      title: "Tenant 1 doc",
      tenantId: "tenant-1",
      content: "secret-keyword here",
      sourceType: "markdown",
    });
    const response = await searchRetrieval({
      query: "secret-keyword",
      namespaces: ["client_docs"],
      maxResults: 10,
      tenantId: "tenant-2",
      environment: "development",
    });
    expect(response.ok).toBe(true);
    expect(response.results).toHaveLength(0);
  });

  // 7. production request without tenantId is blocked
  it("blocks production request without tenantId", async () => {
    const response = await searchRetrieval({
      query: "anything",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "production",
    });
    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/tenantId/);
    expect(response.policyMeta.approved).toBe(false);
  });

  // 8. client_docs requires tenantId
  it("blocks client_docs search without tenantId", async () => {
    const response = await searchRetrieval({
      query: "anything",
      namespaces: ["client_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/tenantId/);
  });

  // 9. retrieval trace is written after search
  it("writes a retrieval trace after a search", async () => {
    await ingestDocument({
      namespace: "system_docs",
      title: "Trace doc",
      content: "tracetest keyword here",
      sourceType: "markdown",
    });
    const response = await searchRetrieval({
      query: "tracetest",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(response.retrievalTraceId).toBeDefined();
    const traces = listRetrievalTraces();
    const trace = traces.find((t) => t.traceId === response.retrievalTraceId);
    expect(trace).toBeDefined();
    expect(trace?.query).toBe("tracetest");
    expect(trace?.resultCount).toBe(response.results.length);
  });

  // 11. no-result search returns safe empty result
  it("returns safe empty result when no chunks match", async () => {
    const response = await searchRetrieval({
      query: "doesnotmatchanything",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(response.ok).toBe(true);
    expect(response.results).toEqual([]);
  });

  // 12. retrieval failure does not corrupt run state — error returned, not thrown
  it("does not throw when policy denies — returns structured error", async () => {
    let didThrow = false;
    try {
      const r = await searchRetrieval({
        query: "x",
        namespaces: ["client_docs"],
        maxResults: 5,
        environment: "production",
      });
      expect(r.ok).toBe(false);
    } catch {
      didThrow = true;
    }
    expect(didThrow).toBe(false);
  });

  it("respects minScore filter", async () => {
    await ingestDocument({
      namespace: "system_docs",
      title: "Score doc",
      content: "alpha beta gamma delta",
      sourceType: "markdown",
    });
    const response = await searchRetrieval({
      query: "alpha zzz yyy xxx",
      namespaces: ["system_docs"],
      maxResults: 5,
      minScore: 0.9,
      environment: "development",
    });
    expect(response.ok).toBe(true);
    expect(response.results).toEqual([]);
  });
});

// 10. context pack includes citations
describe("createContextPack", () => {
  it("returns citations and sourceMeta", async () => {
    const ingest = await ingestDocument({
      namespace: "system_docs",
      title: "Ctx doc",
      content: "contextkey present in chunk one.\n\nanother chunk with contextkey.",
      sourceType: "markdown",
      sourceUri: "memory://ctx",
    });
    const pack = await createContextPack({
      query: "contextkey",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(pack.results.length).toBeGreaterThan(0);
    expect(pack.citations.length).toBe(pack.results.length);
    expect(pack.sourceMeta).toHaveLength(1);
    expect(pack.sourceMeta[0]?.documentId).toBe(ingest.documentId);
    expect(pack.sourceMeta[0]?.sourceUri).toBe("memory://ctx");
    expect(pack.retrievalTraceId).toBeTruthy();
    expect(pack.policyMeta.approved).toBe(true);
  });

  it("returns a stable shape on policy denial", async () => {
    const pack = await createContextPack({
      query: "anything",
      namespaces: ["client_docs"],
      maxResults: 5,
      environment: "production",
    });
    expect(pack.results).toEqual([]);
    expect(pack.citations).toEqual([]);
    expect(pack.sourceMeta).toEqual([]);
    expect(pack.policyMeta.approved).toBe(false);
  });
});

// 13. attribution emits after retrieval search (fire-and-forget — verify no throw)
// 14. attribution failure does not throw
describe("retrieval attribution", () => {
  it("does not throw when emitEvent succeeds", () => {
    expect(() =>
      emitRetrievalEvent({
        event: "retrieval_search_started",
        namespaces: ["system_docs"],
        query: "test",
      }),
    ).not.toThrow();
  });

  it("does not throw when underlying emitEvent rejects", async () => {
    const spy = vi
      .spyOn(attributionTracker, "emitEvent")
      .mockRejectedValueOnce(new Error("boom"));
    expect(() =>
      emitRetrievalEvent({
        event: "retrieval_search_completed",
        namespaces: ["system_docs"],
        query: "test",
        resultCount: 0,
      }),
    ).not.toThrow();
    // give microtask queue a chance to swallow the rejection
    await Promise.resolve();
    spy.mockRestore();
  });

  it("does not throw when underlying emitEvent throws synchronously", () => {
    const spy = vi
      .spyOn(attributionTracker, "emitEvent")
      .mockImplementationOnce(() => {
        throw new Error("sync boom");
      });
    expect(() =>
      emitRetrievalEvent({
        event: "retrieval_no_results",
        namespaces: ["system_docs"],
        query: "test",
      }),
    ).not.toThrow();
    spy.mockRestore();
  });

  it("search succeeds even when attribution emit rejects", async () => {
    const spy = vi
      .spyOn(attributionTracker, "emitEvent")
      .mockRejectedValue(new Error("attribution down"));
    await ingestDocument({
      namespace: "system_docs",
      title: "Attr doc",
      content: "attrkey present",
      sourceType: "markdown",
    });
    const response = await searchRetrieval({
      query: "attrkey",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(response.ok).toBe(true);
    spy.mockRestore();
  });
});

// Policy unit tests — the rule book
describe("evaluateRetrievalPolicy", () => {
  it("allows development search with no tenant on global namespace", () => {
    const r = evaluateRetrievalPolicy({
      query: "x",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "development",
    });
    expect(r.approved).toBe(true);
  });

  it("blocks production without tenantId", () => {
    const r = evaluateRetrievalPolicy({
      query: "x",
      namespaces: ["system_docs"],
      maxResults: 5,
      environment: "production",
    });
    expect(r.approved).toBe(false);
  });

  it("flags audit_memory as restricted but allows", () => {
    const r = evaluateRetrievalPolicy({
      query: "x",
      namespaces: ["audit_memory"],
      maxResults: 5,
      environment: "development",
      tenantId: "tenant-1",
    });
    expect(r.approved).toBe(true);
    expect(r.restrictedNamespacesUsed).toContain("audit_memory");
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("evaluateIngestPolicy", () => {
  it("blocks ingest into audit_memory (read-only)", () => {
    const r = evaluateIngestPolicy({
      namespace: "audit_memory",
      title: "x",
      content: "y",
      sourceType: "markdown",
    });
    expect(r.approved).toBe(false);
  });

  it("allows ingest into system_docs without tenant", () => {
    const r = evaluateIngestPolicy({
      namespace: "system_docs",
      title: "x",
      content: "y",
      sourceType: "markdown",
    });
    expect(r.approved).toBe(true);
  });
});

describe("isChunkReadable", () => {
  it("blocks cross-tenant chunk", () => {
    expect(isChunkReadable("tenant-1", "client_docs", "tenant-2")).toBe(false);
  });
  it("allows same-tenant chunk", () => {
    expect(isChunkReadable("tenant-1", "client_docs", "tenant-1")).toBe(true);
  });
  it("allows global chunk with no tenant", () => {
    expect(isChunkReadable(undefined, "system_docs", "tenant-1")).toBe(true);
  });
});
