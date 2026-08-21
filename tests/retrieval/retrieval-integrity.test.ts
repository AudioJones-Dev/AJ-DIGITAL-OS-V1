import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, rmSync } from "node:fs";

import { computeFreshness } from "../../src/retrieval/retrieval-freshness.js";
import { detectConflicts } from "../../src/retrieval/retrieval-conflict.js";
import { DEFAULT_FRESHNESS_POLICY } from "../../src/retrieval/retrieval-policy.js";
import { searchRetrieval } from "../../src/retrieval/retrieval-search.js";
import {
  RETRIEVAL_STORE_PATHS,
  saveChunks,
  saveDocument,
} from "../../src/retrieval/retrieval-store.js";
import type {
  RetrievalChunk,
  RetrievalDocument,
  RetrievalResult,
} from "../../src/retrieval/retrieval-types.js";

const MS_PER_DAY = 86_400_000;
const NOW_ISO = "2026-06-14T00:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);

function daysAgoIso(days: number): string {
  return new Date(NOW_MS - days * MS_PER_DAY).toISOString();
}

function clearStore(): void {
  for (const p of [
    RETRIEVAL_STORE_PATHS.DOCS_PATH,
    RETRIEVAL_STORE_PATHS.CHUNKS_PATH,
    RETRIEVAL_STORE_PATHS.TRACES_PATH,
  ]) {
    if (existsSync(p)) rmSync(p);
  }
}

beforeEach(() => clearStore());

// ── Freshness (pure) ─────────────────────────────────────────────────────────
describe("computeFreshness", () => {
  it("a brand-new document is fully weighted and not stale", () => {
    const f = computeFreshness(NOW_ISO, NOW_MS);
    expect(f.decayFactor).toBe(1);
    expect(f.stale).toBe(false);
    expect(f.ageDays).toBe(0);
  });

  it("decays to ~0.5 after one half-life (30d)", () => {
    const f = computeFreshness(daysAgoIso(30), NOW_MS);
    expect(f.decayFactor).toBeCloseTo(0.5, 5);
  });

  it("never decays below the floor", () => {
    const f = computeFreshness(daysAgoIso(2000), NOW_MS);
    expect(f.decayFactor).toBe(DEFAULT_FRESHNESS_POLICY.decayFloor);
  });

  it("flags stale past the threshold, not before", () => {
    expect(computeFreshness(daysAgoIso(200), NOW_MS).stale).toBe(true);
    expect(computeFreshness(daysAgoIso(100), NOW_MS).stale).toBe(false);
  });

  it("treats unknown/undatable age as fresh (never penalize what we can't date)", () => {
    expect(computeFreshness(undefined, NOW_MS)).toEqual({ ageDays: 0, decayFactor: 1, stale: false });
    expect(computeFreshness("not-a-date", NOW_MS).decayFactor).toBe(1);
  });
});

// ── Conflict detection (pure) ────────────────────────────────────────────────
function result(overrides: Partial<RetrievalResult> & { documentId: string; text: string }): RetrievalResult {
  return {
    chunkId: `c-${overrides.documentId}`,
    title: overrides.documentId,
    namespace: "system_docs",
    score: 1,
    metadata: {},
    ...overrides,
  };
}

describe("detectConflicts", () => {
  it("flags a numeric disagreement on a shared subject", () => {
    const flags = detectConflicts([
      result({ documentId: "a", text: "the alpha protocol budget is 500 dollars" }),
      result({ documentId: "b", text: "the alpha protocol budget is 750 dollars" }),
    ]);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.kind).toBe("value_conflict");
    expect(flags[0]?.documentIds).toEqual(["a", "b"]);
  });

  it("flags a stale-vs-fresh split on a shared subject", () => {
    const flags = detectConflicts([
      result({ documentId: "a", text: "the alpha protocol onboarding details", metadata: { freshness: { stale: true } } }),
      result({ documentId: "b", text: "the alpha protocol onboarding details", metadata: { freshness: { stale: false } } }),
    ]);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.kind).toBe("freshness_conflict");
  });

  it("does not flag when docs agree on the figure but one has an extra incidental number", () => {
    expect(
      detectConflicts([
        result({ documentId: "a", text: "the alpha protocol budget is 500 dollars" }),
        result({ documentId: "b", text: "the alpha protocol budget is 500 dollars version 2" }),
      ]),
    ).toHaveLength(0);
  });

  it("normalizes numbers so 500 and 500.0 are not a conflict", () => {
    expect(
      detectConflicts([
        result({ documentId: "a", text: "the alpha protocol budget is 500 dollars" }),
        result({ documentId: "b", text: "the alpha protocol budget is 500.0 dollars" }),
      ]),
    ).toHaveLength(0);
  });

  it("does not flag the same document or low-overlap results", () => {
    expect(
      detectConflicts([
        result({ documentId: "a", chunkId: "c1", text: "alpha protocol budget 500" }),
        result({ documentId: "a", chunkId: "c2", text: "alpha protocol budget 750" }),
      ]),
    ).toHaveLength(0);
    expect(
      detectConflicts([
        result({ documentId: "a", text: "alpha protocol budget 500" }),
        result({ documentId: "b", text: "unrelated zebra meadow 750" }),
      ]),
    ).toHaveLength(0);
  });
});

// ── Integration: searchRetrieval demotes + flags stale, surfaces conflicts ────
function doc(documentId: string, updatedAt: string): RetrievalDocument {
  return {
    documentId,
    namespace: "system_docs",
    title: documentId,
    sourceType: "text",
    hash: `hash-${documentId}`,
    createdAt: updatedAt,
    updatedAt,
  };
}

function chunk(documentId: string, text: string): RetrievalChunk {
  return {
    chunkId: `c-${documentId}`,
    documentId,
    namespace: "system_docs",
    text,
    tokenCount: text.split(" ").length,
    metadata: {},
  };
}

describe("searchRetrieval — memory integrity", () => {
  it("ranks a fresh doc above an equally-relevant stale doc and flags the stale one", async () => {
    saveDocument(doc("d-fresh", NOW_ISO));
    saveDocument(doc("d-stale", daysAgoIso(400)));
    // Seed the STALE chunk first: Array.sort is stable, so a decay-less impl
    // would leave it at index 0 — making the rank assertion below load-bearing.
    saveChunks([
      chunk("d-stale", "the alpha protocol details"),
      chunk("d-fresh", "the alpha protocol details"),
    ]);

    const res = await searchRetrieval(
      { query: "alpha protocol", namespaces: ["system_docs"], maxResults: 10, environment: "development" },
      { now: () => NOW_ISO },
    );

    expect(res.ok).toBe(true);
    expect(res.results[0]?.documentId).toBe("d-fresh");
    expect(res.results[0]!.score).toBeGreaterThan(res.results[1]!.score);
    expect(res.policyMeta.staleDocumentIds).toContain("d-stale");
    expect(res.policyMeta.staleDocumentIds).not.toContain("d-fresh");
    // every result carries a freshness signal (the staleDocumentIds contract is filled)
    for (const r of res.results) {
      expect((r.metadata as { freshness?: unknown }).freshness).toBeDefined();
    }
  });

  it("surfaces a value conflict between two fresh docs", async () => {
    saveDocument(doc("d-a", NOW_ISO));
    saveDocument(doc("d-b", NOW_ISO));
    saveChunks([
      chunk("d-a", "the alpha protocol budget is 500 dollars"),
      chunk("d-b", "the alpha protocol budget is 750 dollars"),
    ]);

    const res = await searchRetrieval(
      { query: "alpha protocol budget", namespaces: ["system_docs"], maxResults: 10, environment: "development" },
      { now: () => NOW_ISO },
    );

    expect(res.conflicts?.some((c) => c.kind === "value_conflict")).toBe(true);
  });
});
