/**
 * G3 — Memory integrity: conflict detection within a single recall set.
 *
 * Pure, deterministic v1 (no embeddings/NLI). Flags two contradiction signals
 * between DIFFERENT documents that cover the same subject (high term overlap):
 *  - value_conflict:     each asserts a different number for that subject.
 *  - freshness_conflict: one is stale and the other fresh (the stale may be wrong).
 *
 * Conservative by design — it flags, never resolves and never drops. A high
 * shared-term gate keeps false positives low.
 */

import type { ConflictFlag, RetrievalResult } from "./retrieval-types.js";

const MIN_SHARED_TERMS = 3;
const STOPWORDS = new Set([
  "their",
  "about",
  "would",
  "there",
  "these",
  "those",
  "which",
  "where",
  "while",
  "after",
  "before",
  "could",
  "should",
  "other",
  "every",
  "being",
  "shall",
]);

function significantTerms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length > 4 && !STOPWORDS.has(w)),
  );
}

function numbersIn(text: string): Set<string> {
  const matches = text.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? [];
  const out = new Set<string>();
  for (const m of matches) {
    // Normalize so "1,000", "500" and "500.0" compare equal by value.
    const n = Number(m.replace(/,/g, ""));
    if (Number.isFinite(n)) out.add(String(n));
  }
  return out;
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

function isStale(result: RetrievalResult): boolean {
  const freshness = result.metadata?.["freshness"] as { stale?: boolean } | undefined;
  return freshness?.stale === true;
}

function hasNumericDisagreement(a: Set<string>, b: Set<string>): boolean {
  // Genuine disagreement: EACH side asserts a number the other lacks. This is
  // NOT triggered when one side merely carries an extra incidental number
  // (year/version/index) the other omits — both still agree on the shared value.
  if (a.size === 0 || b.size === 0) return false;
  let aHasUnique = false;
  let bHasUnique = false;
  for (const n of a) if (!b.has(n)) aHasUnique = true;
  for (const n of b) if (!a.has(n)) bHasUnique = true;
  return aHasUnique && bHasUnique;
}

export function detectConflicts(results: RetrievalResult[]): ConflictFlag[] {
  const flags: ConflictFlag[] = [];
  const terms = results.map((r) => significantTerms(r.text));
  const nums = results.map((r) => numbersIn(r.text));

  for (let i = 0; i < results.length; i += 1) {
    for (let j = i + 1; j < results.length; j += 1) {
      const ri = results[i]!;
      const rj = results[j]!;
      if (ri.documentId === rj.documentId) continue; // same doc is not a conflict

      const shared = sharedCount(terms[i]!, terms[j]!);
      if (shared < MIN_SHARED_TERMS) continue;

      if (hasNumericDisagreement(nums[i]!, nums[j]!)) {
        flags.push({
          kind: "value_conflict",
          documentIds: [ri.documentId, rj.documentId],
          chunkIds: [ri.chunkId, rj.chunkId],
          detail: `numeric disagreement on a shared subject (${shared} shared terms)`,
        });
        continue;
      }

      if (isStale(ri) !== isStale(rj)) {
        flags.push({
          kind: "freshness_conflict",
          documentIds: [ri.documentId, rj.documentId],
          chunkIds: [ri.chunkId, rj.chunkId],
          detail: `stale and fresh results cover the same subject (${shared} shared terms)`,
        });
      }
    }
  }

  return flags;
}
