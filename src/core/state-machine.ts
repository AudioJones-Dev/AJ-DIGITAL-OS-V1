import { RUN_STATE_TRANSITIONS } from "./constants.js";
import { StateTransitionError } from "./errors.js";
import type { RunStatus } from "../types/run.types.js";

/**
 * Returns the allowed next states for a run.
 */
export const getAllowedTransitions = (status: RunStatus): RunStatus[] =>
  RUN_STATE_TRANSITIONS[status];

/**
 * Checks whether a state transition is permitted.
 */
export const canTransition = (from: RunStatus, to: RunStatus): boolean =>
  RUN_STATE_TRANSITIONS[from].includes(to);

/**
 * Throws when a run attempts an invalid lifecycle transition.
 */
export const assertValidTransition = (from: RunStatus, to: RunStatus): void => {
  if (!canTransition(from, to)) {
    throw new StateTransitionError(`Invalid run transition from "${from}" to "${to}".`);
  }
};
