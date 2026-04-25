/**
 * Operating Core — Run State Machine v1
 *
 * Pure functions over RunState. No I/O. Sub-systems persist their own
 * stores; this module enforces transition validity only.
 */

import {
  TERMINAL_STATES,
  VALID_RUN_STATE_TRANSITIONS,
  type RunState,
  type StateValidationResult,
} from "./run-state-types.js";

export function isTerminalState(state: RunState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function getAllowedTransitions(state: RunState): RunState[] {
  return [...(VALID_RUN_STATE_TRANSITIONS[state] ?? [])];
}

/**
 * Validates a transition. When `force=true`, transitions out of terminal
 * states are allowed (used by `rerun`-style admin actions).
 */
export function validateStateTransition(
  from: RunState,
  to: RunState,
  force = false,
): StateValidationResult {
  if (from === to) {
    return { valid: false, reason: `No-op transition from '${from}' to '${to}'` };
  }

  if (isTerminalState(from)) {
    if (force) {
      // Forced transition out of terminal state must land in queued.
      if (to !== "queued") {
        return {
          valid: false,
          reason: `Forced transition from terminal '${from}' must target 'queued', not '${to}'`,
        };
      }
      return { valid: true };
    }
    return { valid: false, reason: `Cannot transition out of terminal state '${from}'` };
  }

  const allowed = VALID_RUN_STATE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      valid: false,
      reason: `Invalid transition '${from}' → '${to}' (allowed: ${allowed.join(", ") || "none"})`,
    };
  }

  return { valid: true };
}

/**
 * Apply a transition. Throws when invalid.
 */
export function transitionRunState(current: RunState, target: RunState, force = false): RunState {
  const result = validateStateTransition(current, target, force);
  if (!result.valid) {
    throw new Error(`State transition rejected: ${result.reason ?? "invalid"}`);
  }
  return target;
}

/**
 * Aggregate multiple run states into a single roll-up state for dashboards.
 *
 * Priority: failed > escalated > waiting_for_approval > retrying > running >
 *           planning > queued > completed > cancelled.
 *
 * Rationale: errors and human intervention surface first; "completed" only
 * wins if every run succeeded; "cancelled" is the lowest-priority terminal.
 */
export function deriveRunStatus(states: ReadonlyArray<RunState>): RunState {
  if (states.length === 0) return "queued";

  const priority: RunState[] = [
    "failed",
    "escalated",
    "waiting_for_approval",
    "retrying",
    "running",
    "planning",
    "queued",
  ];

  for (const candidate of priority) {
    if (states.includes(candidate)) return candidate;
  }

  if (states.every((s) => s === "completed")) return "completed";
  if (states.every((s) => s === "cancelled")) return "cancelled";
  return "completed";
}
