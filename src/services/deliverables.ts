/**
 * Deliverable Outcome Service
 *
 * Patches the Supabase `deliverables` table with outcome signals and timestamps.
 * Also provides inference logic to map local deliverable statuses to outcomes.
 *
 * Outcome values (CHECK constraint in 003-moat-signals.sql):
 *   used     — content was published and consumed
 *   modified — content was edited before use
 *   rejected — content was explicitly rejected
 *   ignored  — no action after threshold (requires scheduled sweep)
 *   unknown  — default / not yet determined
 */

import type { DeliverableStatus as LocalDeliverableStatus } from "../types/deliverable.types.js";
import type { QueryResult } from "../db/db-types.js";
import {
  isConfigured,
  resolveConfig,
  supabasePatch,
  type SupabaseConfig,
} from "../db/supabase-client.js";
import { scoreFromOutcome } from "./scoring.js";

const TAG = "[DELIVERABLE]";

// ── Types ──────────────────────────────────────────────────────────

export type DeliverableOutcome = "used" | "modified" | "rejected" | "ignored" | "unknown";

export interface OutcomeUpdateResult {
  ok: boolean;
  deliverableId: string;
  outcome: DeliverableOutcome;
  error: string | null;
}

// ── Outcome Update ─────────────────────────────────────────────────

/**
 * Patch `deliverables.outcome` in Supabase.
 * Sets `published_at` automatically when outcome is `"used"`.
 * When `missionRunRef` is provided, also scores the linked mission_run.
 * Fail-open: returns error result but never throws.
 */
export async function updateDeliverableOutcome(
  id: string,
  outcome: DeliverableOutcome,
  cfg?: SupabaseConfig,
  missionRunRef?: string,
): Promise<OutcomeUpdateResult> {
  const config = cfg ?? resolveConfig();

  if (!isConfigured(config)) {
    console.log(`${TAG} Supabase not configured — skipping outcome update for ${id}`);
    return { ok: false, deliverableId: id, outcome, error: "Supabase not configured" };
  }

  const patch: Record<string, unknown> = { outcome };

  if (outcome === "used") {
    patch.published_at = new Date().toISOString();
  }

  const result: QueryResult<unknown> = await supabasePatch(
    config,
    "deliverables",
    `id=eq.${encodeURIComponent(id)}`,
    patch,
  );

  if (result.ok) {
    console.log(`${TAG} outcome updated: id=${id} outcome=${outcome}`);

    // Auto-score linked mission run when run ref is available
    if (missionRunRef) {
      try {
        await scoreFromOutcome(missionRunRef, outcome, config);
      } catch {
        // Scoring is best-effort — does not block outcome update.
      }
    }
  } else {
    console.warn(`${TAG} outcome update failed: id=${id} outcome=${outcome} error=${result.error}`);
  }

  return {
    ok: result.ok,
    deliverableId: id,
    outcome,
    error: result.ok ? null : (result.error ?? "Unknown error"),
  };
}

// ── Outcome Inference ──────────────────────────────────────────────

/**
 * Infer a deliverable outcome from the local registry status.
 *
 * Rules:
 *   published     → "used"     (content reached terminal publish state)
 *   failed        → "rejected" (content could not be produced or was failed)
 *   archived      → "ignored"  (content was shelved without use)
 *   draft / pending_approval / approved → "unknown" (still in-flight)
 *
 * For "modified" detection, callers should compare original vs. published
 * content (not yet automated — requires diff infrastructure).
 */
export function inferOutcomeFromStatus(status: LocalDeliverableStatus): DeliverableOutcome {
  switch (status) {
    case "published":
      return "used";
    case "failed":
      return "rejected";
    case "archived":
      return "ignored";
    default:
      return "unknown";
  }
}

/**
 * Infer outcome from a Supabase deliverable status.
 *
 * Supabase statuses: pending | uploaded | published | failed
 */
export function inferOutcomeFromDbStatus(
  status: "pending" | "uploaded" | "published" | "failed",
): DeliverableOutcome {
  switch (status) {
    case "published":
      return "used";
    case "failed":
      return "rejected";
    default:
      return "unknown";
  }
}

/**
 * Best-effort outcome update using the local registry status.
 * Patches Supabase only when the inferred outcome is not "unknown".
 */
export async function syncOutcomeFromLocalStatus(
  deliverableId: string,
  localStatus: LocalDeliverableStatus,
  cfg?: SupabaseConfig,
  missionRunRef?: string,
): Promise<OutcomeUpdateResult | null> {
  const outcome = inferOutcomeFromStatus(localStatus);

  if (outcome === "unknown") {
    return null;
  }

  return updateDeliverableOutcome(deliverableId, outcome, cfg, missionRunRef);
}
