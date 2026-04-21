/**
 * Hermes Repair Engine — automatic failure repair pipeline.
 *
 * Flow:
 *   1. Classify the failure (rule-based)
 *   2. Map classification → repair strategy
 *   3. Execute the strategy (retry / backoff / escalate)
 *   4. Log every attempt as a repair_event in Neon
 *   5. Send Telegram notifications at each stage
 *
 * Strategy map:
 *   transient      → retry immediately (max 2)
 *   network        → retry with backoff (max 3, 2s/4s/8s)
 *   dependency     → retry with backoff (max 3, 2s/4s/8s)
 *   data_schema    → retry targeted path (max 1)
 *   auth_config    → no auto-retry, alert immediately
 *   unknown        → one retry, then escalate
 */

import type { FailureClassification, RepairStrategy, RepairResult, InsertRepairEvent } from "../db/db-types.js";
import type { FailureAlert } from "./hermes-types.js";
import { classifyFailureDetailed } from "./hermes-failure-classifier.js";
import { insertRepairEvent, updateRepairEvent } from "../db/neon-client.js";
import { notifyAll } from "./hermes-notifications.js";
import { retryMission } from "./hermes-bridge.js";
import { getMissionById } from "../db/supabase-client.js";
import type { SupabaseConfig } from "../db/supabase-client.js";
import type { MissionTypeName } from "../missions/mission-entry-types.js";
import type { ProductionMissionConfig } from "../missions/mission-db-hooks.js";

const TAG = "[HERMES-REPAIR]";

// ── Strategy Mapping ───────────────────────────────────────────────

interface StrategyConfig {
  strategy: RepairStrategy;
  maxRetries: number;
  backoffBaseMs: number;
}

const STRATEGY_MAP: Record<FailureClassification, StrategyConfig> = {
  transient:    { strategy: "retry_immediate",      maxRetries: 2, backoffBaseMs: 0 },
  network:      { strategy: "retry_backoff",         maxRetries: 3, backoffBaseMs: 2000 },
  dependency:   { strategy: "retry_backoff",         maxRetries: 3, backoffBaseMs: 2000 },
  data_schema:  { strategy: "retry_targeted",        maxRetries: 1, backoffBaseMs: 0 },
  auth_config:  { strategy: "alert_only",            maxRetries: 0, backoffBaseMs: 0 },
  unknown:      { strategy: "retry_then_escalate",   maxRetries: 1, backoffBaseMs: 1000 },
};

export function getStrategyForClassification(c: FailureClassification): StrategyConfig {
  return STRATEGY_MAP[c];
}

// ── In-memory repair state ─────────────────────────────────────────

export interface RepairEvent {
  id: number | null;
  failureId: number | null;
  runId: number | null;
  runRef: string;
  classification: FailureClassification;
  strategy: RepairStrategy;
  retryCount: number;
  maxRetries: number;
  result: RepairResult;
  escalated: boolean;
  errorMessage: string | null;
  timestamp: string;
}

const recentRepairs: RepairEvent[] = [];
const MAX_RECENT = 50;

export function getRecentRepairs(): readonly RepairEvent[] {
  return recentRepairs;
}

// ── Core Repair Pipeline ───────────────────────────────────────────

export interface RepairConfig {
  supabase?: Partial<SupabaseConfig>;
  missionConfig?: ProductionMissionConfig;
}

/**
 * Run the full repair pipeline for a failure alert.
 * Returns the final repair event.
 */
export async function repairFailure(
  alert: FailureAlert,
  errorText: string,
  config?: RepairConfig,
): Promise<RepairEvent> {
  // 1. Classify
  const { classification, matchedPattern } = classifyFailureDetailed(errorText);
  const strategyConfig = getStrategyForClassification(classification);

  console.log(`${TAG} Classified "${alert.run_ref}": ${classification} (pattern: ${matchedPattern ?? "none"}) → ${strategyConfig.strategy}`);

  // 2. Create initial repair event in Neon
  const insertPayload: InsertRepairEvent = {
    failure_id: null,
    run_id: null,
    run_ref: alert.run_ref,
    classification,
    strategy: strategyConfig.strategy,
    retry_count: 0,
    max_retries: strategyConfig.maxRetries,
    result: "pending",
    escalated: false,
    error_message: errorText,
    metadata: {
      matched_pattern: matchedPattern,
      mission_id: alert.mission_id,
      detected_at: alert.detected_at,
    },
  };

  const inserted = await insertRepairEvent(insertPayload);
  const eventId = inserted.data?.id ?? null;

  // 3. Notify: repair attempted
  notifyAll(
    "warning",
    "Repair Attempted",
    `[${classification}] ${alert.run_ref} — strategy: ${strategyConfig.strategy}`,
    {
      run_ref: alert.run_ref,
      classification,
      strategy: strategyConfig.strategy,
      max_retries: strategyConfig.maxRetries,
    },
  );

  // 4. Handle alert-only (auth_config) — no retry
  if (strategyConfig.strategy === "alert_only") {
    console.log(`${TAG} auth_config — no auto-retry, escalating immediately`);
    const result = await finalizeRepair(eventId, {
      result: "escalated",
      retryCount: 0,
      escalated: true,
      errorMessage: errorText,
    });

    notifyAll(
      "critical",
      "Repair Escalated",
      `[auth_config] ${alert.run_ref} — requires manual intervention`,
      { run_ref: alert.run_ref, classification, reason: "no auto-retry for auth/config failures" },
    );

    return result;
  }

  // 5. Retry loop
  let lastError = errorText;
  for (let attempt = 1; attempt <= strategyConfig.maxRetries; attempt++) {
    // Backoff delay
    if (strategyConfig.backoffBaseMs > 0 && attempt > 1) {
      const delayMs = strategyConfig.backoffBaseMs * Math.pow(2, attempt - 2);
      console.log(`${TAG} Backoff: waiting ${delayMs}ms before retry #${attempt}`);
      await delay(delayMs);
    }

    console.log(`${TAG} Retry ${attempt}/${strategyConfig.maxRetries} for ${alert.run_ref}`);

    try {
      const missionResult = await getMissionById(alert.mission_id, config?.supabase);
      if (!missionResult.ok || !missionResult.data) {
        lastError = `Cannot load mission ${alert.mission_id}: ${missionResult.error ?? "not found"}`;
        console.warn(`${TAG} ${lastError}`);
        continue;
      }

      const mission = missionResult.data;
      const retryResult = await retryMission(
        {
          mission_type: mission.mission_type as MissionTypeName,
          objective: mission.objective,
          input: mission.input_payload ?? {},
          priority: (mission.priority as "low" | "normal" | "high" | "critical") ?? "normal",
          requested_by: `hermes:repair:${classification}:${alert.run_ref}`,
        },
        alert.run_ref,
        config?.missionConfig,
      );

      if (retryResult.ok) {
        console.log(`${TAG} Repair succeeded on attempt ${attempt}`);
        const result = await finalizeRepair(eventId, {
          result: "success",
          retryCount: attempt,
          escalated: false,
          errorMessage: null,
        });

        notifyAll(
          "info",
          "Repair Succeeded",
          `[${classification}] ${alert.run_ref} — resolved on retry ${attempt}/${strategyConfig.maxRetries}`,
          { run_ref: alert.run_ref, classification, retry_count: attempt },
        );

        return result;
      }

      lastError = retryResult.summary ?? retryResult.failure_ref ?? "retry failed";
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`${TAG} Retry ${attempt} error: ${lastError}`);
    }
  }

  // 6. All retries exhausted — escalate
  console.log(`${TAG} All retries exhausted for ${alert.run_ref} — escalating`);
  const result = await finalizeRepair(eventId, {
    result: "escalated",
    retryCount: strategyConfig.maxRetries,
    escalated: true,
    errorMessage: lastError,
  });

  notifyAll(
    "critical",
    "Repair Escalated",
    `[${classification}] ${alert.run_ref} — ${strategyConfig.maxRetries} retries exhausted`,
    { run_ref: alert.run_ref, classification, retry_count: strategyConfig.maxRetries, last_error: lastError },
  );

  return result;
}

// ── Helpers ────────────────────────────────────────────────────────

async function finalizeRepair(
  eventId: number | null,
  update: { result: RepairResult; retryCount: number; escalated: boolean; errorMessage: string | null },
): Promise<RepairEvent> {
  const now = new Date().toISOString();

  if (eventId != null) {
    await updateRepairEvent(eventId, {
      result: update.result,
      retry_count: update.retryCount,
      escalated: update.escalated,
      error_message: update.errorMessage,
      resolved_at: update.result !== "pending" ? now : undefined,
    });
  }

  const event: RepairEvent = {
    id: eventId,
    failureId: null,
    runId: null,
    runRef: "",
    classification: "unknown",
    strategy: "retry_then_escalate",
    retryCount: update.retryCount,
    maxRetries: 0,
    result: update.result,
    escalated: update.escalated,
    errorMessage: update.errorMessage,
    timestamp: now,
  };

  recentRepairs.push(event);
  if (recentRepairs.length > MAX_RECENT) {
    recentRepairs.shift();
  }

  return event;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
