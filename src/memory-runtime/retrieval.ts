import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CognitiveMemoryStore } from "./store.js";
import type { MemoryRecord } from "./types.js";
import {
  RETRIEVAL_PRIORITY,
  defaultRetrievalPolicy,
  type RetrievalPolicyMap,
  type RetrievalSlot,
} from "./retrieval-policy.js";

// ── Structured retrieval context ───────────────────────────────────

/** The resolved, prompt-ready memory bundle returned by retrieve(). */
export interface RetrievedContext {
  workingContext: string;
  lastRun: MemoryRecord | null;
  lastFailure: MemoryRecord | null;
  recentLogs: Array<{ file: string; content: string }>;
  /** Character counts per slot for diagnostics. */
  charCounts: Record<RetrievalSlot, number>;
  /** Total characters injected. */
  totalChars: number;
}

// ── Main retrieval function ────────────────────────────────────────

/**
 * Retrieve memory from the store according to the policy.
 *
 * Walks slots in priority order (working_context → last_run →
 * last_failure → recent_logs), respects per-slot budgets, and
 * returns a structured context object ready for prompt injection.
 */
export async function retrieve(
  store: CognitiveMemoryStore,
  workflow: string,
  policyOverride?: RetrievalPolicyMap,
): Promise<RetrievedContext> {
  const policy = policyOverride ?? defaultRetrievalPolicy(store.config);

  const result: RetrievedContext = {
    workingContext: "",
    lastRun: null,
    lastFailure: null,
    recentLogs: [],
    charCounts: {
      working_context: 0,
      last_run: 0,
      last_failure: 0,
      recent_logs: 0,
    },
    totalChars: 0,
  };

  for (const slot of RETRIEVAL_PRIORITY) {
    const budget = policy[slot];
    if (!budget.enabled) continue;

    switch (slot) {
      case "working_context": {
        const raw = await store.getWorkingContext();
        result.workingContext = truncate(raw, budget.maxChars);
        result.charCounts.working_context = result.workingContext.length;
        break;
      }

      case "last_run": {
        const record = await getLastRunLog(store, false);
        if (record) {
          record.content = truncate(record.content, budget.maxChars);
          result.lastRun = record;
          result.charCounts.last_run = record.content.length;
        }
        break;
      }

      case "last_failure": {
        const record = await getLastRunLog(store, true);
        if (record) {
          record.content = truncate(record.content, budget.maxChars);
          result.lastFailure = record;
          result.charCounts.last_failure = record.content.length;
        }
        break;
      }

      case "recent_logs": {
        const logs = await store.getRecentLogs();
        let remaining = budget.maxChars;
        for (const log of logs) {
          if (remaining <= 0) break;
          const trimmed = truncate(log.content, remaining);
          result.recentLogs.push({ file: log.file, content: trimmed });
          remaining -= trimmed.length;
        }
        result.charCounts.recent_logs = budget.maxChars - remaining;
        break;
      }
    }
  }

  result.totalChars = Object.values(result.charCounts).reduce((a, b) => a + b, 0);
  return result;
}

// ── Run-log reader ─────────────────────────────────────────────────

/**
 * Read the most recent run-log JSON from disk.
 *
 * @param failureOnly  If true, only return logs tagged "failure".
 */
async function getLastRunLog(
  store: CognitiveMemoryStore,
  failureOnly: boolean,
): Promise<MemoryRecord | null> {
  const logsDir = path.join(store.config.cognitiveRoot, "run-logs");

  let files: string[];
  try {
    files = (await readdir(logsDir))
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse(); // newest first by UUID filename (works when timestamps are embedded)
  } catch {
    return null;
  }

  // Walk files newest-first and return the first match
  for (const name of files) {
    try {
      const raw = await readFile(path.join(logsDir, name), "utf-8");
      const record = JSON.parse(raw) as MemoryRecord;

      if (failureOnly && !record.tags.includes("failure")) continue;
      if (!failureOnly && record.tags.includes("failure")) continue;

      return record;
    } catch {
      continue;
    }
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  return text.length <= max ? text : text.slice(0, max) + "\n…[truncated]";
}
