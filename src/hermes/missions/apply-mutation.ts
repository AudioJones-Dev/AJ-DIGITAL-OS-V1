/**
 * Apply Mutation — execution-time adaptation from extracted patterns.
 *
 * Before a mission executes, this module:
 *   1. Fetches the strongest matching optimization pattern from Neon
 *   2. Applies minimal, safe mutation to the mission envelope
 *   3. Returns a config snapshot capturing base + mutation for audit
 *
 * Safety:
 *   • Never throws — all errors caught, mission proceeds unmodified
 *   • No persistent client config changes
 *   • Mutation is execution-time only (advisory metadata in input)
 *   • If no pattern found or fetch fails → no-op
 */

import type { MissionEnvelope } from "../../missions/mission-entry-types.js";
import type { DbPattern } from "../../db/db-types.js";
import { getPatterns, type NeonConfig } from "../../db/neon-client.js";

const TAG = "[MUTATION]";
const MIN_CONFIDENCE = 0.7;

// ── Types ──────────────────────────────────────────────────────────

export interface MutationResult {
  /** Whether a mutation was applied. */
  applied: boolean;
  /** The (possibly mutated) envelope to execute. */
  envelope: MissionEnvelope;
  /** Config snapshot for persistence in mission_runs. */
  configSnapshot: MutationConfigSnapshot;
}

export interface MutationConfigSnapshot {
  /** Original envelope input before mutation. */
  base_input: Record<string, unknown>;
  /** The mutation that was applied, or null if none. */
  mutation: MutationDetail | null;
  /** ISO timestamp of when mutation was evaluated. */
  evaluated_at: string;
}

export interface MutationDetail {
  pattern_id: number;
  pattern_type: string;
  confidence: number;
  description: string;
  mission_type: string;
  applies_to_tier: unknown;
  /** The specific changes injected into the envelope. */
  injected: Record<string, unknown>;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Evaluate and optionally apply a pattern-based mutation to a mission envelope.
 *
 * Always returns a valid MutationResult — never throws.
 */
export async function applyMutation(
  envelope: MissionEnvelope,
  clientTier?: string | null,
  neonConfig?: Partial<NeonConfig>,
): Promise<MutationResult> {
  const baseInput = { ...envelope.input };
  const noMutation: MutationResult = {
    applied: false,
    envelope,
    configSnapshot: {
      base_input: baseInput,
      mutation: null,
      evaluated_at: new Date().toISOString(),
    },
  };

  try {
    // 1. Fetch optimization patterns
    const patternsResult = await getPatterns("optimization", neonConfig);

    if (!patternsResult.ok || !patternsResult.data?.length) {
      console.log(
        `${TAG} skipped — mission_type=${envelope.mission_type}` +
          ` | reason=${!patternsResult.ok ? "fetch_failed" : "no_patterns"}`,
      );
      return noMutation;
    }

    // 2. Select strongest matching pattern
    const match = selectPattern(patternsResult.data, envelope.mission_type, clientTier);

    if (!match) {
      console.log(
        `${TAG} skipped — mission_type=${envelope.mission_type}` +
          ` | tier=${clientTier ?? "unknown"} | reason=no_matching_pattern`,
      );
      return noMutation;
    }

    // 3. Apply minimal mutation — inject advisory metadata into envelope input
    const mutatedInput: Record<string, unknown> = {
      ...envelope.input,
      _mutation: {
        pattern_id: match.id,
        confidence: match.confidence,
        mission_type: ctx(match).applies_to_mission_type,
        optimisation_hint: match.description,
        avg_quality_score: ctx(match).avg_quality_score,
        avg_duration_ms: ctx(match).avg_duration_ms,
        sample_size: ctx(match).sample_size,
      },
    };

    const mutatedEnvelope: MissionEnvelope = {
      ...envelope,
      input: mutatedInput,
    };

    const detail: MutationDetail = {
      pattern_id: match.id,
      pattern_type: match.pattern_type,
      confidence: match.confidence,
      description: match.description,
      mission_type: String(ctx(match).applies_to_mission_type ?? envelope.mission_type),
      applies_to_tier: ctx(match).applies_to_tier ?? null,
      injected: { _mutation: mutatedInput._mutation },
    };

    console.log(
      `${TAG} applied — mission_type=${envelope.mission_type}` +
        ` | tier=${clientTier ?? "unknown"}` +
        ` | pattern_id=${match.id}` +
        ` | confidence=${match.confidence}`,
    );

    return {
      applied: true,
      envelope: mutatedEnvelope,
      configSnapshot: {
        base_input: baseInput,
        mutation: detail,
        evaluated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.warn(
      `${TAG} skipped — mission_type=${envelope.mission_type}` +
        ` | reason=error | error=${err instanceof Error ? err.message : String(err)}`,
    );
    return noMutation;
  }
}

// ── Pattern Selection ──────────────────────────────────────────────

/**
 * Select the strongest pattern matching the mission type and client tier.
 * Patterns are pre-sorted by confidence DESC from the DB query.
 */
function selectPattern(
  patterns: DbPattern[],
  missionType: string,
  clientTier?: string | null,
): DbPattern | null {
  for (const p of patterns) {
    // Must meet minimum confidence
    if (p.confidence < MIN_CONFIDENCE) continue;

    const c = p.context as Record<string, unknown>;

    // Must match mission type
    if (c.applies_to_mission_type !== missionType) continue;

    // Tier filter: if pattern specifies tiers, client must match (or be unknown)
    const tiers = c.applies_to_tier;
    if (tiers != null && Array.isArray(tiers) && clientTier) {
      if (!tiers.includes(clientTier)) continue;
    }

    return p; // First match is strongest (pre-sorted by confidence)
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Typed access to pattern context. */
function ctx(p: DbPattern): Record<string, unknown> {
  return p.context as Record<string, unknown>;
}
