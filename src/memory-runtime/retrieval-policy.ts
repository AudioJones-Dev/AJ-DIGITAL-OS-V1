import type { MemoryConfig } from "./types.js";

// ── Retrieval Policy ───────────────────────────────────────────────

/** Priority order for memory retrieval (highest first). */
export const RETRIEVAL_PRIORITY = [
  "working_context",
  "last_run",
  "last_failure",
  "recent_logs",
] as const;

export type RetrievalSlot = (typeof RETRIEVAL_PRIORITY)[number];

/** Per-slot budget controlling how much text is injected. */
export interface SlotBudget {
  maxChars: number;
  enabled: boolean;
}

/** Full retrieval policy — one budget per slot. */
export type RetrievalPolicyMap = Record<RetrievalSlot, SlotBudget>;

/** Default retrieval policy derived from MemoryConfig. */
export function defaultRetrievalPolicy(config: MemoryConfig): RetrievalPolicyMap {
  const perSlot = Math.floor(config.maxPromptContextChars / RETRIEVAL_PRIORITY.length);

  return {
    working_context: { maxChars: perSlot, enabled: true },
    last_run:        { maxChars: perSlot, enabled: true },
    last_failure:    { maxChars: perSlot, enabled: true },
    recent_logs:     { maxChars: perSlot, enabled: true },
  };
}

/** Compute total character budget across all enabled slots. */
export function totalBudget(policy: RetrievalPolicyMap): number {
  return RETRIEVAL_PRIORITY.reduce(
    (sum, slot) => sum + (policy[slot].enabled ? policy[slot].maxChars : 0),
    0,
  );
}
